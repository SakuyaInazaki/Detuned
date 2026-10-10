#!/usr/bin/env node
import fs from 'node:fs';
import https from 'node:https';
import tls from 'node:tls';
import {isIP} from 'node:net';

// Anonymous readiness only. No credentials, arbitrary external URLs or TLS bypass.
async function main() {
  const args = process.argv.slice(2);
  const values = new Map();
  for (let i = 0; i < args.length; i += 2) {
    if (!['--url', '--hostname', '--ca', '--web-origin'].includes(args[i]) || values.has(args[i]) || args[i + 1] === undefined) throw new Error('options');
    values.set(args[i], args[i + 1]);
  }
  const url = new URL(values.get('--url') ?? 'https://127.0.0.1:3000');
  const origin = values.has('--web-origin') ? new URL(values.get('--web-origin')) : undefined;
  if (origin && (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/' || origin.origin !== values.get('--web-origin'))) throw new Error('options');
  const hostname = origin ? origin.hostname.replace(/^\[|\]$/g, '') : values.get('--hostname');
  if (origin && values.has('--hostname') && values.get('--hostname') !== hostname) throw new Error('options');
  if (url.protocol !== 'https:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash || url.pathname !== '/' || !hostname || !/^[a-zA-Z0-9.:-]+$/.test(hostname)) throw new Error('options');
  const ca = values.has('--ca') ? fs.readFileSync(values.get('--ca')) : undefined;
  await new Promise((resolve, reject) => {
    const request = https.get(new URL('/api/v1/health/ready', url), {
      ca, rejectUnauthorized: true, servername: isIP(hostname) ? '' : hostname,
      headers: origin ? {Host:origin.host} : undefined,
      checkServerIdentity: (_name, cert) => tls.checkServerIdentity(hostname, cert),
      timeout: 3000,
    }, response => {
      const chunks = []; let bytes = 0;
      response.on('data', chunk => { bytes += chunk.length; if (bytes > 16384) request.destroy(new Error('limit')); else chunks.push(chunk); });
      response.on('error', reject);
      response.on('end', () => {
        try {
          const result = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(Buffer.concat(chunks)));
          if (response.statusCode !== 200 || result?.data?.status !== 'ready') throw new Error('not ready');
          resolve();
        } catch { reject(new Error('not ready')); }
      });
    });
    const deadline = setTimeout(() => request.destroy(new Error('deadline')), 3000);
    request.once('close', () => clearTimeout(deadline));
    request.on('timeout', () => request.destroy(new Error('timeout')));
    request.on('error', reject);
  });
  process.stdout.write('ready\n');
}
main().catch(() => { process.stderr.write('Detuned HTTPS readiness check failed.\n'); process.exitCode = 1; });
