/** Bounded best-effort NDJSON; never destroys the process-owned output stream. */
export function createRequestLogWriter(stream) {
    let blocked = false, closed = false, pendingBytes = 0, dropped = 0;
    const queue = [];
    const drop = () => { dropped = Math.min(Number.MAX_SAFE_INTEGER, dropped + 1); };
    const send = (line) => { try {
        blocked = !stream.write(line);
    }
    catch {
        close();
    } };
    const flush = () => { blocked = false; while (!closed && !blocked && queue.length) {
        const line = queue.shift();
        pendingBytes -= Buffer.byteLength(line);
        send(line);
    } if (!closed && !blocked && dropped) {
        const count = dropped;
        dropped = 0;
        send(JSON.stringify({ event: 'request_log_dropped', count }) + '\n');
    } };
    const close = () => { if (closed)
        return; closed = true; queue.length = 0; pendingBytes = 0; stream.removeListener('drain', flush); stream.removeListener('error', close); stream.removeListener('close', close); };
    stream.on('drain', flush);
    stream.on('error', close);
    stream.on('close', close);
    const write = (entry) => { if (closed)
        return; let line; try {
        line = JSON.stringify(entry) + '\n';
    }
    catch {
        drop();
        return;
    } const bytes = Buffer.byteLength(line); if (bytes > 1024) {
        drop();
        return;
    } if (blocked || queue.length) {
        if (queue.length >= 256 || pendingBytes + bytes > 65536) {
            drop();
            return;
        }
        queue.push(line);
        pendingBytes += bytes;
    }
    else {
        if (dropped) {
            const count = dropped;
            dropped = 0;
            send(JSON.stringify({ event: 'request_log_dropped', count }) + '\n');
        }
        if (blocked) {
            queue.push(line);
            pendingBytes += bytes;
        }
        else
            send(line);
    } };
    return { write, close, get pendingBytes() { return pendingBytes; }, get pendingEntries() { return queue.length; } };
}
//# sourceMappingURL=request-log-writer.js.map