import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
  console.error('Error: better-sqlite3 driver is required for schema generation.');
  process.exit(1);
}

const sqlContent = readFileSync(sqlPath, 'utf8').replace(/^--.*$/gm, '').trim();
const v1SqlContent = readFileSync(v1SqlPath, 'utf8').replace(/^--.*$/gm, '').trim();
const tsContent = readFileSync(tsPath, 'utf8');

function extractTableDdl(sql, tableName) {
  const re = new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}\\s*\\([\\s\\S]*?\\);`, 'm');
  const m = sql.match(re);
  if (!m) throw new Error(`Could not find CREATE TABLE statement for ${tableName} in schema.sql`);
  return m[0].trim();
}

// 1. Extract V2 Table Requirements
const dbV2 = new Database(':memory:');
dbV2.exec(sqlContent);
let v2Tables;
try {
  v2Tables = extractDatabaseRequirements(dbV2);
} catch (err) {
  console.error(`Error extracting requirements from schema.sql: ${err.message}`);
  process.exit(1);
} finally {
  dbV2.close();
}

// 2. Extract V1 Table Requirements
const dbV1 = new Database(':memory:');
dbV1.exec(v1SqlContent);
let v1Tables;
try {
  v1Tables = extractDatabaseRequirements(dbV1);
} catch (err) {
  console.error(`Error extracting requirements from historical fixture: ${err.message}`);
  process.exit(1);
} finally {
  dbV1.close();
}

// 3. Update SCHEMA_SQL
const schemaSqlRegex = /\/\/ BEGIN SCHEMA_SQL[\s\S]*?\/\/ END SCHEMA_SQL/;
const newSchemaSqlBlock = `// BEGIN SCHEMA_SQL\nexport const SCHEMA_SQL = \`\n${sqlContent}\n\`;\n// END SCHEMA_SQL`;

let updatedTs;
if (schemaSqlRegex.test(tsContent)) {
  updatedTs = tsContent.replace(schemaSqlRegex, newSchemaSqlBlock);
} else {
  const fallbackRegex = /export const SCHEMA_SQL = `[\s\S]*?`;/;
  if (fallbackRegex.test(tsContent)) {
    updatedTs = tsContent.replace(fallbackRegex, newSchemaSqlBlock);
  } else {
    console.error('Error: Could not find SCHEMA_SQL placeholder in schema.ts');
    process.exit(1);
  }
}

// 4. Update MIGRATION_DDL
const hasBeginMig = tsContent.includes('// BEGIN MIGRATION_DDL');
const hasEndMig = tsContent.includes('// END MIGRATION_DDL');
if (!hasBeginMig || !hasEndMig) {
  const missing = !hasBeginMig && !hasEndMig
    ? '// BEGIN MIGRATION_DDL and // END MIGRATION_DDL'
    : (!hasBeginMig ? '// BEGIN MIGRATION_DDL' : '// END MIGRATION_DDL');
  console.error(`Error: schema.ts is missing required migration marker (${missing}). Please restore the marker before regenerating.`);
  process.exit(1);
}

const migRegex = /\/\/ BEGIN MIGRATION_DDL[\s\S]*?\/\/ END MIGRATION_DDL/;
if (!migRegex.test(updatedTs)) {
  console.error('Error: Malformed migration DDL block in schema.ts. Ensure // BEGIN MIGRATION_DDL precedes // END MIGRATION_DDL.');
  process.exit(1);
}

const newMigBlock = `// BEGIN MIGRATION_DDL
export const SCHEMA_MIGRATIONS_DDL = \`${extractTableDdl(sqlContent, 'schema_migrations')}\`;

export const INSTANCE_METADATA_DDL = \`${extractTableDdl(sqlContent, 'instance_metadata')}\`;

export const THREAD_VERSIONS_DDL = \`${extractTableDdl(sqlContent, 'thread_versions')}\`;
// END MIGRATION_DDL`;

updatedTs = updatedTs.replace(migRegex, newMigBlock);

// 5. Update V2_SCHEMA_TABLES
const v2Regex = /export const V2_SCHEMA_TABLES: Record<string, TableRequirement> = \{[\s\S]*?\n\};/;
const newV2Block = `export const V2_SCHEMA_TABLES: Record<string, TableRequirement> = ${JSON.stringify(v2Tables, null, 2)};`;
if (v2Regex.test(updatedTs)) {
  updatedTs = updatedTs.replace(v2Regex, newV2Block);
} else {
  console.error('Error: Could not find V2_SCHEMA_TABLES placeholder in schema.ts');
  process.exit(1);
}

// 6. Update V1_SCHEMA_TABLES
const v1Regex = /export const V1_SCHEMA_TABLES: Record<string, TableRequirement> = \{[\s\S]*?\n\};/;
const newV1Block = `export const V1_SCHEMA_TABLES: Record<string, TableRequirement> = ${JSON.stringify(v1Tables, null, 2)};`;
if (v1Regex.test(updatedTs)) {
  updatedTs = updatedTs.replace(v1Regex, newV1Block);
} else {
  console.error('Error: Could not find V1_SCHEMA_TABLES placeholder in schema.ts');
  process.exit(1);
}

writeFileSync(tsPath, updatedTs, 'utf8');
console.log('Successfully generated schema.ts from schema.sql');
