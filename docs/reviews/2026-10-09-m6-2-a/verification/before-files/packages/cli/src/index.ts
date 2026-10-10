#!/usr/bin/env node
import {CliSafeError,renderCliError} from './cli-errors.js';
import {configureCliParser,diagnosticJsonMode,parserError} from './argv-diagnostics.js';
import {resolveCliToken} from './token-source.js';
import {readAdminInput} from './admin-input.js';
import type {CreateActorRequest,CreateCredentialRequest,CreateMembershipRequest,PatchMembershipRequest,CreateRedactionRequest,CreateSpaceRequest,PatchSpaceRequest,PatchThreadRequest,CreateSessionRequest} from '@detuned/protocol';
import {readArtifactBlob,publishArtifactFile} from './artifact-io.js';
import { parsePageLimit,parsePollWait } from './read-options.js';
import { createServeShutdown, parseShutdownTimeout } from './serve-shutdown.js';
import { createRequestLogWriter } from './request-log-writer.js';
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';
import { DetunedClient, RequestKeyError, type RequestKeyStore } from '@detuned/client';
import { FileRequestKeyStore } from '@detuned/client/node';
import { DetunedError, ErrorCode, resolveArtifactLimits, resolveWriteRateLimits, resolveResourceLimits } from '@detuned/protocol';
import { SqliteStorage, bootstrapDatabase, isDatabaseInitialized, openAndCoordinateDatabase, DirectoryLock, backupOffline, restoreBackup, importSpace, assertDataDirReady, MaintenanceError, ImportError, upgradeOffline, UpgradeError } from '@detuned/storage-sqlite';
import { buildApp, resolveWebAuthConfig, resolveWebAssetsDir, ArtifactFileStore, loadServerTlsOptions } from '@detuned/server';

function mapExitCode(err: any): number {
  if (err instanceof UpgradeError) return err.code === 'INVALID_OPTIONS' || err.code === 'OFFLINE_REQUIRED' ? 2 : 1;
  if (err instanceof ImportError) return err.code === 'INVALID_OPTIONS' ? 2 : 1;
  if (err instanceof MaintenanceError) return err.code === 'INVALID_OPTIONS' || err.code === 'OFFLINE_REQUIRED' ? 2 : 1;
  if (err instanceof RequestKeyError && err.code === 'INVALID_OPTIONS') return 2;
  if (err instanceof DetunedError) {
    if (err.code === ErrorCode.VALIDATION_ERROR || err.code === ErrorCode.PAYLOAD_TOO_LARGE || err.code === ErrorCode.EXPORT_LIMIT_EXCEEDED) {
      return 2;
    }
    if (err.code === ErrorCode.UNAUTHENTICATED || err.code === ErrorCode.FORBIDDEN) {
      return 3;
    }
    if (
      err.code === ErrorCode.EXPORT_INVALIDATED ||
      err.code === ErrorCode.REVISION_CONFLICT ||
      err.code === ErrorCode.IDEMPOTENCY_CONFLICT ||
      err.code === ErrorCode.ACK_INVALID ||
      err.code === ErrorCode.RESYNC_REQUIRED ||
      err.code === ErrorCode.SNAPSHOT_STALE ||
      err.code === ErrorCode.OPEN_OBJECTIONS
    ) {
      return 4;
    }
    if (
      err.code === ErrorCode.EXPORT_UNAVAILABLE ||
      err.code === ErrorCode.TEMPORARILY_UNAVAILABLE ||
      err.code === ErrorCode.STORAGE_BUSY ||
      err.code === ErrorCode.RATE_LIMITED
    ) {
      return 5;
    }
  }
  return 1;
}

function printOutput(data: unknown, jsonOnly = false): void {
  if (jsonOnly) {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  } else {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n');
  }
}

function handleError(err: any, jsonOnly = false): never {
  const exitCode = mapExitCode(err);
  const safe = renderCliError(err);
  if (jsonOnly) {
    process.stdout.write(
      JSON.stringify(
        {
          api_version: '1',
          error: {
            code: safe.code,
            message: safe.message,
            details: safe.details,
          },
        },
        null,
        2
      ) + '\n'
    );
  } else {
    process.stderr.write(`[Detuned Error] (${safe.code}): ${safe.message}\n`);
    if (safe.details) {
      process.stderr.write(JSON.stringify(safe.details, null, 2) + '\n');
    }
  }
  process.exit(exitCode);
}

function getClient(cmdOpts: any, requestKeyStore?: RequestKeyStore): DetunedClient {
  const baseUrl = cmdOpts.url ?? process.env.DETUNED_BASE_URL ?? 'http://127.0.0.1:3000';
  const token = resolveCliToken({token:cmdOpts.token,tokenFile:cmdOpts.tokenFile}, {DETUNED_TOKEN:process.env.DETUNED_TOKEN,DETUNED_TOKEN_FILE:process.env.DETUNED_TOKEN_FILE});
  return new DetunedClient({ baseUrl, token, requestKeyStore });
}

function readInputJson(inputPath?: string): any {
  if (!inputPath) return {};
  if (inputPath === '-') {
    const content = fs.readFileSync(0, 'utf8');
    return JSON.parse(content);
  }
  const content = fs.readFileSync(inputPath, 'utf8');
  return JSON.parse(content);
}

// Persistence is explicit for publish/relate, artifact upload and redact.
async function getWriteContext(options: any, input: any) {
  const directoryGiven = options.requestKeyDir !== undefined;
  const logicalIdGiven = options.logicalOperationId !== undefined;
  if (!directoryGiven && !logicalIdGiven) return { client: getClient(program.opts()), writeOptions: undefined };
  const invalid = (message: string): never => { throw new DetunedError(ErrorCode.VALIDATION_ERROR, message, 400); };
  if (options.requestKey !== undefined || Object.hasOwn(input, 'request_key')) invalid('持久 request_key 选项不能与显式 request_key 并用。');
  if (!directoryGiven || !logicalIdGiven) invalid('--request-key-dir 与 --logical-operation-id 必须成对提供。');
  if (typeof options.requestKeyDir !== 'string' || !options.requestKeyDir.trim()) invalid('request-key-dir 必须为非空目录。');
  if (typeof options.logicalOperationId !== 'string' || !options.logicalOperationId.trim() || Buffer.byteLength(options.logicalOperationId, 'utf8') > 512) invalid('logical-operation-id 必须非全空白且不超过512 UTF-8 bytes。');
  const store = await FileRequestKeyStore.create(options.requestKeyDir);
  return { client: getClient(program.opts(), store), writeOptions: { logicalOperationId: options.logicalOperationId } };
}

const program = new Command();
program
  .name('detuned')
  .description('Detuned: 面向 Coding Agent 的持久化协作论坛 CLI')
  .version('0.1.0')
  .option('--url <url>', 'Detuned 服务地址')
  .option('--token <token>', '认证 Token')
  .option('--token-file <file>', '显式认证 Token 文件，与其他 token 来源互斥')
  .option('--json', '仅输出 JSON 格式到 stdout');

configureCliParser(program);

async function exportToFile(options: any) {
  if (typeof options.space !== 'string' || !options.space.trim() || typeof options.output !== 'string' || !options.output.trim() || !/^\d+$/.test(options.timeoutMs) || !Number.isSafeInteger(Number(options.timeoutMs)) || Number(options.timeoutMs) <= 0 || Number(options.timeoutMs) > 120000) throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Export requires space, new output path and timeout-ms in 1–120000.', 400);
  const requested = path.resolve(options.output);
  const parent = await fs.promises.realpath(path.dirname(requested));
  const output = path.join(parent, path.basename(requested));
  try { await fs.promises.lstat(output); throw new CliSafeError('Export output already exists; nothing was replaced.'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const temporary = path.join(parent, `.detuned-export-${randomBytes(16).toString('hex')}.tmp`);
  const fd = await fs.promises.open(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
  const abort = new AbortController(); const onAbort = () => abort.abort();
  process.on('SIGINT', onAbort); process.on('SIGTERM', onAbort);
  let closed = false;
  try {
    const complete = await getClient(program.opts()).exportSpace(options.space, { timeoutMs: Number(options.timeoutMs), signal: abort.signal, sink: line => fd.writeFile(line) });
    await fd.sync(); await fd.close(); closed = true;
    if (abort.signal.aborted) throw new CliSafeError('Export was cancelled before publication.');
    await fs.promises.link(temporary, output);
    try { const directory = await fs.promises.open(parent, fs.constants.O_RDONLY); try { await directory.sync(); } finally { await directory.close(); } }
    catch { throw new CliSafeError('Export file is complete but publication durability is unconfirmed. The output was retained; do not treat this command as successful.'); }
    if (abort.signal.aborted) throw new CliSafeError('Export was cancelled after publication; the complete output file was retained.');
    return { output, export_id: complete.header.export_id, record_count: complete.end.record_count, bytes: complete.bytes, sha256_chain: complete.end.chain_sha256 };
  } finally {
    process.off('SIGINT', onAbort); process.off('SIGTERM', onAbort);
    if (!closed) await fd.close().catch(() => {});
    await fs.promises.unlink(temporary).catch(() => {});
  }
}

program.command('export').description('按当前权限导出空间NDJSON到不存在的新私有文件')
  .requiredOption('--space <id>', '空间ID')
  .requiredOption('--output <file>', '不存在的新文件（父目录须存在）')
  .option('--timeout-ms <n>', '完整请求/正文/背压超时1–120000ms', '120000')
  .action(async options => { try { printOutput(await exportToFile(options), program.opts().json); } catch (error: any) { handleError(error, program.opts().json); } });

function localDirectory(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new DetunedError(ErrorCode.VALIDATION_ERROR, `${label}必须为非空路径。`, 400);
  return path.resolve(value);
}

program.command('backup').description('离线一致物理备份到新的私有目录')
  .option('--offline', '显式确认离线备份，活跃服务持锁时拒绝')
  .requiredOption('--data-dir <dir>', '原数据目录')
  .requiredOption('--output <dir>', '不存在的新备份目录')
  .action(async (options) => {
    try {
      if (!options.offline) throw new MaintenanceError('OFFLINE_REQUIRED', '备份必须显式提供 --offline。');
      const result = await backupOffline({ dataDir: localDirectory(options.dataDir, 'data-dir'), outputDir: localDirectory(options.output, 'output'), offline: true });
      printOutput({ backup_dir: result.backupDir, format: result.manifest.format, version: result.manifest.version, schema_version: result.manifest.schemaVersion, artifact_count: result.manifest.artifacts.length }, program.opts().json);
    } catch (err: any) { handleError(err, program.opts().json); }
  });

program.command('restore').description('校验物理备份并恢复到新目录；一次输出本地恢复管理员凭据')
  .requiredOption('--backup <dir>', '私有物理备份目录')
  .requiredOption('--data-dir <dir>', '不存在的新数据目录')
  .action(async (options) => {
    try {
      const result = await restoreBackup({ backupDir: localDirectory(options.backup, 'backup'), dataDir: localDirectory(options.dataDir, 'data-dir') });
      printOutput({ data_dir: result.dataDir, admin_actor_id: result.adminActorId, admin_token: result.adminToken }, program.opts().json);
    } catch (err: any) { handleError(err, program.opts().json); }
  });

program.command('import').description('本地校验空间NDJSON并导入新实例；一次输出本地管理员凭据')
  .requiredOption('--input <file>', '空间NDJSON正规文件，不接受stdin或软链')
  .requiredOption('--data-dir <dir>', '不存在的新数据目录')
  .requiredOption('--admin-name <name>', '新本地human管理员名称')
  .option('--timeout-ms <n>', '完整本地导入超时1–120000ms', '120000')
  .action(async (options) => {
    const abort = new AbortController();
    const cancel = () => abort.abort();
    process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
    try {
      const timeoutMs = Number(options.timeoutMs);
      const adminName = typeof options.adminName === 'string' ? options.adminName.trim() : '';
      if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 120000 || !adminName || [...adminName].length > 128 || options.input === '-') {
        throw new ImportError('INVALID_OPTIONS', '导入参数无效：需文件路径、1–128字符管理员名称及1–120000ms超时。');
      }
      const result = await importSpace({ inputPath: localDirectory(options.input, 'input'), dataDir: localDirectory(options.dataDir, 'data-dir'), adminName, signal: abort.signal, timeoutMs });
      process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
      printOutput(result, program.opts().json);
    } catch (err: any) {
      process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
      handleError(err, program.opts().json);
    }
  });

program.command('migrate').description('离线复制旧schema1或schema2实例并升级到新schema3目录；保留原目录回退')
  .option('--offline', '显式确认离线升级，活跃服务持锁时拒绝')
  .requiredOption('--data-dir <dir>', '旧schema1或schema2源目录')
  .requiredOption('--output <dir>', '不存在的新schema3目录')
  .requiredOption('--admin-name <name>', '新本地human管理员名称')
  .option('--timeout-ms <n>', '完整离线升级超时1–120000ms', '120000')
  .action(async (options) => {
    const abort = new AbortController(); const cancel = () => abort.abort();
    process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
    try {
      if (!options.offline) throw new UpgradeError('OFFLINE_REQUIRED', '升级必须显式提供 --offline。');
      const timeoutMs = Number(options.timeoutMs), adminName = typeof options.adminName === 'string' ? options.adminName.trim() : '';
      if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 120000 || !adminName || [...adminName].length > 128) throw new UpgradeError('INVALID_OPTIONS', '升级参数需1–128字符管理员名称及1–120000ms超时。');
      const result = await upgradeOffline({ dataDir: localDirectory(options.dataDir, 'data-dir'), outputDir: localDirectory(options.output, 'output'), offline: true, adminName, signal: abort.signal, timeoutMs });
      process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
      printOutput(result, program.opts().json);
    } catch (err: any) {
      process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
      handleError(err, program.opts().json);
    }
  });

// Server management
program
  .command('init')
  .description('初始化本地 SQLite 数据库与数据目录')
  .option('--data-dir <dir>', '数据目录路径', './data')
  .action((options) => {
    const isJson = Boolean(program.opts().json);
    let lock: DirectoryLock | null = null;
    let db: Database.Database | null = null;
    try {
      const dataDir = path.resolve(options.dataDir);
      assertDataDirReady(dataDir);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      lock = new DirectoryLock(dataDir);
      lock.acquire();
      assertDataDirReady(dataDir);

      const dbPath = path.join(dataDir, 'detuned.sqlite');
      db = new Database(dbPath);
      const res = openAndCoordinateDatabase(db, 'init');
      db.close();
      db = null;
      lock.release();
      lock = null;

      printOutput({
        success: true,
        data_dir: dataDir,
        db_path: dbPath,
        is_new_instance: res.isNewInstance,
        admin_actor_id: res.adminActorId,
        admin_token: res.adminToken,
      }, isJson);
    } catch (err: any) {
      if (db) {
        try { db.close(); } catch {}
        db = null;
      }
      if (lock) {
        try { lock.release(); } catch {}
        lock = null;
      }
      handleError(err, isJson);
    }
  });

program
  .command('serve')
  .description('启动 Detuned HTTP 服务')
  .option('--data-dir <dir>', '数据目录路径', './data')
  .option('--port <port>', '监听端口', '3000')
  .option('--host <host>', '监听地址', '127.0.0.1')
  .option('--artifact-max-file-bytes <bytes>', '附件单文件字节上限（不超过25MiB）', '26214400')
  .option('--artifact-max-space-bytes <bytes>', '每空间附件字节配额', '1073741824')
  .option('--artifact-max-uploads <count>', '活跃附件上传数量（1–64）', '4')
  .option('--write-rate-per-minute <count>', '每actor每分钟写入速率1–60000（默认60）')
  .option('--shutdown-timeout-ms <ms>', '关闭总等待预算1000–120000毫秒', '10000')
  .option('--no-request-logs', '关闭stderr结构化请求日志')
  .option('--max-database-bytes <bytes>', '主数据库页额度（默认1GiB）')
  .option('--max-artifact-bytes <bytes>', '实例登记附件累计字节额度（默认4GiB）')
  .option('--max-artifact-objects <count>', '实例登记附件对象额度（默认10000）')
  .option('--tls-cert-file <file>', 'TLS PEM证书链文件（须同时tls-key-file）')
  .option('--tls-key-file <file>', 'TLS未加密PEM私钥文件（须同时tls-cert-file）')
  .option('--web-assets-dir <dir>', 'Web构建目录（须同时web-origin）')
  .option('--web-origin <origin>', '启用同源Web认证的精确origin')
  .option('--web-allow-insecure-loopback', '允许仅loopback HTTP Web认证')
  .option('--write-burst <count>', '每actor突发写入容量1–10000（默认20）')
  .action(async (options) => {
    const isJson = Boolean(program.opts().json);
    let lock: DirectoryLock | null = null;
    let db: Database.Database | null = null;
    let app: ReturnType<typeof buildApp> | null = null;
    let requestLogs: ReturnType<typeof createRequestLogWriter> | undefined;
    let shutdown: ReturnType<typeof createServeShutdown> | undefined;

    try {
      if ((options.tlsCertFile !== undefined) !== (options.tlsKeyFile !== undefined)) throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'TLS certificate and key files must be provided together.', 400);
      const tls = options.tlsCertFile !== undefined ? await loadServerTlsOptions(options.tlsCertFile, options.tlsKeyFile) : undefined;
      const webConfig=resolveWebAuthConfig({webOrigin:options.webOrigin,allowInsecureLoopback:options.webAllowInsecureLoopback});
      if (tls && webConfig && !webConfig.secure) throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'TLS Web authentication requires an HTTPS origin.', 400);
      const webAssetsDir=resolveWebAssetsDir(options.webAssetsDir,webConfig?.origin,path.resolve(options.dataDir));
      if(webConfig&&!webConfig.secure&&!['localhost','127.0.0.1','::1'].includes(options.host))throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Insecure Web authentication requires a loopback listener.',400);
      const shutdownTimeoutMs = parseShutdownTimeout(options.shutdownTimeoutMs);
      const parseWriteLimit = (value: unknown): number => {
        if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '写入限流参数必须为范围内的正安全整数。', 400);
        return Number(value);
      };
      const parseResourceLimit = (value: unknown): number => {
        if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '资源限额参数必须为范围内的正安全整数。', 400);
        return Number(value);
      };
      const resourceLimits = resolveResourceLimits({
        ...(options.maxDatabaseBytes !== undefined ? { database_max_bytes: parseResourceLimit(options.maxDatabaseBytes) } : {}),
        ...(options.maxArtifactBytes !== undefined ? { artifact_max_total_bytes: parseResourceLimit(options.maxArtifactBytes) } : {}),
        ...(options.maxArtifactObjects !== undefined ? { artifact_max_objects: parseResourceLimit(options.maxArtifactObjects) } : {}),
      });
      const writeRateLimits = resolveWriteRateLimits({
        ...(options.writeRatePerMinute !== undefined ? { per_minute: parseWriteLimit(options.writeRatePerMinute) } : {}),
        ...(options.writeBurst !== undefined ? { burst: parseWriteLimit(options.writeBurst) } : {}),
      });
      const parsePositive = (value: string): number => {
        if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
          throw new DetunedError(ErrorCode.VALIDATION_ERROR, '附件限额必须为正安全整数。', 400);
        }
        return Number(value);
      };
      if (parsePositive(options.artifactMaxFileBytes) > 26214400) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '附件单文件上限不得超过25MiB。', 400);
      }
      const artifactLimits = resolveArtifactLimits({
        max_file_bytes: parsePositive(options.artifactMaxFileBytes),
        max_space_bytes: parsePositive(options.artifactMaxSpaceBytes),
      });
      const artifactMaxUploads = parsePositive(options.artifactMaxUploads);
      if (artifactMaxUploads > 64) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '活跃上传限额不得超过64。', 400);
      const dataDir = path.resolve(options.dataDir);
      assertDataDirReady(dataDir);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      lock = new DirectoryLock(dataDir);
      lock.acquire();
      assertDataDirReady(dataDir);

      const dbPath = path.join(dataDir, 'detuned.sqlite');
      if (!fs.existsSync(dbPath)) {
        throw new DetunedError(
          ErrorCode.NOT_FOUND,
          `数据库文件不存在: ${dbPath}。请先执行 "detuned init --data-dir ${dataDir}" 完成初始化。`,
          404
        );
      }

      db = new Database(dbPath);
      openAndCoordinateDatabase(db, 'serve');

      const storage = new SqliteStorage(db, { dataDir });
      // Validate storage secret before building app
      storage.getInstanceSecret();

      const artifactBlobs = await ArtifactFileStore.create(dataDir);
      // This process owns the existing DirectoryLock; no request can be active before listen.
      await artifactBlobs.cleanupOrphans(storage.listArtifactStorageKeys());
      if (options.requestLogs !== false) requestLogs = createRequestLogWriter(process.stderr);
      app = buildApp({ tls, webAssetsDir, webOrigin: options.webOrigin, allowInsecureLoopback: options.webAllowInsecureLoopback, storage, requestLogSink: requestLogs?.write, artifactBlobs, artifactLimits, artifactMaxUploads, writeRateLimits, resourceLimits });
      const port = parseInt(options.port, 10);
      const host = options.host;

      shutdown = createServeShutdown({
        beginDraining: () => app?.detunedBeginDraining(),
        closeApp: async () => { if (app) await app.close(); },
        closeDatabase: () => { if (db) db.close(); },
        releaseLock: () => { if (lock) lock.releaseStrict(); },
        disposeLogs: () => requestLogs?.close(),
        reportFailure: () => {
          try { process.stderr.write(isJson ? JSON.stringify({error:{code:'SHUTDOWN_FAILED',message:'服务关闭未完整完成。'}})+'\n' : 'Detuned 服务关闭未完整完成。\n'); } catch {}
        },
        exit: code => process.exit(code),
      }, shutdownTimeoutMs);
      shutdown.attachSignals();

      await app.listen({ port, host });
      if (!isJson) {
        const address = app.server.address();
        const boundPort = address && typeof address === 'object' ? address.port : port;
        process.stderr.write(`Detuned 服务已启动: ${tls ? 'https' : 'http'}://${host}:${boundPort}\n数据目录: ${dataDir}\n附件限额: file=${artifactLimits.max_file_bytes} space=${artifactLimits.max_space_bytes} uploads=${artifactMaxUploads}\n`);
      }
    } catch (err: any) {
      if (shutdown) {
        // Listening failures share the already-owned signal cleanup task.
        try { process.stderr.write(isJson ? JSON.stringify({error:{code:'SERVE_FAILED',message:'服务启动失败。'}})+'\n' : 'Detuned 服务启动失败。\n'); } catch {}
        await shutdown.shutdown(1);
        return;
      }
      // Before signal ownership, no request handler can be active.
      try {
        if (app) await app.close();
        if (db) db.close();
        if (lock) lock.releaseStrict();
        requestLogs?.close();
      } catch {
        try { process.stderr.write('Detuned 服务清理未完整完成。\n'); } catch {}
        process.exit(1);
      }
      handleError(err, isJson);
    }
  });

function parseReadPositiveInteger(value: string, label: string): number {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw new DetunedError(ErrorCode.VALIDATION_ERROR, `${label}必须为正safeinteger。`, 400);
  return Number(value);
}
for (const name of ['me', 'capabilities', 'diagnostics'] as const) {
  program.command(name).description('读取身份、能力或管理员运行诊断').action(async () => {
    try {
      const client = getClient(program.opts());
      const result = name === 'me' ? await client.getMe() : name === 'capabilities' ? await client.getCapabilities() : await client.getDiagnostics();
      printOutput(result.data, program.opts().json);
    } catch (error) { handleError(error, program.opts().json); }
  });
}
// New management input failures are safe; legacy input/parser behavior is unchanged.
const actorCommand = program.command('actor').description('显式身份管理');
actorCommand.command('create').option('--input <file>', 'JSON文件或 -；省略读取stdin')
  .action(async options => {
    try { printOutput(await getClient(program.opts()).createActor(readAdminInput<CreateActorRequest>(() => readInputJson(options.input ?? '-'))), program.opts().json); }
    catch (error) { handleError(error, program.opts().json); }
  });
const credentialCommand = program.command('credential').description('显式凭据创建与撤销');
credentialCommand.command('create').option('--input <file>', 'JSON文件或 -；省略读取stdin')
  .action(async options => {
    try { printOutput(await getClient(program.opts()).createCredential(readAdminInput<CreateCredentialRequest>(() => readInputJson(options.input ?? '-'))), program.opts().json); }
    catch (error) { handleError(error, program.opts().json); }
  });
credentialCommand.command('revoke <credential-id>').action(async credentialId => {
  try { printOutput(await getClient(program.opts()).revokeCredential(credentialId), program.opts().json); }
  catch (error) { handleError(error, program.opts().json); }
});
const membershipCommand = program.command('membership').description('显式空间成员管理');
membershipCommand.command('create <space-id>').option('--input <file>', 'JSON文件或 -；省略读取stdin')
  .action(async (spaceId, options) => {
    try { printOutput(await getClient(program.opts()).createMembership(spaceId, readAdminInput<CreateMembershipRequest>(() => readInputJson(options.input ?? '-'))), program.opts().json); }
    catch (error) { handleError(error, program.opts().json); }
  });
membershipCommand.command('patch <space-id> <actor-id>').option('--input <file>', 'JSON文件或 -；省略读取stdin')
  .action(async (spaceId, actorId, options) => {
    try { printOutput(await getClient(program.opts()).patchMembership(spaceId, actorId, readAdminInput<PatchMembershipRequest>(() => readInputJson(options.input ?? '-'))), program.opts().json); }
    catch (error) { handleError(error, program.opts().json); }
  });
membershipCommand.command('deactivate <space-id> <actor-id>').action(async (spaceId, actorId) => {
  try { printOutput(await getClient(program.opts()).deactivateMembership(spaceId, actorId), program.opts().json); }
  catch (error) { handleError(error, program.opts().json); }
});
program.command('redact <space-id>').description('显式脱敏帖子或附件；服务端授权与审计')
  .option('--input <file>', 'JSON文件或 -；省略读取stdin')
  .option('--request-key <key>', '显式幂等键')
  .option('--request-key-dir <dir>', '私有持久key目录；与logical-operation-id成对')
  .option('--logical-operation-id <id>', '同次操作恢复沿用；不同操作改ID')
  .action(async (spaceId, options) => {
    try {
      const input = readAdminInput<CreateRedactionRequest & {request_key?: string}>(() => readInputJson(options.input ?? '-'));
      const {client,writeOptions} = await getWriteContext(options, input);
      const key = options.requestKey ?? input.request_key;
      const {request_key, ...body} = input;
      printOutput(await client.redact(spaceId, body, key, writeOptions), program.opts().json);
    } catch (error) { handleError(error, program.opts().json); }
  });

const sessionCommand = program.command('session').description('显式客户端会话创建');
sessionCommand.command('create <space-id>').option('--input <file>', 'JSON文件或 -；省略stdin')
  .action(async (spaceId, options) => {
    try { printOutput((await getClient(program.opts()).createSession(spaceId, readAdminInput<CreateSessionRequest>(() => readInputJson(options.input ?? '-')))).data, program.opts().json); }
    catch (error) { handleError(error, program.opts().json); }
  });
const consumerCommand = program.command('consumer').description('显式消费者终止');
consumerCommand.command('deactivate <space-id> <consumer-id>').action(async (spaceId, consumerId) => {
  try { printOutput((await getClient(program.opts()).deactivateConsumer(spaceId, consumerId)).data, program.opts().json); }
  catch (error) { handleError(error, program.opts().json); }
});

const artifactCommand = program.command('artifact').description('附件上传、元数据与完整校验下载');
async function withArtifactSignal<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController(); const cancel = () => controller.abort();
  process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
  try { return await operation(controller.signal); }
  finally { process.off('SIGINT', cancel); process.off('SIGTERM', cancel); }
}
artifactCommand.command('upload <space-id> <file>')
  .option('--mime <type>', 'Blob MIME type', 'application/octet-stream')
  .option('--request-key <key>', '显式幂等键')
  .option('--request-key-dir <dir>', '私有持久request_key目录')
  .option('--logical-operation-id <id>', '稳定逻辑写入标识；与目录成对')
  .action(async (spaceId, file, options) => {
    try {
      const result = await withArtifactSignal(async signal => {
        const {client,writeOptions} = await getWriteContext(options, {});
        const blob = await readArtifactBlob(file, options.mime);
        return client.uploadArtifact(spaceId, blob, {}, options.requestKey, {...writeOptions,signal});
      });
      printOutput(result, program.opts().json);
    } catch (error) { handleError(error, program.opts().json); }
  });
artifactCommand.command('metadata <space-id> <artifact-id>')
  .action(async (spaceId, artifactId) => {
    try { printOutput(await withArtifactSignal(signal => getClient(program.opts()).getArtifact(spaceId, artifactId, {signal})), program.opts().json); }
    catch (error) { handleError(error, program.opts().json); }
  });
artifactCommand.command('download <space-id> <artifact-id>')
  .requiredOption('--output <new-file>', '不存在的新私有文件')
  .action(async (spaceId, artifactId, options) => {
    try {
      const summary = await withArtifactSignal(async signal => {
        const {metadata,bytes} = await getClient(program.opts()).downloadArtifact(spaceId, artifactId, {signal});
        await publishArtifactFile(options.output, bytes, signal);
        return {artifact_id:metadata.id,sha256:metadata.sha256,bytes:metadata.bytes,mime:metadata.mime};
      });
      printOutput(summary, program.opts().json);
    } catch (error) { handleError(error, program.opts().json); }
  });

const healthCommand = program.command('health').description('匿名最小健康检查');
for (const name of ['live', 'ready'] as const) {
  healthCommand.command(name).action(async () => {
    try {
      const client = getClient(program.opts());
      const result = name === 'live' ? await client.getLiveness() : await client.getReadiness();
      printOutput(result.data, program.opts().json);
    } catch (error) { handleError(error, program.opts().json); }
  });
}
program.command('view <space-id> <name>').description('读取知识视图')
  .action(async (spaceId, name) => {
    try {
      if (name !== 'findings' && name !== 'failures' && name !== 'open-questions') throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'view name 必须为 findings、failures 或 open-questions。', 400);
      printOutput((await getClient(program.opts()).getView(spaceId, name)).data, program.opts().json);
    } catch (error) { handleError(error, program.opts().json); }
  });

const spaceReadCommand = program.command('space').description('空间固定修订读取');
spaceReadCommand.command('create').option('--input <file>', 'JSON文件或 -；省略stdin')
  .option('--request-key <key>', '显式幂等键').option('--request-key-dir <dir>', '私有持久key目录').option('--logical-operation-id <id>', '与目录成对；恢复沿用')
  .action(async options => {
    try {
      const input = readAdminInput<CreateSpaceRequest & {request_key?:string}>(() => readInputJson(options.input ?? '-'));
      const {client,writeOptions} = await getWriteContext(options,input);
      const {request_key,...body} = input;
      printOutput((await client.createSpace(body, options.requestKey ?? request_key, writeOptions)).data, program.opts().json);
    } catch (error) { handleError(error, program.opts().json); }
  });
spaceReadCommand.command('patch <space-id>').option('--input <file>', 'JSON文件或 -；省略stdin')
  .option('--request-key <key>', '显式幂等键').option('--request-key-dir <dir>', '私有持久key目录').option('--logical-operation-id <id>', '与目录成对；恢复沿用')
  .action(async (spaceId,options) => {
    try {
      const input = readAdminInput<PatchSpaceRequest & {request_key?:string}>(() => readInputJson(options.input ?? '-'));
      const {client,writeOptions} = await getWriteContext(options,input);
      const {request_key,...body} = input;
      printOutput((await client.patchSpace(spaceId, body, options.requestKey ?? request_key, writeOptions)).data, program.opts().json);
    } catch (error) { handleError(error, program.opts().json); }
  });
spaceReadCommand.command('list').option('--limit <count>', '每页1–100', '20').option('--cursor <token>', '上一页next_cursor')
  .action(async options => {
    try { printOutput(await getClient(program.opts()).listSpaces(parsePageLimit(options.limit), options.cursor), program.opts().json); }
    catch (error) { handleError(error, program.opts().json); }
  });
spaceReadCommand.command('read <space-id>').description('按固定内容修订有界读取目标与规则')
  .requiredOption('--revision <n>', '显式内容修订号')
  .option('--max-bytes <n>', 'compact HTTP正文预算4096–65536', '12288')
  .option('--cursor <token>', '上一页meta.next_cursor')
  .action(async (spaceId, options) => {
    try {
      const page = await getClient(program.opts()).getSpaceRevision(spaceId, parseReadPositiveInteger(options.revision, 'revision'), { max_bytes: parseReadPositiveInteger(options.maxBytes, 'max-bytes'), cursor: options.cursor });
      printOutput(page, program.opts().json);
    } catch (err: any) { handleError(err, program.opts().json); }
  });

const postReadCommand = program.command('post').description('帖子固定修订内容读取');
postReadCommand.command('revisions <space-id> <post-id>').option('--limit <count>', '每页1–100', '20').option('--cursor <token>', '上一页next_cursor')
  .action(async (spaceId, postId, options) => {
    try { printOutput(await getClient(program.opts()).listPostRevisions(spaceId, postId, parsePageLimit(options.limit), options.cursor), program.opts().json); }
    catch (error) { handleError(error, program.opts().json); }
  });
postReadCommand.command('read <space-id> <post-id>').description('有界读取固定内容JSON片；拼接所有chunk后解析')
  .requiredOption('--revision <n>', '显式正安全整数内容修订号')
  .option('--max-bytes <n>', 'compact HTTP正文预算4096–65536', '12288')
  .option('--cursor <token>', '上一页meta.next_cursor；旧read post不支持预算/游标')
  .action(async (spaceId, postId, options) => {
    try {
      const page = await getClient(program.opts()).getPostRevisionContent(spaceId, postId,
        parseReadPositiveInteger(options.revision, 'revision'),
        { max_bytes: parseReadPositiveInteger(options.maxBytes, 'max-bytes'), cursor: options.cursor });
      printOutput(page, program.opts().json);
    } catch (err: any) { handleError(err, program.opts().json); }
  });

const threadCommand = program.command('thread').description('主题目录读取');
threadCommand.command('patch <space-id> <thread-id>').option('--input <file>', 'JSON文件或 -；省略stdin')
  .option('--request-key <key>', '显式幂等键').option('--request-key-dir <dir>', '私有持久key目录').option('--logical-operation-id <id>', '与目录成对；恢复沿用')
  .action(async (spaceId,threadId,options) => {
    try {
      const input = readAdminInput<PatchThreadRequest & {request_key?:string}>(() => readInputJson(options.input ?? '-'));
      const {client,writeOptions} = await getWriteContext(options,input);
      const {request_key,...body} = input;
      printOutput((await client.patchThread(spaceId, threadId, body, options.requestKey ?? request_key, writeOptions)).data, program.opts().json);
    } catch (error) { handleError(error, program.opts().json); }
  });
threadCommand.command('list <space-id>').option('--state <state>', 'open 或 archived').option('--limit <count>', '每页1–100', '20').option('--cursor <token>', '上一页next_cursor')
  .action(async (spaceId, options) => {
    try {
      const limit = parsePageLimit(options.limit);
      if (options.state !== undefined && options.state !== 'open' && options.state !== 'archived') throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'state 必须为 open 或 archived。', 400);
      printOutput(await getClient(program.opts()).listThreads(spaceId, options.state, limit, options.cursor), program.opts().json);
    } catch (error) { handleError(error, program.opts().json); }
  });
threadCommand.command('posts <space-id> <thread-id>')
  .description('有界帖子元数据目录；整页data/meta，不含正文；旧read thread仅默认首批')
  .option('--limit <count>', '每页最多帖子数1..100（默认50）')
  .option('--max-bytes <bytes>', 'compact envelope预算4096..65536（默认12288）')
  .option('--sort <sort>', 'id_asc（默认）或created_at_asc（记录创建时间，未知历史时间末尾）')
  .option('--cursor <token>', '上一页签名next_cursor；跨页目录动态变化')
  .action(async (spaceId, threadId, options) => {
    try {
      const page = await getClient(program.opts()).getThreadPosts(spaceId, threadId, {
        limit: options.limit === undefined ? undefined : parseReadPositiveInteger(options.limit, 'limit'),
        max_bytes: options.maxBytes === undefined ? undefined : parseReadPositiveInteger(options.maxBytes, 'max-bytes'), cursor: options.cursor, sort: options.sort,
      });
      printOutput(page, program.opts().json);
    } catch (err: any) { handleError(err, program.opts().json); }
  });

// Forum commands
program
  .command('context')
  .description('获取空间限长上下文')
  .requiredOption('--space <space_id>', '空间 ID')
  .option('--max-bytes <bytes>', '最大字节数', '12288')
  .option('--focus-thread <thread_id>', '聚焦同空间可读主题；省略保持空间上下文，整page保留focus_thread与meta')
  .action(async (options) => {
    try {
      const client = getClient(program.opts());
      const res = await client.getContext(options.space, {
        max_bytes: parseReadPositiveInteger(options.maxBytes, 'max-bytes'),
        focus_thread_id: options.focusThread,
      });
      printOutput(res, program.opts().json);
    } catch (err: any) {
      handleError(err, program.opts().json);
    }
  });

program
  .command('search')
  .description('在空间可见内容中搜索')
  .requiredOption('--space <space_id>', '空间 ID')
  .requiredOption('--query <q>', '搜索关键词')
  .option('--kind <kind>', '过滤帖子类型')
  .option('--tags <tags>', '过滤标签（逗号分隔）')
  .option('--limit <limit>', '限制返回条数', '20')
  .option('--page', '输出完整搜索page与next_cursor')
  .option('--cursor <token>', '同过滤条件继续搜索；输出完整page')
  .option('--thread <thread-id>', '过滤主题')
  .action(async (options) => {
    try {
      const limit = parsePageLimit(options.limit);
      const client = getClient(program.opts());
      const res = await client.search(options.space, {
        q: options.query,
        kind: options.kind,
        tags: options.tags ? options.tags.split(',') : undefined,
        limit, cursor: options.cursor, thread_id: options.thread,
      });
      printOutput(options.page || options.cursor !== undefined ? res : res.data, program.opts().json);
    } catch (err: any) {
      handleError(err, program.opts().json);
    }
  });

program
  .command('read')
  .description('读取帖子或主题')
  .requiredOption('--space <space_id>', '空间 ID')
  .requiredOption('--kind <kind>', '类型 (thread / post)')
  .requiredOption('--id <id>', '对象 ID')
  .option('--revision <rev>', '修订号')
  .action(async (options) => {
    try {
      const client = getClient(program.opts());
      if (options.kind === 'post') {
        const rev = options.revision ? parseInt(options.revision, 10) : undefined;
        const res = await client.getPost(options.space, options.id, rev);
        printOutput(res.data, program.opts().json);
      } else if (options.kind === 'thread') {
        const res = await client.getThread(options.space, options.id);
        printOutput(res.data, program.opts().json);
      } else {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'kind 仅支持 post 或 thread', 400);
      }
    } catch (err: any) {
      handleError(err, program.opts().json);
    }
  });

program
  .command('publish')
  .description('发布主题、帖子、修订或撤回')
  .requiredOption('--space <space_id>', '空间 ID')
  .requiredOption('--op <op>', '操作 (thread / post / revision / withdraw)')
  .option('--request-key <key>', '幂等键')
  .option('--request-key-dir <dir>', '显式私有 request_key 持久目录（需 logical-operation-id）')
  .option('--logical-operation-id <id>', '稳定逻辑操作 ID，重试沿用，有意新写使用新 ID')
  .option('--input <file>', '输入 JSON 文件路径或 - (stdin)')
  .action(async (options) => {
    try {
      const input = readAdminInput<Record<string, any>>(() => readInputJson(options.input));
      const { client, writeOptions } = await getWriteContext(options, input);
      const reqKey = options.requestKey ?? input.request_key;

      if (options.op === 'thread') {
        const { request_key, ...payload } = input;
        const res = await client.createThread(options.space, payload as Parameters<DetunedClient['createThread']>[1], reqKey, writeOptions);
        printOutput(res.data, program.opts().json);
      } else if (options.op === 'post') {
        const { thread_id, request_key, ...payload } = input;
        if (!thread_id) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少 thread_id', 400);
        const res = await client.createPost(options.space, thread_id, payload as Parameters<DetunedClient['createPost']>[2], reqKey, writeOptions);
        printOutput(res.data, program.opts().json);
      } else if (options.op === 'revision') {
        const { post_id, request_key, ...payload } = input;
        if (!post_id) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少 post_id', 400);
        const res = await client.createPostRevision(options.space, post_id, payload as Parameters<DetunedClient['createPostRevision']>[2], reqKey, writeOptions);
        printOutput(res.data, program.opts().json);
      } else if (options.op === 'withdraw') {
        const { post_id, request_key, ...payload } = input;
        if (!post_id) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少 post_id', 400);
        const res = await client.withdrawPost(options.space, post_id, payload as Parameters<DetunedClient['withdrawPost']>[2], reqKey, writeOptions);
        printOutput(res.data, program.opts().json);
      } else {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '不支持的操作。', 400);
      }
    } catch (err: any) {
      handleError(err, program.opts().json);
    }
  });

program
  .command('relate')
  .description('创建或解决/重开关系')
  .requiredOption('--space <space_id>', '空间 ID')
  .requiredOption('--op <op>', '操作 (create / resolve / reopen)')
  .option('--request-key <key>', '幂等键')
  .option('--request-key-dir <dir>', '显式私有 request_key 持久目录（需 logical-operation-id）')
  .option('--logical-operation-id <id>', '稳定逻辑操作 ID，重试沿用，有意新写使用新 ID')
  .option('--input <file>', '输入 JSON 文件路径或 - (stdin)')
  .action(async (options) => {
    try {
      const input = readAdminInput<Record<string, any>>(() => readInputJson(options.input));
      const { client, writeOptions } = await getWriteContext(options, input);
      const reqKey = options.requestKey ?? input.request_key;

      if (options.op === 'create') {
        const { request_key, ...payload } = input;
        const res = await client.createRelation(options.space, payload as Parameters<DetunedClient['createRelation']>[1], reqKey, writeOptions);
        printOutput(res.data, program.opts().json);
      } else if (options.op === 'resolve') {
        const { relation_id, request_key, expected_version, reason_ref } = input;
        if (!relation_id) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少 relation_id', 400);
        const res = await client.resolveRelation(
          options.space,
          relation_id,
          expected_version,
          reason_ref,
          reqKey,
          writeOptions
        );
        printOutput(res.data, program.opts().json);
      } else if (options.op === 'reopen') {
        const { relation_id, request_key, expected_version, reason_ref } = input;
        if (!relation_id) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少 relation_id', 400);
        const res = await client.reopenRelation(
          options.space,
          relation_id,
          expected_version,
          reason_ref,
          reqKey,
          writeOptions
        );
        printOutput(res.data, program.opts().json);
      } else {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '不支持的操作。', 400);
      }
    } catch (err: any) {
      handleError(err, program.opts().json);
    }
  });

program
  .command('subscribe')
  .description('创建持久订阅与消费者')
  .requiredOption('--space <space_id>', '空间 ID')
  .requiredOption('--consumer-key <key>', '消费者 Key')
  .option('--start <start>', '开始位置 beginning/now/context_checkpoint；checkpoint省略start自动选context_checkpoint')
  .option('--thread <thread-id>', '可重复主题过滤', (value: string, prior: string[]) => [...prior,value], [])
  .option('--event-type <event-type>', '可重复事件类型过滤', (value: string, prior: string[]) => [...prior,value], [])
  .option('--checkpoint-token <token>', 'context checkpoint token；显式start冲突由统一服务规则拒绝')
  .option('--request-key <key>', '兼容转发；订阅复用依据consumer-key与filters')
  .action(async (options) => {
    try {
      const client = getClient(program.opts());
      const res = await client.subscribe(
        options.space,
        {
          consumer_key: options.consumerKey,
          start: options.start ?? (options.checkpointToken !== undefined ? 'context_checkpoint' : 'beginning'),
          thread_ids: options.thread, event_types: options.eventType, checkpoint_token: options.checkpointToken,
        },
        options.requestKey
      );
      printOutput(res.data, program.opts().json);
    } catch (err: any) {
      handleError(err, program.opts().json);
    }
  });

program
  .command('poll')
  .description('拉取未读事件批次')
  .requiredOption('--space <space_id>', '空间 ID')
  .requiredOption('--consumer-id <id>', '消费者 ID')
  .option('--limit <limit>', '限制返回条数', '20')
  .option('--wait-ms <n>', '0–25000整数；默认0，不承诺命令总25秒', '0')
  .action(async (options) => {
    try {
      const limit = parsePageLimit(options.limit); const wait_ms = parsePollWait(options.waitMs);
      const client = getClient(program.opts());
      const res = await client.poll(options.space, options.consumerId, {
        limit, wait_ms,
      });
      printOutput(res.data, program.opts().json);
    } catch (err: any) {
      handleError(err, program.opts().json);
    }
  });

program
  .command('ack')
  .description('确认已消费事件批次')
  .requiredOption('--space <space_id>', '空间 ID')
  .requiredOption('--consumer-id <id>', '消费者 ID')
  .requiredOption('--batch-id <id>', '批次 ID')
  .requiredOption('--next-cursor <cursor>', '游标')
  .action(async (options) => {
    try {
      const client = getClient(program.opts());
      const res = await client.ack(options.space, options.consumerId, {
        batch_id: options.batchId,
        next_cursor: options.nextCursor,
      });
      printOutput(res.data, program.opts().json);
    } catch (err: any) {
      handleError(err, program.opts().json);
    }
  });

void program.parseAsync(process.argv).catch((error: unknown) => {
  const code = error instanceof Error && 'code' in error ? error.code : undefined;
  if(code === 'commander.helpDisplayed' || code === 'commander.version') return;
  let json = false;
  try { json = diagnosticJsonMode(program, process.argv.slice(2)); } catch {}
  handleError(parserError(), json);
});
