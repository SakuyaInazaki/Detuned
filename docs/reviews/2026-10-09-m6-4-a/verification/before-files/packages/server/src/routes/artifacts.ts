import type { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { Readable } from 'node:stream';
import type { ArtifactService, AuthenticatedContext, BlobStorePort, StagedBlob } from '@detuned/core';
import { DetunedError, ErrorCode, type ArtifactLimits, type CreateArtifactMetadata } from '@detuned/protocol';
import { validateAllowedQueryParams } from '../utils/query.js';

interface ArtifactRouteOptions {
  service?: ArtifactService;
  blobs?: BlobStorePort;
  limits: ArtifactLimits;
  maxUploads: number;
}

export const artifactRoutes: FastifyPluginAsync<ArtifactRouteOptions> = async (app, options) => {
  await app.register(multipart, {
    limits: { files: 1, fields: 1, parts: 2, fieldSize: 4096, fileSize: options.limits.max_file_bytes },
    throwFileSizeLimit: true,
  });
  let activeUploads = 0;
  const resources = app.runtimeResources;
  const service = () => {
    if (!options.service || !options.blobs) {
      throw new DetunedError(ErrorCode.TEMPORARILY_UNAVAILABLE, '附件存储后端未配置。', 500, false);
    }
    return options.service;
  };
  const invalid = (message: string) => new DetunedError(ErrorCode.VALIDATION_ERROR, message, 400);

  app.post('/spaces/:space_id/artifacts', async (req, reply) => {
    const controller = new AbortController();
    let currentFile: Readable | undefined;
    const onAbort = () => { controller.abort(); currentFile?.destroy(new Error('附件上传已取消。')); req.raw.destroy(); };
    const finish = resources.acquire(onAbort);
    let admitted = false;
    let staged: StagedBlob | undefined;
    let handedToCore = false;
    try {
    const artifacts = service();
    const auth = (req as unknown as { auth: AuthenticatedContext }).auth;
    const { space_id } = req.params as { space_id: string };
    artifacts.authorizeUpload(auth, space_id);
    if (activeUploads >= options.maxUploads) {
      throw new DetunedError(ErrorCode.QUOTA_EXCEEDED, '活跃附件上传已达到服务限额。', 429);
    }
    activeUploads++; admitted = true;
    req.raw.on('aborted', onAbort);
    if (req.raw.aborted) onAbort();
      if (!req.isMultipart()) throw invalid('附件上传需要multipart/form-data。');
      let metadata: unknown = {};
      let seenMetadata = false;
      let mime = 'application/octet-stream';
      for await (const part of req.parts()) {
        if (part.type === 'file') {
          if (part.fieldname !== 'file' || staged) {
            part.file.resume();
            throw invalid('附件上传只能包含一个file字段。');
          }
          currentFile = part.file;
          mime = part.mimetype;
          staged = await options.blobs!.stage(part.file, options.limits.max_file_bytes, controller.signal);
          if (part.file.truncated) throw new DetunedError(ErrorCode.PAYLOAD_TOO_LARGE, '附件超过单文件字节上限。', 413);
        } else {
          if (part.fieldname !== 'metadata' || seenMetadata) throw invalid('附件上传包含未知或重复字段。');
          seenMetadata = true;
          if (part.valueTruncated || (typeof part.value === 'string' && Buffer.byteLength(part.value, 'utf8') > 4096)) {
            throw invalid('metadata必须为不超过4096字节的JSON。');
          }
          if (part.mimetype === 'application/json') {
            // The installed multipart parser already parses bounded JSON fields.
            metadata = part.value;
          } else {
            if (typeof part.value !== 'string') throw invalid('metadata不是合法JSON。');
            try { metadata = JSON.parse(part.value); } catch { throw invalid('metadata不是合法JSON。'); }
          }
        }
      }
      if (!staged) throw invalid('附件上传缺少file字段。');
      if (controller.signal.aborted) throw invalid('附件上传已取消。');
      // All parts, including trailing metadata and framing errors, have now been consumed.
      // Core takes ownership of stage and performs metadata, MIME, ACL, quota and idempotency checks.
      handedToCore = true;
      const artifact = await artifacts.create(auth, space_id, {
        staged, mime, metadata: metadata as CreateArtifactMetadata,
      }, typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : '');
      reply.status(201);
      return { api_version: '1', request_id: req.id, data: artifact };
    } catch (error) {
      // multipart 9.x reports malformed or truncated application/json fields
      // as 406. This upload contract treats them as invalid request metadata;
      // preserve every other parser/transport/business error (including file413).
      if (error instanceof Error &&
          (error as Error & { code?: string }).code === 'FST_INVALID_JSON_FIELD_ERROR') {
        throw invalid('metadata不是合法或完整的JSON。');
      }
      throw error;
    } finally {
      try {
        if (staged && !handedToCore) await options.blobs!.discardStage(staged);
      } finally {
        req.raw.removeListener('aborted', onAbort);
        if (admitted) activeUploads--;
        finish();
      }
    }
  });

  app.get('/spaces/:space_id/artifacts/:id', async (req) => {
    validateAllowedQueryParams(req.query, []);
    const { space_id, id } = req.params as { space_id: string; id: string };
    const finish = resources.acquire(() => {});
    try {
    const metadata = await service().getMetadata((req as unknown as { auth: AuthenticatedContext }).auth, space_id, id);
    return { api_version: '1', request_id: req.id, data: metadata };
    } finally { finish(); }
  });

  app.get('/spaces/:space_id/artifacts/:id/content', async (req, reply) => {
    validateAllowedQueryParams(req.query, []);
    const { space_id, id } = req.params as { space_id: string; id: string };
    let cancelled = false;
    let stream: Readable | undefined;
    let content: Awaited<ReturnType<ArtifactService['getContent']>> | undefined;
    let disposal: Promise<void> | undefined;
    const finish = resources.acquire(() => { cancelled = true; stream?.destroy(); if (content) void dispose().catch(() => {}); });
    const dispose = (): Promise<void> => {
      if (!disposal) disposal = content ? Promise.resolve().then(() => content!.dispose()).then(() => { finish(); }) : Promise.resolve();
      return disposal;
    };
    const disconnect = () => { cancelled = true; stream?.destroy(); if (content) void dispose().catch(() => {}); };
    req.raw.on('aborted', disconnect); reply.raw.on('close', disconnect);
    try {
      content = await service().getContent((req as unknown as { auth: AuthenticatedContext }).auth, space_id, id);
      if (cancelled || resources.closing || req.raw.aborted || reply.raw.destroyed) {
        await dispose();
        throw new DetunedError(ErrorCode.SERVICE_NOT_READY, '附件读取已取消。', 503, true);
      }
      stream = Readable.from(content.chunks);
      stream.once('close', () => { void dispose().catch(() => {}); req.raw.off('aborted', disconnect); reply.raw.off('close', disconnect); });
      reply.header('Content-Type', content.metadata.mime);
      reply.header('Content-Length', content.metadata.bytes);
      reply.header('Content-Disposition', `attachment; filename="${content.download_name.replace(/[^A-Za-z0-9_-]/g, '_')}"`);
      reply.header('X-Content-Type-Options', 'nosniff'); reply.header('Cache-Control', 'private, no-store');
      return reply.send(stream);
    } catch (error) {
      if (content) await dispose(); else finish();
      req.raw.off('aborted', disconnect); reply.raw.off('close', disconnect);
      throw error;
    }
  });
};
