# Standalone noEmit expression provenance

No compiler rerun. This compares each reported expression to captured fresh bytes; it does not prove the original compiler emitted the same diagnostics.
- `packages/storage-sqlite/tests/schema-generation.test.ts:110`: `const v2Tables = JSON.parse(v2Match![1]);`. Exact matching before lines: [108]. Expression retained; surrounding V2 reflection schema was changed to V3.
- `packages/storage-sqlite/tests/schema-generation.test.ts:117`: `const v1Tables = JSON.parse(v1Match![1]);`. Exact matching before lines: [115]. Expression retained; surrounding V2 reflection schema was changed to V3.
- `packages/storage-sqlite/tests/schema-generation.test.ts:147`: `const v2IndexTables = JSON.parse(v2IndexMatch![1]);`. Exact matching before lines: [145]. Expression retained; surrounding V2 reflection schema was changed to V3.
- `packages/storage-sqlite/tests/schema-generation.test.ts:178`: `const v2FtsTables = JSON.parse(v2FtsMatch![1]);`. Exact matching before lines: [176]. Expression retained; surrounding V2 reflection schema was changed to V3.
- `packages/storage-sqlite/tests/storage.test.ts:18`: `import { extractDatabaseRequirements } from '../scripts/extract-schema-requirements.mjs';`. Exact matching before lines: [17]. Expression retained verbatim.
- `packages/storage-sqlite/tests/storage.test.ts:258`: `expect(V2_SCHEMA_TABLES['post_fts'].virtual).toBe(true);`. Exact matching before lines: [251]. Expression retained verbatim.
- `packages/storage-sqlite/tests/storage.test.ts:259`: `expect(V2_SCHEMA_TABLES['post_fts'].fts?.configs['tokenize']).toBe('trigram');`. Exact matching before lines: [252]. Expression retained verbatim.
- `packages/storage-sqlite/tests/storage.test.ts:260`: `expect(V1_SCHEMA_TABLES['post_fts'].virtual).toBe(true);`. Exact matching before lines: [253]. Expression retained verbatim.
- `packages/storage-sqlite/tests/storage.test.ts:261`: `expect(V1_SCHEMA_TABLES['post_fts'].fts?.configs['tokenize']).toBe('trigram');`. Exact matching before lines: [254]. Expression retained verbatim.
