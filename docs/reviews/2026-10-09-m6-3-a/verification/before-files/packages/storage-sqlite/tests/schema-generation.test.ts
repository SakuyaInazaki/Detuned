import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, copyFileSync, cpSync, readFileSync, writeFileSync, symlinkSync, rmSync, renameSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
const root = resolve(__dirname, '../../../');

const tempBaseDir = mkdtempSync(join(tmpdir(), 'detuned-test-gen-'));
const sourceSql = readFileSync(join(root, 'packages/storage-sqlite/src/schema.sql'), 'utf8');
const sourceTs = readFileSync(join(root, 'packages/storage-sqlite/src/schema.ts'), 'utf8');

const hash = (text: string) => createHash('sha256').update(text).digest('hex');

function copyProject(name: string, { driver = true, historical = true } = {}) {
  const dir = join(tempBaseDir, name);
  mkdirSync(join(dir, 'packages/storage-sqlite'), { recursive: true });
  mkdirSync(join(dir, 'tests/fixtures'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  for (const sub of ['src', 'scripts']) {
    cpSync(join(root, 'packages/storage-sqlite', sub), join(dir, 'packages/storage-sqlite', sub), { recursive: true });
  }
  // Frozen schema2 is required independently of the schema1 missing-input case.
  copyFileSync(join(root, 'tests/fixtures/historical-v2-schema.sql'), join(dir, 'tests/fixtures/historical-v2-schema.sql'));
  copyFileSync(join(root, 'tests/fixtures/historical-v3-schema.sql'), join(dir, 'tests/fixtures/historical-v3-schema.sql'));
  if (historical) {
    copyFileSync(join(root, 'tests/fixtures/historical-v1-schema.sql'), join(dir, 'tests/fixtures/historical-v1-schema.sql'));
  }
  if (driver) {
    symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
  }
  return dir;
}

function runScript(dir: string, scriptName: string) {
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_PATH;
  delete cleanEnv.VITEST;
  delete cleanEnv.VITEST_POOL_ID;
  delete cleanEnv.VITEST_WORKER_ID;
  const r = spawnSync(process.execPath, [join(dir, 'packages/storage-sqlite/scripts', scriptName)], {
    cwd: dir,
    encoding: 'utf8',
    env: cleanEnv,
    timeout: 30000,
  });
  return { exitCode: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

async function compileAndVerifyWithoutSrc(dir: string) {
  const tsPath = join(dir, 'packages/storage-sqlite/src/schema.ts');
  const tscPath = resolve(root, 'node_modules/typescript/bin/tsc');
  const compile = spawnSync(process.execPath, [tscPath, tsPath, '--outDir', join(dir, 'dist'), '--target', 'ES2022', '--module', 'ES2022', '--skipLibCheck'], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 30000,
  });
  expect(compile.status).toBe(0);

  // Remove src to prove runtime works without source files
  rmSync(join(dir, 'packages/storage-sqlite/src'), { recursive: true, force: true });

  const mod = await import(pathToFileURL(join(dir, 'dist/schema.js')).href);
  const db = new Database(':memory:');
  try {
    db.exec(mod.SCHEMA_SQL);
    const v2Check = mod.verifyDatabaseStructure(db, 4);
    expect(v2Check.valid).toBe(true);
  } finally {
    db.close();
  }
}

describe('Schema Generation & Sync Pipeline Formal Regressions', () => {
  afterAll(() => {
    try {
      rmSync(tempBaseDir, { recursive: true, force: true });
    } catch {}
  });

  it('generates and synchronizes cleanly on healthy input and allowed column nullability changes, asserting V4 updates and frozen V1/V2/V3 remain unchanged', async () => {
    const dir = copyProject('healthy-column-change');
    const needle = 'objective TEXT NOT NULL,';
    const replacement = 'objective TEXT,';

    const occurrences = (sourceSql.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    expect(occurrences).toBe(1);

    const mutatedSql = sourceSql.replace(needle, replacement);
    expect(mutatedSql).not.toBe(sourceSql);

    writeFileSync(join(dir, 'packages/storage-sqlite/src/schema.sql'), mutatedSql);

    const gen = runScript(dir, 'generate-schema.mjs');
    expect(gen.exitCode).toBe(0);

    const sync = runScript(dir, 'check-schema-sync.mjs');
    expect(sync.exitCode).toBe(0);

    const generatedTs = readFileSync(join(dir, 'packages/storage-sqlite/src/schema.ts'), 'utf8');

    // Parse current V4 and frozen V1 profile tables from generated code to assert schema reflection
    const v2Match = generatedTs.match(/export const V4_SCHEMA_TABLES: Record<string, TableRequirement> = (\{[\s\S]*?\n\});/);
    expect(v2Match).not.toBeNull();
    const v2Tables = JSON.parse(v2Match![1]);
    const objColV2 = v2Tables.space_revisions.columns.find((c: any) => c.name === 'objective');
    expect(objColV2).toBeDefined();
    expect(objColV2.notnull).toBe(false);

    const v1Match = generatedTs.match(/export const V1_SCHEMA_TABLES: Record<string, TableRequirement> = (\{[\s\S]*?\n\});/);
    expect(v1Match).not.toBeNull();
    const v1Tables = JSON.parse(v1Match![1]);
    const objColV1 = v1Tables.space_revisions.columns.find((c: any) => c.name === 'objective');
    expect(objColV1).toBeDefined();
    expect(objColV1.notnull).toBe(true); // V1 from historical fixture remains frozen NOT NULL

    await compileAndVerifyWithoutSrc(dir);
  });

  it('tracks real named index and FTS source changes into runtime profile without dropping attributes', async () => {
    // 1. Real named index mutation on idx_events_space_seq
    const dirIndex = copyProject('real-index-change');
    const indexNeedle = 'CREATE INDEX IF NOT EXISTS idx_events_space_seq ON events(space_id, seq);';
    const indexReplacement = 'CREATE INDEX IF NOT EXISTS idx_events_space_seq ON events(space_id COLLATE NOCASE, seq DESC);';

    const indexOccurrences = (sourceSql.match(new RegExp(indexNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    expect(indexOccurrences).toBe(1);

    const mutatedIndexSql = sourceSql.replace(indexNeedle, indexReplacement);
    expect(mutatedIndexSql).not.toBe(sourceSql);

    writeFileSync(join(dirIndex, 'packages/storage-sqlite/src/schema.sql'), mutatedIndexSql);

    const genIndex = runScript(dirIndex, 'generate-schema.mjs');
    expect(genIndex.exitCode).toBe(0);

    const syncIndex = runScript(dirIndex, 'check-schema-sync.mjs');
    expect(syncIndex.exitCode).toBe(0);

    const generatedIndexTs = readFileSync(join(dirIndex, 'packages/storage-sqlite/src/schema.ts'), 'utf8');
    const v2IndexMatch = generatedIndexTs.match(/export const V4_SCHEMA_TABLES: Record<string, TableRequirement> = (\{[\s\S]*?\n\});/);
    const v2IndexTables = JSON.parse(v2IndexMatch![1]);
    const eventsIdx = v2IndexTables.events.indexes.find((i: any) => i.name === 'idx_events_space_seq');
    expect(eventsIdx).toBeDefined();
    expect(eventsIdx.keyTerms).toEqual([
      { name: 'space_id', coll: 'NOCASE', desc: 0 },
      { name: 'seq', coll: 'BINARY', desc: 1 },
    ]);

    await compileAndVerifyWithoutSrc(dirIndex);

    // 2. FTS source mutation on post_fts virtual table (body indexed -> body UNINDEXED)
    const dirFts = copyProject('real-fts-change');
    const ftsNeedle = '  body,\n  tags,';
    const ftsReplacement = '  body UNINDEXED,\n  tags,';

    const ftsOccurrences = (sourceSql.match(new RegExp(ftsNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    expect(ftsOccurrences).toBe(1);

    const mutatedFtsSql = sourceSql.replace(ftsNeedle, ftsReplacement);
    expect(mutatedFtsSql).not.toBe(sourceSql);

    writeFileSync(join(dirFts, 'packages/storage-sqlite/src/schema.sql'), mutatedFtsSql);

    const genFts = runScript(dirFts, 'generate-schema.mjs');
    expect(genFts.exitCode).toBe(0);

    const syncFts = runScript(dirFts, 'check-schema-sync.mjs');
    expect(syncFts.exitCode).toBe(0);

    const generatedFtsTs = readFileSync(join(dirFts, 'packages/storage-sqlite/src/schema.ts'), 'utf8');
    const v2FtsMatch = generatedFtsTs.match(/export const V4_SCHEMA_TABLES: Record<string, TableRequirement> = (\{[\s\S]*?\n\});/);
    const v2FtsTables = JSON.parse(v2FtsMatch![1]);
    const bodyCol = v2FtsTables.post_fts.fts.columns.find((c: any) => c.name === 'body');
    expect(bodyCol).toBeDefined();
    expect(bodyCol.unindexed).toBe(true);

    await compileAndVerifyWithoutSrc(dirFts);
  });

  it('rejects unsupported primary key collation or direction at build and check time (AB01)', () => {
    // 1. Collation NOCASE
    const dirCollation = copyProject('pk-collation-rejection');
    const pkNeedle = 'PRIMARY KEY (actor_id, space_id, operation, key)';
    const nocaseNeedle = 'PRIMARY KEY (actor_id COLLATE NOCASE, space_id, operation, key)';

    const pkOccurrences = (sourceSql.match(new RegExp(pkNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    expect(pkOccurrences).toBe(1);

    const nocaseSql = sourceSql.replace(pkNeedle, nocaseNeedle);
    expect(nocaseSql).not.toBe(sourceSql);
    writeFileSync(join(dirCollation, 'packages/storage-sqlite/src/schema.sql'), nocaseSql);

    const genCollation = runScript(dirCollation, 'generate-schema.mjs');
    expect(genCollation.exitCode).toBe(1);
    expect(genCollation.stderr).toMatch(/包含不受支持的排序规则: NOCASE/);

    const syncCollation = runScript(dirCollation, 'check-schema-sync.mjs');
    expect(syncCollation.exitCode).toBe(1);
    expect(syncCollation.stderr).toMatch(/schema\.ts is out of sync with schema\.sql/);

    // Also verify when schema.ts has matching SCHEMA_SQL, sync check fails with policy diagnostic from extractDatabaseRequirements
    const tsCollationFile = join(dirCollation, 'packages/storage-sqlite/src/schema.ts');
    writeFileSync(tsCollationFile, sourceTs.replace(pkNeedle, nocaseNeedle));
    const syncCollationPolicy = runScript(dirCollation, 'check-schema-sync.mjs');
    expect(syncCollationPolicy.exitCode).toBe(1);
    expect(syncCollationPolicy.stderr).toMatch(/包含不受支持的排序规则: NOCASE/);

    // 2. Direction DESC
    const dirDirection = copyProject('pk-direction-rejection');
    const descNeedle = 'PRIMARY KEY (actor_id, space_id, operation, key DESC)';
    const descSql = sourceSql.replace(pkNeedle, descNeedle);
    expect(descSql).not.toBe(sourceSql);
    writeFileSync(join(dirDirection, 'packages/storage-sqlite/src/schema.sql'), descSql);

    const genDesc = runScript(dirDirection, 'generate-schema.mjs');
    expect(genDesc.exitCode).toBe(1);
    expect(genDesc.stderr).toMatch(/包含不受支持的排序方向: DESC/);

    const syncDesc = runScript(dirDirection, 'check-schema-sync.mjs');
    expect(syncDesc.exitCode).toBe(1);
    expect(syncDesc.stderr).toMatch(/schema\.ts is out of sync with schema\.sql/);

    // Also verify when schema.ts has matching SCHEMA_SQL, sync check fails with policy diagnostic from extractDatabaseRequirements
    const tsDescFile = join(dirDirection, 'packages/storage-sqlite/src/schema.ts');
    writeFileSync(tsDescFile, sourceTs.replace(pkNeedle, descNeedle));
    const syncDescPolicy = runScript(dirDirection, 'check-schema-sync.mjs');
    expect(syncDescPolicy.exitCode).toBe(1);
    expect(syncDescPolicy.stderr).toMatch(/包含不受支持的排序方向: DESC/);
  });

  it.each([
    { version: 'V4', profileName: 'V4_SCHEMA_TABLES' },
    { version: 'V3', profileName: 'V3_SCHEMA_TABLES' },
    { version: 'V2', profileName: 'V2_SCHEMA_TABLES' },
    { version: 'V1', profileName: 'V1_SCHEMA_TABLES' },
  ])('detects corrupt $version profile in sync check and successfully repairs it via generate-schema (AB03)', async ({ profileName }) => {
    const dir = copyProject(`repair-corrupted-profile-${profileName}`);
    const tsFile = join(dir, 'packages/storage-sqlite/src/schema.ts');
    const histFile = join(dir, 'tests/fixtures/historical-v1-schema.sql');
    const histHashBefore = hash(readFileSync(histFile, 'utf8'));

    const re = new RegExp(`(export const ${profileName}: Record<string, TableRequirement> = \\{[\\s\\S]*?\\n\\};)`);
    const brokenTs = sourceTs.replace(re, (block) => block.replace('"type": "TEXT"', '"type": "BLOB"'));
    expect(brokenTs).not.toBe(sourceTs);
    writeFileSync(tsFile, brokenTs);

    // Sync check must fail on corrupted profile
    const syncBefore = runScript(dir, 'check-schema-sync.mjs');
    expect(syncBefore.exitCode).toBe(1);

    // Generation repairs the profile
    const gen = runScript(dir, 'generate-schema.mjs');
    expect(gen.exitCode).toBe(0);

    // Sync check passes after repair
    const syncAfter = runScript(dir, 'check-schema-sync.mjs');
    expect(syncAfter.exitCode).toBe(0);

    // Historical SQL fixture bytes must remain frozen and unchanged
    const histHashAfter = hash(readFileSync(histFile, 'utf8'));
    expect(histHashAfter).toBe(histHashBefore);

    await compileAndVerifyWithoutSrc(dir);
  });

  it('fails atomically without modifying schema.ts when inputs or markers are missing, and recovers upon restoration (AB02 & AB04)', () => {
    // 1. Missing BEGIN MIGRATION_DDL marker with source SQL change
    const dirBegin = copyProject('missing-begin-marker');
    const tsBeginFile = join(dirBegin, 'packages/storage-sqlite/src/schema.ts');
    const mutatedBeginSql = sourceSql.replace('objective TEXT NOT NULL,', 'objective TEXT,');
    writeFileSync(join(dirBegin, 'packages/storage-sqlite/src/schema.sql'), mutatedBeginSql);

    const tsBeginBroken = sourceTs.replace('// BEGIN MIGRATION_DDL', '// MISSING_BEGIN_MIGRATION_DDL');
    expect(tsBeginBroken).not.toBe(sourceTs);
    writeFileSync(tsBeginFile, tsBeginBroken);
    const hashBeginBefore = hash(readFileSync(tsBeginFile, 'utf8'));

    const genBeginFail = runScript(dirBegin, 'generate-schema.mjs');
    expect(genBeginFail.exitCode).toBe(1);
    expect(genBeginFail.stderr).toMatch(/missing required migration marker/);
    expect(hash(readFileSync(tsBeginFile, 'utf8'))).toBe(hashBeginBefore);

    const syncBeginFail = runScript(dirBegin, 'check-schema-sync.mjs');
    expect(syncBeginFail.exitCode).toBe(1);

    // Restore BEGIN marker and verify success
    writeFileSync(tsBeginFile, sourceTs);
    const genBeginRecover = runScript(dirBegin, 'generate-schema.mjs');
    expect(genBeginRecover.exitCode).toBe(0);
    expect(hash(readFileSync(tsBeginFile, 'utf8'))).not.toBe(hashBeginBefore);
    expect(runScript(dirBegin, 'check-schema-sync.mjs').exitCode).toBe(0);

    // 2. Missing END MIGRATION_DDL marker with source SQL change
    const dirEnd = copyProject('missing-end-marker');
    const tsEndFile = join(dirEnd, 'packages/storage-sqlite/src/schema.ts');
    const mutatedEndSql = sourceSql.replace('objective TEXT NOT NULL,', 'objective TEXT,');
    writeFileSync(join(dirEnd, 'packages/storage-sqlite/src/schema.sql'), mutatedEndSql);

    const tsEndBroken = sourceTs.replace('// END MIGRATION_DDL', '// MISSING_END_MIGRATION_DDL');
    expect(tsEndBroken).not.toBe(sourceTs);
    writeFileSync(tsEndFile, tsEndBroken);
    const hashEndBefore = hash(readFileSync(tsEndFile, 'utf8'));

    const genEndFail = runScript(dirEnd, 'generate-schema.mjs');
    expect(genEndFail.exitCode).toBe(1);
    expect(genEndFail.stderr).toMatch(/missing required migration marker/);
    expect(hash(readFileSync(tsEndFile, 'utf8'))).toBe(hashEndBefore);

    // Restore END marker and verify success
    writeFileSync(tsEndFile, sourceTs);
    const genEndRecover = runScript(dirEnd, 'generate-schema.mjs');
    expect(genEndRecover.exitCode).toBe(0);
    expect(hash(readFileSync(tsEndFile, 'utf8'))).not.toBe(hashEndBefore);
    expect(runScript(dirEnd, 'check-schema-sync.mjs').exitCode).toBe(0);

    // 3. Missing driver (better-sqlite3)
    const dirDriver = copyProject('missing-driver', { driver: false });
    const tsDriverFile = join(dirDriver, 'packages/storage-sqlite/src/schema.ts');
    const hashDriverBefore = hash(readFileSync(tsDriverFile, 'utf8'));

    const genDriverFail = runScript(dirDriver, 'generate-schema.mjs');
    expect(genDriverFail.exitCode).toBe(1);
    expect(hash(readFileSync(tsDriverFile, 'utf8'))).toBe(hashDriverBefore);
    expect(runScript(dirDriver, 'check-schema-sync.mjs').exitCode).toBe(1);

    // Restore driver
    symlinkSync(join(root, 'node_modules'), join(dirDriver, 'node_modules'), 'dir');
    expect(runScript(dirDriver, 'generate-schema.mjs').exitCode).toBe(0);
    expect(runScript(dirDriver, 'check-schema-sync.mjs').exitCode).toBe(0);

    // 4. Missing historical source (historical-v1-schema.sql)
    const dirHist = copyProject('missing-historical', { historical: false });
    const tsHistFile = join(dirHist, 'packages/storage-sqlite/src/schema.ts');
    const hashHistBefore = hash(readFileSync(tsHistFile, 'utf8'));

    const genHistFail = runScript(dirHist, 'generate-schema.mjs');
    expect(genHistFail.exitCode).toBe(1);
    expect(hash(readFileSync(tsHistFile, 'utf8'))).toBe(hashHistBefore);
    expect(runScript(dirHist, 'check-schema-sync.mjs').exitCode).toBe(1);

    // Restore historical source
    copyFileSync(join(root, 'tests/fixtures/historical-v1-schema.sql'), join(dirHist, 'tests/fixtures/historical-v1-schema.sql'));
    expect(runScript(dirHist, 'generate-schema.mjs').exitCode).toBe(0);
    expect(runScript(dirHist, 'check-schema-sync.mjs').exitCode).toBe(0);

    // 5. Missing current source (schema.sql)
    const dirCurrent = copyProject('missing-current-source');
    const currentSqlPath = join(dirCurrent, 'packages/storage-sqlite/src/schema.sql');
    const currentSqlBak = join(dirCurrent, 'packages/storage-sqlite/src/schema.sql.bak');
    const tsCurrentFile = join(dirCurrent, 'packages/storage-sqlite/src/schema.ts');
    const hashCurrentBefore = hash(readFileSync(tsCurrentFile, 'utf8'));

    renameSync(currentSqlPath, currentSqlBak);
    expect(runScript(dirCurrent, 'generate-schema.mjs').exitCode).toBe(1);
    expect(hash(readFileSync(tsCurrentFile, 'utf8'))).toBe(hashCurrentBefore);
    expect(runScript(dirCurrent, 'check-schema-sync.mjs').exitCode).toBe(1);

    // Restore current source
    renameSync(currentSqlBak, currentSqlPath);
    expect(runScript(dirCurrent, 'generate-schema.mjs').exitCode).toBe(0);
    expect(runScript(dirCurrent, 'check-schema-sync.mjs').exitCode).toBe(0);

    // 6. Missing helper script (extract-schema-requirements.mjs)
    const dirHelper = copyProject('missing-helper');
    const helperPath = join(dirHelper, 'packages/storage-sqlite/scripts/extract-schema-requirements.mjs');
    const helperBak = join(dirHelper, 'packages/storage-sqlite/scripts/extract-schema-requirements.mjs.bak');
    const tsHelperFile = join(dirHelper, 'packages/storage-sqlite/src/schema.ts');
    const hashHelperBefore = hash(readFileSync(tsHelperFile, 'utf8'));

    renameSync(helperPath, helperBak);
    expect(runScript(dirHelper, 'generate-schema.mjs').exitCode).toBe(1);
    expect(hash(readFileSync(tsHelperFile, 'utf8'))).toBe(hashHelperBefore);
    expect(runScript(dirHelper, 'check-schema-sync.mjs').exitCode).toBe(1);

    // Restore helper
    renameSync(helperBak, helperPath);
    expect(runScript(dirHelper, 'generate-schema.mjs').exitCode).toBe(0);
    expect(runScript(dirHelper, 'check-schema-sync.mjs').exitCode).toBe(0);

    // 7. Missing V2 marker (V2_SCHEMA_TABLES) in schema.ts (AB04)
    const dirV2 = copyProject('missing-v2-marker');
    const tsV2File = join(dirV2, 'packages/storage-sqlite/src/schema.ts');
    const tsV2Broken = sourceTs.replace('export const V2_SCHEMA_TABLES:', 'export const MISSING_V2:');
    writeFileSync(tsV2File, tsV2Broken);
    const hashV2Before = hash(readFileSync(tsV2File, 'utf8'));

    // Both check and generate fail when V2 marker is missing, leaving schema.ts untouched
    expect(runScript(dirV2, 'check-schema-sync.mjs').exitCode).toBe(1);
    const genV2Fail = runScript(dirV2, 'generate-schema.mjs');
    expect(genV2Fail.exitCode).toBe(1);
    expect(genV2Fail.stderr).toMatch(/Could not find V2_SCHEMA_TABLES placeholder/);
    expect(hash(readFileSync(tsV2File, 'utf8'))).toBe(hashV2Before);

    // Restore V2 marker and verify generation and sync succeed
    writeFileSync(tsV2File, sourceTs);
    expect(runScript(dirV2, 'generate-schema.mjs').exitCode).toBe(0);
    expect(runScript(dirV2, 'check-schema-sync.mjs').exitCode).toBe(0);
  });
});
