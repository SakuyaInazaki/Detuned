// Independent raw HTTP helpers. No product tests execute on import.
import http from 'node:http';
import assert from 'node:assert/strict';
export const boundary = 'DetunedIndependentM21Boundary';
export function filePart(bytes, mime = 'application/octet-stream; probe=yes', filename = '../independent.bin') {
  return Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`), Buffer.from(bytes), Buffer.from('\r\n')]);
}
export function metadataPart(text) {
  return Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n${text}\r\n`);
}
export const end = Buffer.from(`--${boundary}--\r\n`);
export function rawUpload({ url, token, key, chunks, pauseAfter = -1 }) {
  let resume;
  const pause = new Promise(resolve => { resume = resolve; });
  let reached;
  const paused = new Promise(resolve => { reached = resolve; });
  let request;
  const result = new Promise((resolve, reject) => {
    request = http.request(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'idempotency-key': key, 'content-type': `multipart/form-data; boundary=${boundary}` } }, res => {
      const buffers = [];
      res.on('data', chunk => buffers.push(chunk));
      res.on('error', reject);
      res.on('end', () => { const raw = Buffer.concat(buffers).toString(); let body; try { body = JSON.parse(raw); } catch { body = raw; } resolve({ status: res.statusCode, body, headers: res.headers }); });
    });
    request.setTimeout(10000, () => { resume(); request.destroy(new Error('independent HTTP fixture timed out')); });
    request.on('error', reject);
    (async () => {
      for (let i = 0; i < chunks.length; i++) {
        if (request.destroyed) break;
        request.write(chunks[i]);
        if (i === pauseAfter) { reached(); await pause; }
      }
      if (!request.destroyed) request.end();
    })().catch(reject);
  });
  // Immediately attach a handler; deliberate connection destruction must not emit an unhandled rejection.
  const observed = result.then(value => ({ value }), error => ({ error }));
  return { paused, resume, abort: () => { resume(); request.destroy(new Error('independent upload interruption')); }, result, observed };
}
export function assertNoStoragePath(value) {
  const serialized = JSON.stringify(value);
  assert(!serialized.includes('storage_key'), 'public response leaks storage_key');
  assert(!serialized.includes('/private/tmp/'), 'public response leaks a local path');
}
