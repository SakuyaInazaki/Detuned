import { randomBytes, createHash } from 'node:crypto';
import { DetunedError, ErrorCode } from '@detuned/protocol';
import { validateResultRef, validateResultRefSemantics, hasForbiddenContent, parseOperation, validateStoredResultRefPrecheck, normalizeLegacyResultRef, } from '@detuned/core';
import { SqliteStorage } from './sqlite-storage.js';
import { SCHEMA_SQL, SCHEMA_MIGRATIONS_DDL, INSTANCE_METADATA_DDL, THREAD_VERSIONS_DDL, V2_SCHEMA_TABLES, V1_SCHEMA_TABLES, verifyTableStructure, verifyDatabaseStructure, } from './schema.js';
export const CURRENT_SCHEMA_VERSION = 2;
export function classifyDatabase(db) {
    const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all()
        .map((r) => r.name);
    // 1. Blank database: 0 user tables
    if (tables.length === 0) {
        return { kind: 'blank' };
    }
    const tableSet = new Set(tables);
    // 2. Check for unknown tables (G05)
    const knownTables = new Set([
        ...Object.keys(V2_SCHEMA_TABLES),
        'post_fts',
        'post_fts_data',
        'post_fts_idx',
        'post_fts_content',
        'post_fts_docsize',
        'post_fts_config',
    ]);
    const unknownTables = tables.filter((t) => !knownTables.has(t));
    if (unknownTables.length > 0) {
        return {
            kind: 'unknown',
            reason: `数据库包含未知或不受支持的非空表: ${unknownTables.join(', ')}。`,
        };
    }
    // 3. Check schema_migrations if present
    let appliedVersions = [];
    if (tableSet.has('schema_migrations')) {
        const migCheck = verifyTableStructure(db, 'schema_migrations', V2_SCHEMA_TABLES['schema_migrations']);
        if (!migCheck.valid) {
            return { kind: 'corrupt', reason: `表 schema_migrations 结构损坏: ${migCheck.reason}` };
        }
        const appliedRows = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all();
        appliedVersions = appliedRows.map((r) => r.version);
        if (appliedVersions.some((v) => typeof v !== 'number' || v <= 0)) {
            return { kind: 'corrupt', reason: '数据库迁移记录包含非法版本号。' };
        }
        const maxVerRow = db.prepare('SELECT max(version) AS max_v FROM schema_migrations').get();
        if (typeof maxVerRow?.max_v === 'number' && maxVerRow.max_v > CURRENT_SCHEMA_VERSION) {
            return { kind: 'future', maxVersion: maxVerRow.max_v };
        }
        // Contradictory migration markers (H04)
        if (appliedVersions.includes(2) && !appliedVersions.includes(1)) {
            return {
                kind: 'corrupt',
                reason: '数据库迁移记录不连续（存在版本 2 但缺失版本 1）。',
            };
        }
    }
    // 4. Check unpopulated schema (appliedVersions.length === 0)
    if (appliedVersions.length === 0) {
        const hasAllV2 = Object.keys(V2_SCHEMA_TABLES).every((t) => tableSet.has(t));
        const hasAllV1 = Object.keys(V1_SCHEMA_TABLES).every((t) => tableSet.has(t));
        // Reject databases with initialization metadata but no migration records (Y02)
        if (tableSet.has('instance_metadata')) {
            const metaCount = db.prepare('SELECT count(*) AS n FROM instance_metadata').get()?.n ?? 0;
            if (metaCount > 0) {
                return {
                    kind: 'corrupt',
                    reason: '数据库包含持久化初始化材料（instance_metadata）但缺失迁移记录与管理员主体。',
                };
            }
        }
        // Check all Detuned core user tables for any existing data
        const userTables = [
            'spaces', 'threads', 'thread_versions', 'posts', 'post_revisions',
            'actors', 'credentials', 'relations', 'relation_resolutions',
            'decisions', 'evidence', 'idempotency_records', 'idempotency_markers',
            'events', 'event_batches', 'consumers', 'redactions', 'memberships',
            'sessions', 'space_revisions'
        ].filter((t) => tableSet.has(t));
        if (userTables.length > 0) {
            const parts = userTables.map((t) => `(SELECT count(*) FROM "${t}")`).join(' + ');
            const anyData = db.prepare(`SELECT ${parts} AS n`).get();
            if (anyData && anyData.n > 0) {
                return { kind: 'corrupt', reason: '数据库包含业务数据但未完成初始化。' };
            }
        }
        if (hasAllV2) {
            const struct = verifyDatabaseStructure(db, 2);
            if (struct.valid) {
                return { kind: 'blank' };
            }
            return { kind: 'corrupt', reason: struct.reason };
        }
        if (hasAllV1 && !tableSet.has('thread_versions') && !tableSet.has('instance_metadata')) {
            const struct = verifyDatabaseStructure(db, 1);
            if (struct.valid) {
                return { kind: 'blank' };
            }
            return { kind: 'corrupt', reason: struct.reason };
        }
        // If only partial tables exist (e.g. 5 tables), it is damaged
        return {
            kind: 'corrupt',
            reason: `数据库结构不完整，缺少必需表。`,
        };
    }
    // Check contradiction between v2 structure and migration records (Y03)
    if (!appliedVersions.includes(2) && tableSet.has('thread_versions')) {
        return {
            kind: 'corrupt',
            reason: '数据库结构与迁移记录矛盾（包含 v2 的 thread_versions 表但缺失版本 2 迁移记录）。',
        };
    }
    // 5. Target is v2 (appliedVersions includes 2)
    if (appliedVersions.includes(2)) {
        const v2Struct = verifyDatabaseStructure(db, 2);
        if (!v2Struct.valid) {
            return {
                kind: 'corrupt',
                reason: `当前版本数据库结构损坏: ${v2Struct.reason}`,
            };
        }
        const initRow = db.prepare("SELECT value FROM instance_metadata WHERE key = 'initialized'").get();
        const isInit = initRow?.value === 'true';
        const secretRow = db.prepare("SELECT value FROM instance_metadata WHERE key = 'token_secret'").get();
        const hasTokenSecret = Boolean(secretRow?.value && typeof secretRow.value === 'string' && secretRow.value.trim() !== '');
        if (!isInit || !hasTokenSecret) {
            return {
                kind: 'corrupt',
                reason: '当前版本数据库缺少 token_secret 或未正常完成初始化。',
            };
        }
        const humanAdmin = db.prepare("SELECT 1 FROM actors WHERE kind = 'human' LIMIT 1").get();
        if (!humanAdmin) {
            return {
                kind: 'corrupt',
                reason: '当前版本数据库缺少管理员主体。',
            };
        }
        return { kind: 'current_initialized' };
    }
    // 6. Target is v1
    const v1Struct = verifyDatabaseStructure(db, 1);
    if (!v1Struct.valid) {
        return {
            kind: 'corrupt',
            reason: `旧版本数据库结构损坏: ${v1Struct.reason}`,
        };
    }
    if (tableSet.has('instance_metadata')) {
        const secretRow = db.prepare("SELECT value FROM instance_metadata WHERE key = 'token_secret'").get();
        if (secretRow && (!secretRow.value || typeof secretRow.value !== 'string' || secretRow.value.trim() === '')) {
            return {
                kind: 'corrupt',
                reason: '实例持久密钥缺失或损坏。',
            };
        }
    }
    const humanAdmin = db.prepare("SELECT 1 FROM actors WHERE kind = 'human' LIMIT 1").get();
    if (humanAdmin) {
        const maxV = appliedVersions.length > 0 ? Math.max(...appliedVersions) : 1;
        return { kind: 'supported_legacy', maxVersion: maxV };
    }
    return {
        kind: 'corrupt',
        reason: '数据库结构缺少管理员主体。',
    };
}
export function isDatabaseInitialized(db) {
    try {
        const classification = classifyDatabase(db);
        return classification.kind === 'current_initialized';
    }
    catch {
        return false;
    }
}
function syncThreadVersion(db, threadId, version, title, state, updatedAt, createdAt) {
    if (!title)
        return;
    const existing = db
        .prepare('SELECT title, state, created_at FROM thread_versions WHERE thread_id = ? AND version = ?')
        .get(threadId, version);
    if (version === 1) {
        if (createdAt && updatedAt && createdAt !== updatedAt) {
            throw new Error(`历史主题版本创建时间与更新时间冲突 (thread_id=${threadId}, version=${version})`);
        }
    }
    // Determine legitimate version timestamp:
    // For version === 1: birth of thread, use createdAt ?? updatedAt
    // For version > 1: patch of thread, ONLY updatedAt is valid. NEVER borrow createdAt!
    let versionTime;
    if (version === 1) {
        versionTime = createdAt ?? updatedAt;
    }
    else {
        versionTime = updatedAt;
    }
    const thd = db
        .prepare('SELECT updated_at, created_at, version, title, state FROM threads WHERE id = ?')
        .get(threadId);
    if (thd) {
        if (version === 1) {
            if (createdAt && thd.created_at && createdAt !== thd.created_at) {
                throw new Error(`历史主题版本创建时间与主题记录冲突 (thread_id=${threadId}, version=${version})`);
            }
            if (updatedAt && thd.created_at && updatedAt !== thd.created_at) {
                throw new Error(`历史主题版本更新时间与主题记录冲突 (thread_id=${threadId}, version=${version})`);
            }
        }
        else if (thd.version === version) {
            if (updatedAt && thd.updated_at && updatedAt !== thd.updated_at) {
                throw new Error(`历史主题版本更新时间与主题记录冲突 (thread_id=${threadId}, version=${version})`);
            }
        }
    }
    if (!existing) {
        if (!versionTime) {
            if (thd && thd.version === version) {
                if (version === 1) {
                    versionTime = thd.created_at ?? thd.updated_at;
                }
                else {
                    versionTime = thd.updated_at;
                }
            }
        }
        if (!versionTime) {
            throw new Error(`历史主题版本缺少合法时间戳且无法证实 (thread_id=${threadId}, version=${version})`);
        }
        db.prepare('INSERT INTO thread_versions (thread_id, version, title, state, created_at) VALUES (?, ?, ?, ?, ?)').run(threadId, version, title, state, versionTime);
    }
    else {
        // If existing snapshot already exists, verify consistency
        if (existing.title !== title || existing.state !== state) {
            throw new Error(`历史主题版本数据冲突 (thread_id=${threadId}, version=${version})`);
        }
        if (version === 1) {
            if (createdAt && existing.created_at !== createdAt) {
                throw new Error(`历史主题版本数据冲突 (thread_id=${threadId}, version=${version})`);
            }
            if (updatedAt && existing.created_at !== updatedAt) {
                throw new Error(`历史主题版本数据冲突 (thread_id=${threadId}, version=${version})`);
            }
        }
        else {
            if (updatedAt && existing.created_at !== updatedAt) {
                throw new Error(`历史主题版本数据冲突 (thread_id=${threadId}, version=${version})`);
            }
        }
    }
}
function migrateSingleRef(db, operation, resultRefStr, key, spaceId) {
    // Parsing errors are NOT caught here; let SyntaxError propagate and abort migration (G04)
    let parsed;
    try {
        parsed = JSON.parse(resultRefStr);
    }
    catch {
        throw new Error(`幂等记录数据损坏，无法解析 JSON (op=${operation}, key=${key})`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`幂等记录数据损坏，非对象格式 (op=${operation}, key=${key})`);
    }
    // Version guard (H05)
    if (parsed.v !== undefined && parsed.v !== 1) {
        throw new Error(`不支持的引用版本或未来版本引用 (op=${operation}, key=${key}, v=${parsed.v})`);
    }
    // Already new typed format
    if (parsed.v === 1) {
        if (hasForbiddenContent(parsed)) {
            throw new Error(`已存在的 v1 幂等引用包含非法的正文或摘要缓存 (op=${operation}, key=${key})`);
        }
        const parsedOp = parseOperation(operation);
        if (parsed.kind === 'unreplayable') {
            if (parsed.op === parsedOp.family && parsedOp.targetId) {
                parsed.op = operation;
                resultRefStr = JSON.stringify(parsed);
            }
            try {
                validateResultRef(operation, parsed);
            }
            catch (err) {
                throw new Error(`已存在的 v1 幂等引用格式不合法 (op=${operation}, key=${key}): ${err.message}`);
            }
            return resultRefStr;
        }
        // 1. Strict precheck: validates required fields, target bindings, whitelist, entity existence BEFORE any degradation
        try {
            validateStoredResultRefPrecheck(new SqliteStorage(db), operation, spaceId, parsed);
        }
        catch (err) {
            throw new Error(`已存在的 v1 幂等引用格式或实体绑定不合法 (op=${operation}, key=${key}): ${err.message}`);
        }
        // 2. Legitimate older v1 shapes conversion to unreplayable:
        // 2a. If it's relation.create but missing version or state from older v1 variant
        if (parsed.kind === 'relation.create' &&
            typeof parsed.relation_id === 'string' &&
            (parsed.relation_version === undefined || parsed.relation_state === undefined)) {
            const ref = {
                v: 1,
                kind: 'unreplayable',
                op: operation,
                reason: 'historical_relation_version_unrecoverable',
            };
            validateResultRef(operation, ref);
            return JSON.stringify(ref);
        }
        // 2b. If v1 post or thread.create only has relation_ids without relations snapshot, convert to unreplayable
        if ((parsed.kind === 'post' || parsed.kind === 'thread.create') &&
            Array.isArray(parsed.relation_ids) &&
            parsed.relation_ids.length > 0 &&
            (!Array.isArray(parsed.relations) || parsed.relations.length === 0)) {
            const unrep = {
                v: 1,
                kind: 'unreplayable',
                op: operation,
                reason: 'historical_relation_version_unrecoverable',
            };
            validateResultRef(operation, unrep);
            return JSON.stringify(unrep);
        }
        // 2c. If v1 thread.patch or thread.create historical version is unrecoverable, convert to unreplayable
        if (parsed.kind === 'thread.patch' || parsed.kind === 'thread.create') {
            const threadRow = db.prepare('SELECT space_id, version FROM threads WHERE id = ?').get(parsed.thread_id);
            const snap = db
                .prepare('SELECT 1 FROM thread_versions WHERE thread_id = ? AND version = ?')
                .get(parsed.thread_id, parsed.thread_version);
            if (!snap && threadRow && threadRow.version !== parsed.thread_version) {
                const unrep = {
                    v: 1,
                    kind: 'unreplayable',
                    op: operation,
                    reason: 'historical_thread_version_unrecoverable',
                };
                validateResultRef(operation, unrep);
                return JSON.stringify(unrep);
            }
        }
        // 3. Strict runtime and semantic validation
        try {
            validateResultRef(operation, parsed);
        }
        catch (err) {
            throw new Error(`已存在的 v1 幂等引用格式不合法 (op=${operation}, key=${key}): ${err.message}`);
        }
        try {
            validateResultRefSemantics(new SqliteStorage(db), operation, spaceId, parsed);
        }
        catch (err) {
            throw new Error(`已存在的 v1 幂等引用语义或引用完整性校验失败 (op=${operation}, key=${key}): ${err.message}`);
        }
        return resultRefStr;
    }
    // Legacy records (v !== 1):
    // Sync historical thread versions if title/thread is provided
    if (parsed.thread && parsed.thread.id) {
        const threadId = parsed.thread.id;
        const version = parsed.thread.version ?? 1;
        const title = parsed.thread.title;
        const state = parsed.thread.state ?? 'open';
        const createdAt = parsed.thread.created_at;
        const updatedAt = parsed.thread.updated_at;
        if (parsed.thread.space_id && parsed.thread.space_id !== spaceId) {
            throw new Error(`历史主题所属空间不匹配 (thread_id=${threadId}, space_id=${spaceId})`);
        }
        syncThreadVersion(db, threadId, version, title, state, updatedAt, createdAt);
    }
    else if (parsed.$ref === 'thread' || (parsed.id && parsed.space_id && parsed.title)) {
        const threadId = parsed.thread_id ?? parsed.id;
        const version = parsed.thread_version ?? parsed.version ?? 1;
        const title = parsed.title;
        const state = parsed.state ?? 'open';
        const createdAt = parsed.created_at;
        const updatedAt = parsed.updated_at;
        if (parsed.space_id && parsed.space_id !== spaceId) {
            throw new Error(`历史主题所属空间不匹配 (thread_id=${threadId}, space_id=${spaceId})`);
        }
        syncThreadVersion(db, threadId, version, title, state, updatedAt, createdAt);
    }
    // Normalize legacy reference using unified core normalizer
    let normRef;
    try {
        normRef = normalizeLegacyResultRef(new SqliteStorage(db), operation, parsed, spaceId);
    }
    catch (err) {
        throw new Error(`历史幂等记录规范化失败 (op=${operation}, key=${key}): ${err.message}`);
    }
    try {
        validateResultRef(operation, normRef);
    }
    catch (err) {
        throw new Error(`历史幂等记录规范化后格式不合法 (op=${operation}, key=${key}): ${err.message}`);
    }
    try {
        validateResultRefSemantics(new SqliteStorage(db), operation, spaceId, normRef);
    }
    catch (err) {
        throw new Error(`历史幂等记录语义校验失败 (op=${operation}, key=${key}): ${err.message}`);
    }
    return JSON.stringify(normRef);
}
export function migrateIdempotencyRecords(db) {
    const hasTable = db
        .prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name='idempotency_records'")
        .get();
    if (!hasTable || hasTable.n === 0)
        return;
    const rows = db
        .prepare('SELECT actor_id, space_id, operation, key, result_ref FROM idempotency_records')
        .all();
    const updateStmt = db.prepare('UPDATE idempotency_records SET result_ref = ? WHERE actor_id = ? AND space_id = ? AND operation = ? AND key = ?');
    for (const row of rows) {
        if (!row.result_ref)
            continue;
        const migrated = migrateSingleRef(db, row.operation, row.result_ref, row.key, row.space_id);
        if (migrated !== null && migrated !== row.result_ref) {
            updateStmt.run(migrated, row.actor_id, row.space_id, row.operation, row.key);
        }
    }
}
function applyMigrations(db) {
    // Ensure schema_migrations exists
    db.exec(SCHEMA_MIGRATIONS_DDL);
    // Ensure instance_metadata exists
    db.exec(INSTANCE_METADATA_DDL);
    const appliedRows = db.prepare('SELECT version FROM schema_migrations').all();
    const applied = new Set(appliedRows.map((r) => r.version));
    if (!applied.has(1)) {
        db.exec(SCHEMA_SQL);
        db.prepare('INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (1, ?)').run(new Date().toISOString());
        applied.add(1);
    }
    if (!applied.has(2)) {
        db.exec(THREAD_VERSIONS_DDL);
        // Remove OR IGNORE to allow SQLite triggers / faults to propagate (G03)
        db.exec(`INSERT INTO thread_versions (thread_id, version, title, state, created_at)
      SELECT id, version, title, state, updated_at FROM threads;`);
        migrateIdempotencyRecords(db);
        db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (2, ?)').run(new Date().toISOString());
        applied.add(2);
    }
    else {
        // If already at version 2, still check and migrate any legacy records
        migrateIdempotencyRecords(db);
    }
}
export function bootstrapDatabase(db, adminDisplayName = 'Administrator') {
    const classification = classifyDatabase(db);
    if (classification.kind === 'future') {
        throw new DetunedError(ErrorCode.FORBIDDEN, `数据库 schema 版本 (v${classification.maxVersion}) 高于当前应用版本 (v${CURRENT_SCHEMA_VERSION})，拒绝降级访问。请升级 Detuned。`, 403);
    }
    if (classification.kind === 'unknown') {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, `检测到未知或不受支持的非空数据库结构，拒绝覆盖。${classification.reason ?? ''}请指定空目录或有效的 Detuned 数据库。`, 400);
    }
    if (classification.kind === 'corrupt') {
        throw new DetunedError(ErrorCode.FORBIDDEN, `实例持久密钥缺失或损坏。${classification.reason ?? ''}请检查数据库或联系管理员。`, 403);
    }
    const isAlreadyInit = classification.kind === 'current_initialized';
    const isLegacyUpgrade = classification.kind === 'supported_legacy';
    // Execute all migrations, backfills, metadata and bootstrap inside a single atomic transaction
    const bootstrapTx = db.transaction(() => {
        applyMigrations(db);
        const now = new Date().toISOString();
        // 1. If already initialized: never generate new credentials or tokens (U03)
        if (isAlreadyInit) {
            const existingAdmin = db
                .prepare("SELECT id FROM actors WHERE kind = 'human' ORDER BY created_at LIMIT 1")
                .get();
            return {
                isNewInstance: false,
                adminToken: null,
                adminActorId: existingAdmin?.id ?? null,
            };
        }
        // 2. If legacy database upgrade: preserve existing credentials/actors, set metadata, never issue new token (T06, G08)
        if (isLegacyUpgrade) {
            const existingSecret = db.prepare("SELECT value FROM instance_metadata WHERE key = 'token_secret'").get();
            if (!existingSecret?.value) {
                const secret = randomBytes(32).toString('hex');
                db.prepare("INSERT OR REPLACE INTO instance_metadata (key, value) VALUES ('token_secret', ?)").run(secret);
            }
            db.prepare("INSERT OR REPLACE INTO instance_metadata (key, value) VALUES ('initialized', 'true')").run();
            const existingAdmin = db
                .prepare("SELECT id FROM actors WHERE kind = 'human' ORDER BY created_at LIMIT 1")
                .get();
            return {
                isNewInstance: false,
                adminToken: null,
                adminActorId: existingAdmin?.id ?? null,
            };
        }
        // 3. Fresh instance initialization
        const storage = new SqliteStorage(db);
        const adminActorId = `act_admin_${randomBytes(6).toString('hex')}`;
        const rawToken = `detuned_adm_${randomBytes(24).toString('hex')}`;
        const tokenHash = createHash('sha256').update(rawToken).digest('hex');
        storage.createActor({
            id: adminActorId,
            kind: 'human',
            display_name: adminDisplayName,
            created_at: now,
            disabled_at: null,
        });
        storage.createCredential({
            id: `cred_admin_${randomBytes(6).toString('hex')}`,
            actor_id: adminActorId,
            token_hash: tokenHash,
            allowed_space_ids: ['*'],
            capabilities: ['read', 'write', 'admin'],
            expires_at: null,
            revoked_at: null,
            created_at: now,
        });
        const secret = randomBytes(32).toString('hex');
        db.prepare("INSERT OR REPLACE INTO instance_metadata (key, value) VALUES ('token_secret', ?)").run(secret);
        db.prepare("INSERT OR REPLACE INTO instance_metadata (key, value) VALUES ('initialized', 'true')").run();
        return {
            isNewInstance: true,
            adminToken: rawToken,
            adminActorId,
        };
    });
    return bootstrapTx();
}
export function openAndCoordinateDatabase(db, mode) {
    const classification = classifyDatabase(db);
    if (classification.kind === 'future') {
        throw new DetunedError(ErrorCode.FORBIDDEN, `数据库 schema 版本 (v${classification.maxVersion}) 高于当前应用支持版本 (v${CURRENT_SCHEMA_VERSION})，拒绝服务。请升级 Detuned。`, 403);
    }
    if (classification.kind === 'unknown') {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, `检测到未知或不受支持的非空数据库结构，拒绝覆盖。${classification.reason ?? ''}请指定空目录或有效的 Detuned 数据库。`, 400);
    }
    if (classification.kind === 'corrupt') {
        throw new DetunedError(ErrorCode.FORBIDDEN, `实例持久密钥缺失或损坏。${classification.reason ?? ''}请检查数据库或联系管理员。`, 403);
    }
    if (mode === 'serve') {
        if (classification.kind === 'blank') {
            throw new DetunedError(ErrorCode.NOT_FOUND, '数据库尚未初始化。请先执行 "detuned init" 完成初始化。', 404);
        }
        const tableNames = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            .all()
            .map((r) => r.name);
        const tblSet = new Set(tableNames);
        const maxV = tblSet.has('schema_migrations')
            ? (db.prepare('SELECT max(version) AS max_v FROM schema_migrations').get()?.max_v ?? 0)
            : 0;
        if (!tblSet.has('instance_metadata') && (tblSet.has('thread_versions') || maxV >= 2)) {
            throw new DetunedError(ErrorCode.FORBIDDEN, '实例持久密钥缺失或损坏。当前版本数据库缺少 instance_metadata 持久材料或 token_secret 损坏。请检查数据库或联系管理员。', 403);
        }
        // supported_legacy or current_initialized
        return bootstrapDatabase(db);
    }
    // mode === 'init':
    return bootstrapDatabase(db);
}
//# sourceMappingURL=bootstrap.js.map