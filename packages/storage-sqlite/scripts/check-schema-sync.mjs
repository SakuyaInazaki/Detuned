import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { extractDatabaseRequirements } from './extract-schema-requirements.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, '../src/schema.sql');
const v1SqlPath = path.resolve(__dirname, '../../../tests/fixtures/historical-v1-schema.sql');
const tsPath = path.resolve(__dirname, '../src/schema.ts');

if (!existsSync(sqlPath)) {
  console.error(`Error: Required schema.sql not found at ${sqlPath}`);
  process.exit(1);
}

if (!existsSync(v1SqlPath)) {
  console.error(`Error: Required historical fixture historical-v1-schema.sql not found at ${v1SqlPath}`);
  process.exit(1);
}

let Database = null;
try {
  Database = (await import('better-sqlite3')).default;
} catch {
  try {
    const { createRequire } = await import('node:module');
    const req = createRequire(process.cwd());
    Database = req('better-sqlite3');
  } catch {}
}

if (!Database) {
  console.error('Error: better-sqlite3 driver is required for schema profile synchronization check.');
  process.exit(1);
}

const sqlContent = readFileSync(sqlPath, 'utf8').replace(/^--.*$/gm, '').trim();
const v1SqlContent = readFileSync(v1SqlPath, 'utf8').replace(/^--.*$/gm, '').trim();
const tsContent = readFileSync(tsPath, 'utf8');

// 1. Check SCHEMA_SQL
const match = tsContent.match(/export const SCHEMA_SQL = `\n([\s\S]*?)\n`;/);
if (!match || !match[1]) {
  console.error('Error: Could not extract SCHEMA_SQL from schema.ts');
  process.exit(1);
}

const extractedSql = match[1].trim();
if (extractedSql !== sqlContent) {
  console.error('Error: schema.ts is out of sync with schema.sql. Run "pnpm --filter @detuned/storage-sqlite run generate:schema" to synchronize.');
  process.exit(1);
}

// 2. Check Migration DDL constants
function extractTableDdl(sql, tableName) {
  const re = new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}\\s*\\([\\s\\S]*?\\);`, 'm');
  const m = sql.match(re);
  if (!m) return null;
  return m[0].trim();
}

for (const [constName, tableName] of [
  ['SCHEMA_MIGRATIONS_DDL', 'schema_migrations'],
  ['INSTANCE_METADATA_DDL', 'instance_metadata'],
  ['THREAD_VERSIONS_DDL', 'thread_versions'],
]) {
  const re = new RegExp(`export const ${constName} = \`([\\s\\S]*?)\`;`);
  const m = tsContent.match(re);
  if (!m || !m[1]) {
    console.error(`Error: Could not extract ${constName} from schema.ts`);
    process.exit(1);
  }
  const expected = extractTableDdl(sqlContent, tableName);
  if (m[1].trim() !== expected) {
    console.error(`Error: ${constName} in schema.ts does not match ${tableName} in schema.sql`);
    process.exit(1);
  }
}

// 3. Check V2 Profile
const dbV2 = new Database(':memory:');
dbV2.exec(sqlContent);
let expectedV2;
try {
  expectedV2 = extractDatabaseRequirements(dbV2);
} catch (err) {
  console.error(`Error extracting requirements from schema.sql: ${err.message}`);
  process.exit(1);
} finally {
  dbV2.close();
}

const v2Match = tsContent.match(/export const V2_SCHEMA_TABLES: Record<string, TableRequirement> = (\{[\s\S]*?\n\});/);
if (!v2Match || !v2Match[1]) {
  console.error('Error: Could not extract V2_SCHEMA_TABLES literal from schema.ts');
  process.exit(1);
}
let actualV2;
try {
  actualV2 = JSON.parse(v2Match[1]);
} catch (e) {
  console.error('Error: Could not parse V2_SCHEMA_TABLES JSON:', e.message);
  process.exit(1);
}
if (!isDeepStrictEqual(actualV2, expectedV2)) {
  console.error('Error: V2_SCHEMA_TABLES in schema.ts is out of sync with schema.sql DDL structure.');
  process.exit(1);
}

// 4. Check V1 Profile
const dbV1 = new Database(':memory:');
dbV1.exec(v1SqlContent);
let expectedV1;
try {
  expectedV1 = extractDatabaseRequirements(dbV1);
} catch (err) {
  console.error(`Error extracting requirements from historical fixture: ${err.message}`);
  process.exit(1);
} finally {
  dbV1.close();
}

const v1Match = tsContent.match(/export const V1_SCHEMA_TABLES: Record<string, TableRequirement> = (\{[\s\S]*?\n\});/);
if (!v1Match || !v1Match[1]) {
  console.error('Error: Could not extract V1_SCHEMA_TABLES literal from schema.ts');
  process.exit(1);
}
let actualV1;
try {
  actualV1 = JSON.parse(v1Match[1]);
} catch (e) {
  console.error('Error: Could not parse V1_SCHEMA_TABLES JSON:', e.message);
  process.exit(1);
}
if (!isDeepStrictEqual(actualV1, expectedV1)) {
  console.error('Error: V1_SCHEMA_TABLES in schema.ts is out of sync with historical-v1-schema.sql DDL structure.');
  process.exit(1);
}

console.log('schema.sql and schema.ts are in exact synchronization.');
