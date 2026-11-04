// Bounded, real-runner fault injection. No fake HTTP responses, ACKs or resources.
// --import this file in a private scale smoke run; the runner and its fork inherit it.
import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import http from 'node:http';
import {createRequire, syncBuiltinESMExports} from 'node:module';

const trace = process.env.DETUNED_SCALE_SIGNAL_TRACE;
if (!trace || !path.isAbsolute(trace)) throw Error('Absolute private signal trace required');
const entry = path.basename(process.argv[1] ?? '');
const record = value => fs.appendFileSync(trace, JSON.stringify({pid: process.pid, at_ms: Date.now(), ...value}) + '\n', {mode: 0o600});

if (entry === 'run-server.mjs') {
  const emit = http.Server.prototype.emit;
  http.Server.prototype.emit = function(event, ...args) {
    if (event === 'request') {
      const [request, response] = args;
      const endpoint = new URL(request.url, 'http://localhost').pathname;
      if (request.method === 'POST' && /\/consumers\/[^/]+\/ack$/.test(endpoint)) {
        record({event: 'ack_received', endpoint});
        response.once('finish', () => record({event: 'ack_finished', endpoint, status: response.statusCode}));
      }
    }
    return Reflect.apply(emit, this, [event, ...args]);
  };
} else if (entry === 'run.mjs') {
  const runtimeIndex = process.argv.indexOf('--runtime');
  if (runtimeIndex < 0) throw Error('Scale runtime argument required');
  const runtime = JSON.parse(fs.readFileSync(process.argv[runtimeIndex + 1], 'utf8'));
  const require = createRequire(new URL('../../../package.json', import.meta.url));
  const Database = require('better-sqlite3');
  const snapshot = () => {
    const db = new Database(runtime.db_path, {readonly: true, fileMustExist: true});
    try { return db.prepare('SELECT id,ack_seq,active_batch_id FROM consumers ORDER BY id').all(); }
    finally { db.close(); }
  };
  let highwater = false, injected = false;
  const fork = childProcess.fork;
  childProcess.fork = function(...args) {
    const child = Reflect.apply(fork, this, args);
    child.on('message', message => {
      if (message?.type === 'highwater' && Number.isSafeInteger(message.seq)) {
        highwater = true;
        record({event: 'highwater_observed', seq: message.seq, server_pid: child.pid});
      }
    });
    return child;
  };
  syncBuiltinESMExports();
  const fetch = globalThis.fetch;
  globalThis.fetch = async function(input, init) {
    const endpoint = new URL(typeof input === 'string' || input instanceof URL ? input : input.url).pathname;
    const ack = /\/consumers\/[^/]+\/ack$/.test(endpoint);
    if (ack && injected) record({event: 'ack_fetch_after_signal', endpoint, already_aborted: init?.signal?.aborted === true});
    const response = await fetch(input, init);
    const text = response.text.bind(response);
    response.text = async () => {
      const body = await text();
      if (highwater && !injected && /\/consumers\/[^/]+\/poll$/.test(endpoint)) {
        // This is the first real catchup poll body, not a fabricated completion.
        const envelope = JSON.parse(body);
        if (!response.ok || !envelope.data?.batch_id) throw Error('Signal injection needs a real nonempty catchup batch');
        injected = true;
        record({event: 'poll_body_complete', endpoint, status: response.status, batch_id: envelope.data.batch_id, consumers: snapshot()});
        await new Promise(resolve => {
          // The runner registered its own handler before reaching catchup. Waiting
          // for actual delivery prevents a timer race with its poll->ACK continuation.
          process.once('SIGTERM', () => {record({event: 'signal_delivered'}); resolve();});
          record({event: 'signal_sent', signal: 'SIGTERM'});
          process.kill(process.pid, 'SIGTERM');
        });
      }
      return body;
    };
    return response;
  };
  process.once('exit', code => record({event: 'runner_exit', code, injected, consumers: snapshot()}));
} else {
  throw Error('Signal preload only supports the real scale runner and its server');
}
