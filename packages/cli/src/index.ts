#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { DetunedClient } from '@detuned/client';
import { DetunedError, ErrorCode } from '@detuned/protocol';
import { SqliteStorage, bootstrapDatabase, isDatabaseInitialized, DirectoryLock } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';

function mapExitCode(err: any): number {
  if (err instanceof DetunedError) {
    if (err.code === ErrorCode.VALIDATION_ERROR || err.code === ErrorCode.PAYLOAD_TOO_LARGE) {
      return 2;
    }
    if (err.code === ErrorCode.UNAUTHENTICATED || err.code === ErrorCode.FORBIDDEN) {
      return 3;
    }
    if (
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
  if (jsonOnly) {
    process.stdout.write(
      JSON.stringify(
        {
          api_version: '1',
          error: {
            code: err.code ?? 'UNKNOWN_ERROR',
            message: err.message,
            details: err.details,
          },
        },
        null,
        2
      ) + '\n'
    );
  } else {
    process.stderr.write(`[Detuned Error] (${err.code ?? 'ERROR'}): ${err.message}\n`);
    if (err.details) {
      process.stderr.write(JSON.stringify(err.details, null, 2) + '\n');
    }
  }
  process.exit(exitCode);
}

function getClient(cmdOpts: any): DetunedClient {
  const baseUrl = cmdOpts.url ?? process.env.DETUNED_BASE_URL ?? 'http://127.0.0.1:3000';
  let token = cmdOpts.token ?? process.env.DETUNED_TOKEN;
  if (!token && process.env.DETUNED_TOKEN_FILE) {
    try {
      token = fs.readFileSync(process.env.DETUNED_TOKEN_FILE, 'utf8').trim();
    } catch {
      // ignore
    }
  }
  return new DetunedClient({ baseUrl, token });
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

const program = new Command();
program
  .name('detuned')
  .description('Detuned: 面向 Coding Agent 的持久化协作论坛 CLI')
  .version('0.1.0')
  .option('--url <url>', 'Detuned 服务地址')
  .option('--token <token>', '认证 Token')
  .option('--json', '仅输出 JSON 格式到 stdout');

// Server management
program
  .command('init')
  .description('初始化本地 SQLite 数据库与数据目录')
  .option('--data-dir <dir>', '数据目录路径', './data')
  .action((options) => {
    try {
      const dataDir = path.resolve(options.dataDir);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const lock = new DirectoryLock(dataDir);
      lock.acquire();
      try {
        const dbPath = path.join(dataDir, 'detuned.sqlite');
        const db = new Database(dbPath);
        const res = bootstrapDatabase(db);
        db.close();

        printOutput({
          success: true,
          data_dir: dataDir,
          db_path: dbPath,
          is_new_instance: res.isNewInstance,
          admin_actor_id: res.adminActorId,
          admin_token: res.adminToken,
        }, program.opts().json);
      } finally {
        lock.release();
      }
    } catch (err: any) {
      handleError(err, program.opts().json);
    }
  });

program
  .command('serve')
  .description('启动 Detuned HTTP 服务')
  .option('--data-dir <dir>', '数据目录路径', './data')
  .option('--port <port>', '监听端口', '3000')
  .option('--host <host>', '监听地址', '127.0.0.1')
  .action(async (options) => {
    const dataDir = path.resolve(options.dataDir);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const lock = new DirectoryLock(dataDir);
    lock.acquire();

    const dbPath = path.join(dataDir, 'detuned.sqlite');
    if (!fs.existsSync(dbPath)) {
      lock.release();
      handleError(
        new DetunedError(
          ErrorCode.NOT_FOUND,
          `数据库文件不存在: ${dbPath}。请先执行 "detuned init --data-dir ${dataDir}" 完成初始化。`,
          404
        ),
        program.opts().json
      );
      return;
    }

    const db = new Database(dbPath);
    if (!isDatabaseInitialized(db)) {
      db.close();
      lock.release();
      handleError(
        new DetunedError(
          ErrorCode.FORBIDDEN,
          `数据库尚未初始化。请先执行 "detuned init --data-dir ${dataDir}" 完成初始化。`,
          403
        ),
        program.opts().json
      );
      return;
    }

    const storage = new SqliteStorage(db);
    const app = buildApp({ storage });
    const port = parseInt(options.port, 10);
    const host = options.host;

    let isShuttingDown = false;
    const shutdown = async () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      try {
        await app.close();
      } catch {}
      try {
        db.close();
      } catch {}
      try {
        lock.release();
      } catch {}
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    await app.listen({ port, host });
    process.stderr.write(`Detuned 服务已启动: http://${host}:${port}\n数据目录: ${dataDir}\n`);
  });

// Forum commands
program
  .command('context')
  .description('获取空间限长上下文')
  .requiredOption('--space <space_id>', '空间 ID')
  .option('--max-bytes <bytes>', '最大字节数', '12288')
  .option('--focus-thread <thread_id>', '聚焦的主题 ID')
  .action(async (options) => {
    try {
      const client = getClient(program.opts());
      const res = await client.getContext(options.space, {
        max_bytes: parseInt(options.maxBytes, 10),
        focus_thread_id: options.focusThread,
      });
      printOutput(res.data, program.opts().json);
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
  .action(async (options) => {
    try {
      const client = getClient(program.opts());
      const res = await client.search(options.space, {
        q: options.query,
        kind: options.kind,
        tags: options.tags ? options.tags.split(',') : undefined,
        limit: parseInt(options.limit, 10),
      });
      printOutput(res.data, program.opts().json);
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
  .option('--input <file>', '输入 JSON 文件路径或 - (stdin)')
  .action(async (options) => {
    try {
      const client = getClient(program.opts());
      const input = readInputJson(options.input);
      const reqKey = options.requestKey ?? input.request_key;

      if (options.op === 'thread') {
        const { request_key, ...payload } = input;
        const res = await client.createThread(options.space, payload, reqKey);
        printOutput(res.data, program.opts().json);
      } else if (options.op === 'post') {
        const { thread_id, request_key, ...payload } = input;
        if (!thread_id) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少 thread_id', 400);
        const res = await client.createPost(options.space, thread_id, payload, reqKey);
        printOutput(res.data, program.opts().json);
      } else if (options.op === 'revision') {
        const { post_id, request_key, ...payload } = input;
        if (!post_id) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少 post_id', 400);
        const res = await client.createPostRevision(options.space, post_id, payload, reqKey);
        printOutput(res.data, program.opts().json);
      } else if (options.op === 'withdraw') {
        const { post_id, request_key, ...payload } = input;
        if (!post_id) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少 post_id', 400);
        const res = await client.withdrawPost(options.space, post_id, payload, reqKey);
        printOutput(res.data, program.opts().json);
      } else {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, `未知 op: ${options.op}`, 400);
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
  .option('--input <file>', '输入 JSON 文件路径或 - (stdin)')
  .action(async (options) => {
    try {
      const client = getClient(program.opts());
      const input = readInputJson(options.input);
      const reqKey = options.requestKey ?? input.request_key;

      if (options.op === 'create') {
        const { request_key, ...payload } = input;
        const res = await client.createRelation(options.space, payload, reqKey);
        printOutput(res.data, program.opts().json);
      } else if (options.op === 'resolve') {
        const { relation_id, request_key, expected_version, reason_ref } = input;
        if (!relation_id) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '缺少 relation_id', 400);
        const res = await client.resolveRelation(
          options.space,
          relation_id,
          expected_version,
          reason_ref,
          reqKey
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
          reqKey
        );
        printOutput(res.data, program.opts().json);
      } else {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, `未知 op: ${options.op}`, 400);
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
  .option('--start <start>', '开始位置 (beginning / now / context_checkpoint)', 'beginning')
  .option('--request-key <key>', '幂等键')
  .action(async (options) => {
    try {
      const client = getClient(program.opts());
      const res = await client.subscribe(
        options.space,
        {
          consumer_key: options.consumerKey,
          start: options.start,
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
  .action(async (options) => {
    try {
      const client = getClient(program.opts());
      const res = await client.poll(options.space, options.consumerId, {
        limit: parseInt(options.limit, 10),
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

program.parse(process.argv);
