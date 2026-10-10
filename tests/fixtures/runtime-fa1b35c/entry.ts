import { buildApp as legacyBuildApp } from '@detuned/server';
export { SqliteStorage, bootstrapDatabase, SCHEMA_SQL } from '@detuned/storage-sqlite';
/** Historical test runtime only: callers must inject a fresh private test secret. */
export function buildLegacyApp(options: Parameters<typeof legacyBuildApp>[0]) {
  if (typeof options.tokenSecret !== 'string' || Buffer.byteLength(options.tokenSecret) < 32) throw new Error('An explicit private test tokenSecret of at least 32 bytes is required.');
  return legacyBuildApp(options);
}
