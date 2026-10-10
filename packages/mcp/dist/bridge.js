import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { serializeMessage } from '@modelcontextprotocol/sdk/shared/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { bridgeSuccess, bridgeFailure, unknownTool } from './bridge-results.js';
import { getMcpTools, resolveMcpInputMode, validateMcpToolArguments } from './tool-validation.js';
import { createSessionBinding } from './session-binding.js';
export class BridgeShutdownError extends Error {
    constructor() { super('MCP bridge shutdown could not be confirmed.'); this.name = 'BridgeShutdownError'; }
}
/** Importing this module does not connect streams, read credentials or make HTTP requests. */
export function createMcpBridge(options) {
    const inputMode = resolveMcpInputMode(options.inputMode);
    const timeoutMs = options.shutdownTimeoutMs ?? 10000;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 120000)
        throw new BridgeShutdownError();
    const input = options.input ?? process.stdin;
    const output = options.output ?? process.stdout;
    const calls = new Map();
    const sends = new Set();
    const writes = new Set();
    const binding = options.sessionBinding ? createSessionBinding(options.sessionBinding) : undefined;
    let closing = false, started = false, failed = false, terminal = false;
    let closePromise;
    let resolveClosed, rejectClosed;
    const closed = new Promise((resolve, reject) => { resolveClosed = resolve; rejectClosed = reject; });
    void closed.catch(() => { });
    const server = new Server({ name: 'detuned', version: '0.1.0' }, { capabilities: { tools: {} } });
    class TrackedTransport extends StdioServerTransport {
        send(message) {
            const pending = new Promise((resolve, reject) => {
                let settled = false;
                const finish = (error = false) => {
                    if (settled)
                        return;
                    settled = true;
                    writes.delete(finish);
                    if (terminal && writes.size === 0)
                        detachOutput();
                    if (error)
                        reject(new BridgeShutdownError());
                    else
                        resolve();
                };
                writes.add(finish);
                try {
                    output.write(serializeMessage(message), error => {
                        // Shared output listeners observe the error emitted after a failed callback.
                        // Noncooperative streams remain unconfirmed until the close deadline.
                        if (!error)
                            finish();
                    });
                }
                catch {
                    finish(true);
                }
            });
            sends.add(pending);
            void pending.then(() => sends.delete(pending), () => { sends.delete(pending); failed = true; void close().catch(() => { }); });
            return pending;
        }
    }
    const transport = new TrackedTransport(input, output);
    function detachOutput() { output.off('error', fault); output.off('close', fault); }
    const fault = () => {
        failed = true;
        for (const finish of [...writes])
            finish(true);
        void close().catch(() => { });
    };
    const eof = () => { void close().catch(() => { }); };
    server.onerror = fault;
    server.onclose = eof;
    server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: closing ? [] : getMcpTools(inputMode) }));
    server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
        if (closing)
            return bridgeFailure(unknownTool());
        const name = request.params.name;
        let args;
        try {
            args = validateMcpToolArguments(name, request.params.arguments ?? {}, inputMode);
        }
        catch (error) {
            return bridgeFailure(error);
        }
        const controller = new AbortController();
        const abort = () => controller.abort();
        extra.signal.addEventListener('abort', abort, { once: true });
        if (extra.signal.aborted)
            abort();
        let finish;
        const finished = new Promise(resolve => finish = resolve);
        calls.set(controller, finished);
        try {
            await binding?.prepare(args.space_id, controller.signal);
            if (closing || controller.signal.aborted)
                throw new Error('Operation cancelled.');
            return bridgeSuccess(await options.client.callTool(name, args, { signal: controller.signal }));
        }
        catch (error) {
            return bridgeFailure(error);
        }
        finally {
            extra.signal.removeEventListener('abort', abort);
            calls.delete(controller);
            finish();
        }
    });
    function close() {
        if (closePromise)
            return closePromise;
        closing = true;
        binding?.beginClosing();
        for (const controller of calls.keys())
            controller.abort();
        let timer;
        const deadline = new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new BridgeShutdownError()), timeoutMs); });
        const cleanup = async () => {
            // Stop SDK dispatch and abort its controllers before a handler can schedule another reply.
            await server.close();
            await Promise.all([...calls.values()]);
            await binding?.waitForIdle();
            await Promise.all([...sends]);
            if (failed)
                throw new BridgeShutdownError();
        };
        // Publish the shared promise before SDK onclose can reenter close.
        closePromise = Promise.race([Promise.resolve().then(cleanup), deadline]).finally(() => {
            clearTimeout(timer);
            terminal = true;
            input.off('end', eof);
            input.off('close', eof);
            input.off('error', fault);
            // A timed-out write still owns one shared error/close observer until its real
            // callback or terminal event arrives. Failure is not a claim of clean resources.
            if (writes.size === 0)
                detachOutput();
        }).then(() => { resolveClosed(); }, () => { const error = new BridgeShutdownError(); rejectClosed(error); throw error; });
        void closePromise.catch(() => { });
        return closePromise;
    }
    async function start() {
        if (started || closing)
            throw new BridgeShutdownError();
        started = true;
        input.on('end', eof);
        input.on('close', eof);
        input.on('error', fault);
        output.on('error', fault);
        output.on('close', fault);
        try {
            await server.connect(transport);
            if (input.readableEnded)
                eof();
        }
        catch {
            failed = true;
            await close();
        }
    }
    return { server, start, close, closed };
}
//# sourceMappingURL=bridge.js.map