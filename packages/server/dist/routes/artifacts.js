import multipart from '@fastify/multipart';
import { Readable } from 'node:stream';
import { DetunedError, ErrorCode, checkArtifactContentPath, CheckRunParamsSchema, CheckArtifactParamsSchema, isCheckArtifactMetadata } from '@detuned/protocol';
import { validateAllowedQueryParams } from '../utils/query.js';
export const artifactRoutes = async (app, options) => {
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
    const invalid = (message) => new DetunedError(ErrorCode.VALIDATION_ERROR, message, 400);
    const upload = (privateReview, checkRun = false) => async (req, reply) => {
        const controller = new AbortController();
        let currentFile;
        const onAbort = () => { controller.abort(); currentFile?.destroy(new Error('附件上传已取消。')); req.raw.destroy(); };
        const finish = resources.acquire(onAbort);
        let admitted = false;
        let staged;
        let handedToCore = false;
        try {
            const artifacts = service();
            const auth = req.auth;
            const { space_id, requestId, run_id } = req.params;
            let assignmentId;
            if (privateReview || checkRun) {
                validateAllowedQueryParams(req.query, []);
                let keyHeaders = 0;
                for (let i = 0; i < req.raw.rawHeaders.length; i += 2)
                    if (req.raw.rawHeaders[i]?.toLowerCase() === 'idempotency-key')
                        keyHeaders++;
                if (keyHeaders !== 1 || typeof req.headers['idempotency-key'] !== 'string' || !req.headers['idempotency-key'].trim())
                    throw invalid('缺少或重复的 Idempotency-Key 请求头。');
                if (checkRun) {
                    if (!run_id)
                        throw invalid('缺少检查。');
                    artifacts.authorizeCheckUpload(auth, space_id, run_id);
                }
                else {
                    if (!requestId)
                        throw invalid('缺少评审请求。');
                    assignmentId = artifacts.authorizeReviewUploadForRequest(auth, space_id, requestId);
                }
            }
            else
                artifacts.authorizeUpload(auth, space_id);
            if (activeUploads >= options.maxUploads) {
                throw new DetunedError(ErrorCode.QUOTA_EXCEEDED, '活跃附件上传已达到服务限额。', 429);
            }
            activeUploads++;
            admitted = true;
            req.raw.on('aborted', onAbort);
            if (req.raw.aborted)
                onAbort();
            if (!req.isMultipart())
                throw invalid('附件上传需要multipart/form-data。');
            let metadata = {};
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
                    staged = await options.blobs.stage(part.file, options.limits.max_file_bytes, controller.signal);
                    if (part.file.truncated)
                        throw new DetunedError(ErrorCode.PAYLOAD_TOO_LARGE, '附件超过单文件字节上限。', 413);
                }
                else {
                    if (part.fieldname !== 'metadata' || seenMetadata)
                        throw invalid('附件上传包含未知或重复字段。');
                    seenMetadata = true;
                    if (part.valueTruncated || (typeof part.value === 'string' && Buffer.byteLength(part.value, 'utf8') > 4096)) {
                        throw invalid('metadata必须为不超过4096字节的JSON。');
                    }
                    if (part.mimetype === 'application/json') {
                        // The installed multipart parser already parses bounded JSON fields.
                        metadata = part.value;
                    }
                    else {
                        if (typeof part.value !== 'string')
                            throw invalid('metadata不是合法JSON。');
                        try {
                            metadata = JSON.parse(part.value);
                        }
                        catch {
                            throw invalid('metadata不是合法JSON。');
                        }
                    }
                }
            }
            if (!staged)
                throw invalid('附件上传缺少file字段。');
            if (controller.signal.aborted)
                throw invalid('附件上传已取消。');
            // All parts, including trailing metadata and framing errors, have now been consumed.
            // Core takes ownership of stage and performs metadata, MIME, ACL, quota and idempotency checks.
            if ((privateReview || checkRun) && (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata) || Object.keys(metadata).length !== 0))
                throw invalid('评审附件metadata必须为空对象。');
            const input = { staged, mime, metadata: metadata };
            const requestKey = typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : '';
            handedToCore = true;
            const artifact = checkRun
                ? await artifacts.createForCheck(auth, space_id, run_id, input, requestKey)
                : assignmentId === undefined
                    ? await artifacts.create(auth, space_id, input, requestKey)
                    : await artifacts.createForReview(auth, space_id, assignmentId, input, requestKey);
            const projected = checkRun ? { ...artifact, content_url: checkArtifactContentPath(space_id, run_id, artifact.id) } : artifact;
            if (checkRun && !isCheckArtifactMetadata(projected, space_id, run_id))
                throw new DetunedError(ErrorCode.RESYNC_REQUIRED, 'Check artifact response cannot be reconstructed.', 409);
            reply.status(201);
            return { api_version: '1', request_id: req.id, data: projected };
        }
        catch (error) {
            // multipart 9.x reports malformed or truncated application/json fields
            // as 406. This upload contract treats them as invalid request metadata;
            // preserve every other parser/transport/business error (including file413).
            if (error instanceof Error &&
                error.code === 'FST_INVALID_JSON_FIELD_ERROR') {
                throw invalid('metadata不是合法或完整的JSON。');
            }
            throw error;
        }
        finally {
            try {
                if (staged && !handedToCore)
                    await options.blobs.discardStage(staged);
            }
            finally {
                req.raw.removeListener('aborted', onAbort);
                if (admitted)
                    activeUploads--;
                finish();
            }
        }
    };
    app.post('/spaces/:space_id/artifacts', upload(false));
    app.post('/spaces/:space_id/check-runs/:run_id/artifacts', { schema: { params: CheckRunParamsSchema }, onRequest: async (_req, reply) => { reply.header('Cache-Control', 'private, no-store'); } }, upload(false, true));
    app.post('/spaces/:space_id/review-requests/:requestId/artifacts', {
        onRequest: async (_req, reply) => { reply.header('Cache-Control', 'private, no-store'); },
    }, upload(true));
    const metadataHandler = (checkRun = false) => async (req, reply) => {
        validateAllowedQueryParams(req.query, []);
        const { space_id, id, run_id } = req.params;
        const finish = resources.acquire(() => { });
        try {
            const auth = req.auth;
            const metadata = checkRun ? await service().getCheckMetadata(auth, space_id, run_id, id) : await service().getMetadata(auth, space_id, id);
            if (metadata.visibility === 'review_assignment')
                reply.header('Cache-Control', 'private, no-store');
            const projected = checkRun ? { ...metadata, content_url: checkArtifactContentPath(space_id, run_id, id) } : metadata;
            if (checkRun && !isCheckArtifactMetadata(projected, space_id, run_id))
                throw new DetunedError(ErrorCode.RESYNC_REQUIRED, 'Check artifact response cannot be reconstructed.', 409);
            return { api_version: '1', request_id: req.id, data: projected };
        }
        finally {
            finish();
        }
    };
    app.get('/spaces/:space_id/artifacts/:id', metadataHandler());
    app.get('/spaces/:space_id/check-runs/:run_id/artifacts/:id', { schema: { params: CheckArtifactParamsSchema }, onRequest: async (_req, reply) => { reply.header('Cache-Control', 'private, no-store'); } }, metadataHandler(true));
    const contentHandler = (checkRun = false) => async (req, reply) => {
        validateAllowedQueryParams(req.query, []);
        const { space_id, id, run_id } = req.params;
        let cancelled = false;
        let stream;
        let content;
        let disposal;
        const finish = resources.acquire(() => { cancelled = true; stream?.destroy(); if (content)
            void dispose().catch(() => { }); });
        const dispose = () => {
            if (!disposal)
                disposal = content ? Promise.resolve().then(() => content.dispose()).then(() => { finish(); }) : Promise.resolve();
            return disposal;
        };
        const disconnect = () => { cancelled = true; stream?.destroy(); if (content)
            void dispose().catch(() => { }); };
        req.raw.on('aborted', disconnect);
        reply.raw.on('close', disconnect);
        try {
            const auth = req.auth;
            content = checkRun ? await service().getCheckContent(auth, space_id, run_id, id) : await service().getContent(auth, space_id, id);
            if (cancelled || resources.closing || req.raw.aborted || reply.raw.destroyed) {
                await dispose();
                throw new DetunedError(ErrorCode.SERVICE_NOT_READY, '附件读取已取消。', 503, true);
            }
            stream = Readable.from(content.chunks);
            stream.once('close', () => { void dispose().catch(() => { }); req.raw.off('aborted', disconnect); reply.raw.off('close', disconnect); });
            reply.header('Content-Type', content.metadata.mime);
            reply.header('Content-Length', content.metadata.bytes);
            reply.header('Content-Disposition', `attachment; filename="${content.download_name.replace(/[^A-Za-z0-9_-]/g, '_')}"`);
            reply.header('X-Content-Type-Options', 'nosniff');
            reply.header('Cache-Control', 'private, no-store');
            return reply.send(stream);
        }
        catch (error) {
            if (content)
                await dispose();
            else
                finish();
            req.raw.off('aborted', disconnect);
            reply.raw.off('close', disconnect);
            throw error;
        }
    };
    app.get('/spaces/:space_id/artifacts/:id/content', contentHandler());
    app.get('/spaces/:space_id/check-runs/:run_id/artifacts/:id/content', { schema: { params: CheckArtifactParamsSchema } }, contentHandler(true));
};
//# sourceMappingURL=artifacts.js.map