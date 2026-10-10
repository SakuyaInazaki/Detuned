import { checkRoutes } from './routes/checks.js';
import { ReviewModule, ReviewRequestService, ReviewSubmissionService, ReviewFinalizationService, ReviewStatusService, ReviewPostCatalogService } from '@detuned/module-review';
import { reviewRoutes } from './routes/reviews.js';
import type { Server as HttpServer } from 'node:http';
import type { Server as HttpsServer } from 'node:https';
import { resolveServerTlsOptions, type ServerTlsOptions } from './tls-config.js';
import { trackTlsSockets } from './tls-sockets.js';
import {resolveWebAssetsDir,isWebStaticRequest,staticWebRoutes} from './static-web.js';
import {authRoutes} from './routes/auth.js';
import {resolveWebAuthConfig,checkWebRequest,readWebCookie,readCsrf,uniqueHeader} from './web-auth.js';
import {WEB_AUTH_PATH} from '@detuned/protocol';
import { RuntimeResources } from './runtime-resources.js';
import { randomBytes } from 'node:crypto';
import Fastify, { FastifyInstance, type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import {
  StoragePort,
  mapStorageFullError,
  ClockPort,
  SystemClock,
  IdGeneratorPort,
  CryptoIdGenerator,
  HasherPort,
  CryptoHasher,
  TokenSignerPort,
  HmacTokenSigner,
  AuthService,
  WebSessionService,
  AdminService,
  OperationsService,
  WriteRateLimiter,
  IdempotencyService,
  SpaceService,
  SpaceExportService,
  ThreadService,
  PostService,
  RelationService,
  EventService,
  ContextService,
  SpaceRevisionReadService,
  PostRevisionReadService,
  ThreadPostsReadService,
  PostCatalogReadService,
  SearchService,
  RedactionService,
  ArtifactService,
  CheckService,
  BlobStorePort,
} from '@detuned/core';
import { DetunedError, ErrorCode, resolveArtifactLimits, resolveWriteRateLimits, resolveResourceLimits, type ResourceLimits, type WriteRateLimits, type ArtifactLimits, ANONYMOUS_HTTP_ROUTES } from '@detuned/protocol';
import { installRequestLogging, type RequestLogSink } from './observability.js';
import { operationsRoutes } from './routes/operations.js';
import { metaRoutes } from './routes/meta.js';
import { spaceRoutes } from './routes/spaces.js';
import { threadRoutes } from './routes/threads.js';
import { postRoutes } from './routes/posts.js';
import { relationRoutes } from './routes/relations.js';
import { eventRoutes } from './routes/events.js';
import { searchRoutes } from './routes/search.js';
import { adminRoutes } from './routes/admin.js';
import { exportRoutes } from './routes/export.js';
import { artifactRoutes } from './routes/artifacts.js';
import { validateAllowedQueryParams } from './utils/query.js';

declare module 'fastify' {
  interface FastifyInstance { detunedBeginDraining(): void; runtimeResources: RuntimeResources; }
}

export interface AppOptions {
  storage: StoragePort;
  tls?: ServerTlsOptions;
  webOrigin?: string;
  webAssetsDir?: string;
  allowInsecureLoopback?: boolean;
  requestLogSink?: RequestLogSink;
  clock?: ClockPort;
  idGen?: IdGeneratorPort;
  hasher?: HasherPort;
  tokenSigner?: TokenSignerPort;
  tokenSecret?: string;
  artifactBlobs?: BlobStorePort;
  artifactLimits?: Partial<ArtifactLimits>;
  writeRateLimits?: Partial<WriteRateLimits>;
  resourceLimits?: Partial<ResourceLimits>;
  artifactMaxUploads?: number;
  exportLimits?: { max_raw_bytes?: number; max_line_bytes?: number; max_total_bytes?: number; max_records?: number; deadline_ms?: number; max_active?: number };
}

export type ServerApp = FastifyInstance<HttpServer | HttpsServer>;

export function buildApp(options: AppOptions): ServerApp {
  const tls = options.tls === undefined ? undefined : resolveServerTlsOptions(options.tls);
  const webConfig=resolveWebAuthConfig(options);
  if (tls && webConfig && !webConfig.origin.startsWith('https://')) throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'TLS Web requires an HTTPS origin.', 400, false);
  const webAssetsDir=resolveWebAssetsDir(options.webAssetsDir,webConfig?.origin);
  const resourceLimits = resolveResourceLimits(options.resourceLimits);
  const writeRateLimits = resolveWriteRateLimits(options.writeRateLimits);
  const artifactLimits = resolveArtifactLimits(options.artifactLimits);
  const artifactMaxUploads = options.artifactMaxUploads ?? 4;
  if (!Number.isInteger(artifactMaxUploads) || artifactMaxUploads < 1 || artifactMaxUploads > 64) {
    throw new Error('活跃附件上传限额必须为1–64的整数。');
  }
  if (typeof options.storage.configureResourceLimits !== 'function') throw new DetunedError(ErrorCode.TEMPORARILY_UNAVAILABLE, 'Storage does not support runtime resource limits.', 503, false);
  options.storage.configureResourceLimits(resourceLimits);
  options.storage.prepareRuntimeReadIndexes?.();
  const clock = options.clock ?? new SystemClock();
  const idGen = options.idGen ?? new CryptoIdGenerator();
  const hasher = options.hasher ?? new CryptoHasher();
  const tokenSigner = options.tokenSigner ?? new HmacTokenSigner();
  const tokenSecret =
    options.tokenSecret ??
    (typeof (options.storage as any).getInstanceSecret === 'function'
      ? (options.storage as any).getInstanceSecret()
      : (() => {
          throw new Error('实例未提供持久密钥且存储接口未实现 getInstanceSecret。');
        })());

  const writeRateLimiter = new WriteRateLimiter(clock, writeRateLimits);
  const authService = new AuthService(options.storage, hasher, clock, writeRateLimiter);
  const webSessions=webConfig?new WebSessionService(authService,clock,hasher):undefined;
  const idempotency = new IdempotencyService(options.storage, hasher, clock, writeRateLimiter);
  const reviewBuilder = new ReviewModule(options.storage,hasher,clock,idGen,authService);
  const reviewServices = {
    requests:new ReviewRequestService(options.storage,authService,idempotency,clock,idGen,reviewBuilder),
    submissions:new ReviewSubmissionService(options.storage,authService,idempotency,clock,idGen),
    finalization:new ReviewFinalizationService(options.storage,authService,idempotency,clock,idGen),
    status:new ReviewStatusService(options.storage,authService),
    catalog:new ReviewPostCatalogService(options.storage,authService,new ReviewStatusService(options.storage,authService),tokenSigner,tokenSecret,clock),
  };
  const spaceExportService = new SpaceExportService(options.storage, authService, clock, { limits: options.exportLimits });
  const spaceService = new SpaceService(options.storage, idGen, clock, authService, idempotency, writeRateLimiter);
  const threadService = new ThreadService(options.storage, idGen, clock, hasher, authService, idempotency);
  const postService = new PostService(options.storage, idGen, clock, hasher, authService, idempotency);
  const relationService = new RelationService(options.storage, idGen, clock, authService, idempotency);
  const eventService = new EventService(options.storage, idGen, clock, tokenSigner, authService, tokenSecret, undefined, writeRateLimiter);
  const operationsService = new OperationsService(options.storage, authService);
  const adminService = new AdminService(options.storage, idGen, clock, authService, writeRateLimiter);
  const contextService = new ContextService(options.storage, tokenSigner, authService, tokenSecret, clock);
  const spaceRevisionReadService = new SpaceRevisionReadService(options.storage, tokenSigner, authService, tokenSecret, clock);
  const postCatalogReadService = new PostCatalogReadService(options.storage, tokenSigner, authService, tokenSecret, clock);
  const threadPostsReadService = new ThreadPostsReadService(options.storage, tokenSigner, authService, tokenSecret, clock);
  const postRevisionReadService = new PostRevisionReadService(options.storage, tokenSigner, authService, tokenSecret, clock);
  const searchService = new SearchService(options.storage, authService, { signer: tokenSigner, secret: tokenSecret, clock, hasher });
  const redactionService = new RedactionService(options.storage, idGen, clock, authService, idempotency);

  const checkService=new CheckService(options.storage,authService,idempotency,clock,idGen,hasher);
  const artifactService = options.artifactBlobs
    ? new ArtifactService(options.storage, options.artifactBlobs, authService, idempotency, idGen, clock, artifactLimits, resourceLimits)
    : undefined;

  const ajvOptions:NonNullable<FastifyServerOptions['ajv']>={
    customOptions:{removeAdditional:false,useDefaults:true,coerceTypes:false,allErrors:true},
    plugins:[validator=>{
      validator.addKeyword({keyword:'x-max-codepoints',type:'string',schemaType:'number',validate:(maximum:number,value:string)=>{
        let count=0;for(const _codepoint of value)if(++count>maximum)return false;return true;
      }});
      return validator;
    }],
  };
  const common = {
    logger: false as const,
    requestIdHeader: false as const,
    ajv:ajvOptions,
  };
  const app: ServerApp = tls
    ? Fastify({ ...common, https: { ...tls, minVersion: 'TLSv1.2', maxHeaderSize: 65536 } })
    : Fastify({ ...common, http: { maxHeaderSize: 65536 } });
  const tlsSockets = tls ? trackTlsSockets(app.server) : undefined;

  const resources = new RuntimeResources();
  app.decorate('runtimeResources', resources);
  app.decorate('detunedBeginDraining', () => { operationsService.beginDraining(); resources.beginClosing(); });
  installRequestLogging(app, options.requestLogSink);
  app.addHook('preClose', async () => { app.detunedBeginDraining(); webSessions?.close(); await resources.waitForIdle(); await tlsSockets?.drain(); });
  app.addHook('onClose', async () => { tlsSockets?.dispose(); });
  app.addHook('onRequest', async (req,reply) => {
    if(webConfig&&(req.routeOptions.url===WEB_AUTH_PATH||req.headers.cookie!==undefined))reply.header('cache-control','no-store');
    if(/\/(?:review-(?:requests|snapshots|submissions)|check-runs)(?:\/|$)/.test(req.routeOptions.url??''))reply.header('Cache-Control','private, no-store');
    if(webConfig){checkWebRequest(req,webConfig);if(req.routeOptions.url===WEB_AUTH_PATH&&req.method==='POST'){checkWebRequest(req,webConfig,true);webSessions!.admitLoginAttempt();}}

    if (resources.closing && !['/api/v1/health/live', '/api/v1/health/ready'].includes(req.routeOptions.url ?? '')) throw new DetunedError(ErrorCode.SERVICE_NOT_READY, '服务正在关闭。', 503, true, { ready: false });
  });
  (app as any).operationsService = operationsService;

  // Attach services to app instance
  (app as any).storage = options.storage;
  (app as any).clock = clock;
  (app as any).idGen = idGen;
  (app as any).hasher = hasher;
  (app as any).tokenSigner = tokenSigner;
  (app as any).tokenSecret = tokenSecret;
  (app as any).authService = authService;
  (app as any).adminService = adminService;
  (app as any).writeRateLimiter = writeRateLimiter;
  (app as any).writeRateLimits = writeRateLimits;
  (app as any).resourceLimits = resourceLimits;
  (app as any).spaceService = spaceService;
  (app as any).spaceExportService = spaceExportService;
  (app as any).threadService = threadService;
  (app as any).postService = postService;
  (app as any).relationService = relationService;
  (app as any).eventService = eventService;
  (app as any).contextService = contextService;
  (app as any).spaceRevisionReadService = spaceRevisionReadService;
  (app as any).postCatalogReadService = postCatalogReadService;
  (app as any).threadPostsReadService = threadPostsReadService;
  (app as any).postRevisionReadService = postRevisionReadService;
  (app as any).searchService = searchService;
  (app as any).redactionService = redactionService;
  (app as any).artifactBackendConfigured = Boolean(options.artifactBlobs);
  (app as any).artifactLimits = artifactLimits;

  app.register(cors,webConfig?{origin:webConfig.origin,credentials:true,methods:['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS']}:{});

  // Global Error Handler
  app.setErrorHandler((error, req, reply) => {
    error = mapStorageFullError(error) as typeof error;
    if (error instanceof DetunedError) {
      const retrySeconds = error.details?.retry_after_seconds;
      if (error.code === ErrorCode.RATE_LIMITED && error.statusCode === 429 && (error.details?.scope === 'actor' || error.details?.scope === 'instance' || error.details?.scope === 'web_login' || error.details?.scope === 'web_session') && typeof retrySeconds === 'number' && Number.isSafeInteger(retrySeconds) && retrySeconds >= 1 && retrySeconds <= 600000) reply.header('Retry-After', String(retrySeconds));
      reply.status(error.statusCode).send({
        api_version: '1',
        request_id: req.id,
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          details: error.details,
        },
      });
      return;
    }

    const anyErr = error as any;
    if (anyErr?.validation) {
      reply.status(400).send({
        api_version: '1',
        request_id: req.id,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: anyErr.message ?? '请求验证错误。',
          retryable: false,
          details: { issues: anyErr.validation },
        },
      });
      return;
    }

    if (
      typeof anyErr?.statusCode === 'number' &&
      anyErr.statusCode >= 400 &&
      anyErr.statusCode < 500
    ) {
      const statusCode = anyErr.statusCode;
      const code =
        statusCode === 404
          ? ErrorCode.NOT_FOUND
          : statusCode === 401
          ? ErrorCode.UNAUTHENTICATED
          : statusCode === 403
          ? ErrorCode.FORBIDDEN
          : statusCode === 413
          ? ErrorCode.PAYLOAD_TOO_LARGE
          : ErrorCode.VALIDATION_ERROR;
      reply.status(statusCode).send({
        api_version: '1',
        request_id: req.id,
        error: {
          code,
          message: anyErr.message ?? '客户端请求错误。',
          retryable: false,
          details: anyErr.details,
        },
      });
      return;
    }

    reply.status(500).send({
      api_version: '1',
      request_id: req.id,
      error: {
        code: ErrorCode.TEMPORARILY_UNAVAILABLE,
        message: '服务器内部错误。',
        retryable: true,
      },
    });
  });

  // Query rejection for write methods
  app.addHook('preValidation', async (req) => {
    const writeMethods = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
    if (writeMethods.has(req.method)) {
      validateAllowedQueryParams(req.query, []);
    }
  });

  // Auth Hook
  app.addHook('preHandler', async (req) => {
    if(webAssetsDir&&isWebStaticRequest(req))return;
    if(webConfig&&webSessions){
      const secret=readWebCookie(req),authorization=uniqueHeader(req,'authorization');
      const login=req.routeOptions.url===WEB_AUTH_PATH&&req.method==='POST';
      if(secret!==undefined&&authorization!==undefined&&!login)throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Mixed authentication sources are not allowed.',400);
      if(login)return;
      if(secret!==undefined){const write=!['GET','HEAD','OPTIONS'].includes(req.method);if(write)checkWebRequest(req,webConfig,true);(req as any).auth=webSessions.authorize(secret,write?readCsrf(req):undefined);return;}
      if(req.routeOptions.url===WEB_AUTH_PATH)throw new DetunedError(ErrorCode.UNAUTHENTICATED,'Web session unavailable.',401);
    }
    // Skip auth for capabilities endpoint
    if ((ANONYMOUS_HTTP_ROUTES as readonly string[]).includes(req.routeOptions.url ?? '')) {
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new DetunedError(
        ErrorCode.UNAUTHENTICATED,
        '缺少或无效的 Authorization Bearer Token。',
        401
      );
    }

    const token = authHeader.substring(7);
    const auth = authService.authenticateToken(token);
    (req as any).auth = auth;
  });

  if(webAssetsDir)app.register(staticWebRoutes,{root:webAssetsDir});

  if(webConfig&&webSessions)app.register(authRoutes,{service:webSessions,config:webConfig});

  // Register API v1 routes
  app.register(
    async (v1) => {
      v1.register(metaRoutes);
      v1.register(reviewRoutes,reviewServices);
      v1.register(checkRoutes,{service:checkService});
      v1.register(operationsRoutes, { service: operationsService });
      v1.register(spaceRoutes);
      v1.register(exportRoutes, { service: spaceExportService });
      v1.register(threadRoutes);
      v1.register(postRoutes);
      v1.register(relationRoutes);
      v1.register(eventRoutes);
      v1.register(searchRoutes);
      v1.register(adminRoutes);
      v1.register(artifactRoutes, { service: artifactService, blobs: options.artifactBlobs, limits: artifactLimits, maxUploads: artifactMaxUploads });
    },
    { prefix: '/api/v1' }
  );

  return app;
}
