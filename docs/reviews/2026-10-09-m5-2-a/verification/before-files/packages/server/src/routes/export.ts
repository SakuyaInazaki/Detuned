import type { FastifyPluginAsync } from 'fastify';
import { Readable } from 'node:stream';
import type { AuthenticatedContext, SpaceExportService } from '@detuned/core';
import { DetunedError, ErrorCode, EXPORT_LIMITS, validateSpaceExportLine } from '@detuned/protocol';
import { validateAllowedQueryParams } from '../utils/query.js';

export const exportRoutes: FastifyPluginAsync<{ service: SpaceExportService }> = async (app, options) => {
  const resources = app.runtimeResources;
  app.get('/spaces/:space_id/export', async (req, reply) => {
    validateAllowedQueryParams(req.query, ['format']);
    const query = req.query as { format?: unknown };
    if (query.format !== undefined && query.format !== 'ndjson') throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'format must be ndjson.', 400);
    if (resources.closing) throw new DetunedError(ErrorCode.EXPORT_UNAVAILABLE, 'Export server is closing.', 503, false);
    const { space_id } = req.params as { space_id: string };
    let stream: Readable | undefined;
    const finish = resources.acquire(() => stream?.destroy(new Error('Export server is closing.')));
    let session: ReturnType<SpaceExportService['open']>;
    try { session = options.service.open((req as unknown as { auth: AuthenticatedContext }).auth, space_id, { onError: error => stream?.destroy(error) }); } catch (error) { finish(); throw error; }
    let scheduled: NodeJS.Immediate | undefined;
    const checkLine = (line: string) => {
      let valid = false;
      try { valid = Buffer.byteLength(line) <= EXPORT_LIMITS.max_line_bytes && line.endsWith('\n') && validateSpaceExportLine(JSON.parse(line)); } catch { /* reject malformed source output before transport */ }
      if (!valid) throw new DetunedError(ErrorCode.EXPORT_UNAVAILABLE, 'Export source produced an invalid line.', 503, false);
      return line;
    };
    let first: ReturnType<typeof session.nextLine>;
    try { first = session.nextLine(); if (first.kind !== 'line') throw new Error('Export source did not produce a header.'); checkLine(first.line); }
    catch (error) { session.close(); finish(); throw error; }
    let firstLine: string | undefined = first.line;
    stream = new Readable({ highWaterMark: 1, read() {
      if (scheduled) return;
      try {
        if (firstLine !== undefined) { const line = firstLine; firstLine = undefined; this.push(line); return; }
        const next = session.nextLine();
        if (next.kind === 'pending') { scheduled = setImmediate(() => { scheduled = undefined; if (!this.destroyed) this._read(1); }); }
        else if (next.kind === 'done') this.push(null);
        else this.push(checkLine(next.line));
      } catch (error) { this.destroy(error instanceof Error ? error : new Error('Export source failed.')); }
    }, destroy(error, callback) { if (scheduled) clearImmediate(scheduled); session.close(); callback(error); } });
    const abort = () => stream?.destroy(new Error('Export connection closed.'));
    req.raw.on('aborted', abort); reply.raw.on('close', abort);
    stream.once('close', () => { finish(); req.raw.off('aborted', abort); reply.raw.off('close', abort); });
    if (req.raw.aborted || reply.raw.destroyed) abort();
    reply.header('Content-Type', 'application/x-ndjson; charset=utf-8'); reply.header('Cache-Control', 'private, no-store'); reply.header('X-Content-Type-Options', 'nosniff');
    return reply.send(stream);
  });
};
