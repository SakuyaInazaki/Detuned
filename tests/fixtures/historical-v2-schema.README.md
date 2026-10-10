# Historical schema2 fixture

This file preserves the exact pre-schema3 `packages/storage-sqlite/src/schema.sql` bytes captured for M6.1-B, before editing the current DDL. It is a structural historical profile, not a database containing credentials or research data.

SHA-256: `7e3f01ada4d5285f62b61c5c9d427a288b1fc3dde7ee4146560ad7a0d22b85be`.

Recipe: copy the schema2 source bytes without parsing, stripping comments, or reformatting; verify the SHA-256 against the M6.1-B fresh baseline. Migration markers and initialized metadata are supplied by private test fixtures, not embedded in this SQL.
