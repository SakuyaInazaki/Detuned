// Run after the final build. Writes JSON to stdout; the runner records time/exit and separates stderr.
import Database from '../../../../../packages/storage-sqlite/node_modules/better-sqlite3/lib/index.js';
import { buildApp } from '../../../../../packages/server/dist/app.js';
import { SqliteStorage, bootstrapDatabase } from '../../../../../packages/storage-sqlite/dist/index.js';
import * as protocol from '../../../../../packages/protocol/dist/index.js';
const db = new Database(':memory:');
bootstrapDatabase(db);
const app = buildApp({ storage: new SqliteStorage(db) });
const routes = [];
app.addHook('onRoute', r => {
  for (const method of Array.isArray(r.method) ? r.method : [r.method]) {
    if (method === 'HEAD' || !r.url.startsWith('/api/v1/')) continue;
    routes.push({ method: method.toLowerCase(), path: r.url.replace(/^\/api\/v1/, '').replace(/:([^/]+)/g, '{$1}'), body: r.schema?.body });
  }
});
try {
  await app.ready();
  const spec = protocol.generateOpenApiSpec();
  const normalize = value => JSON.stringify(value ?? null);
  const policies = routes.map(r => {
    const op = spec.paths[r.path]?.[r.method];
    if (!op || normalize(r.body) !== normalize(op.requestBody?.content['application/json'].schema)) throw new Error(`Contract mismatch: ${r.method} ${r.path}`);
    const parameters = op.parameters ?? [];
    const bodyName = r.body ? Object.entries(protocol).find(([name, schema]) => name.endsWith('RequestSchema') && normalize(schema) === normalize(r.body))?.[0] : null;
    return { method: r.method.toUpperCase(), path: r.path, body: bodyName ?? (r.body ? 'inline schema' : 'none'), body_required: op.requestBody?.required ?? false,
      query: parameters.filter(p => p.in === 'query'), params: parameters.filter(p => p.in === 'path'), business_headers: parameters.filter(p => p.in === 'header'),
      query_policy: op['x-query-policy'], no_body_policy: op['x-no-body-policy'] ?? null,
      security: op.security ?? spec.security, source: { body: bodyName, parameters: 'protocol/src/request-policies.ts + openapi.ts; server utils/query.ts + actual route', assertion: 'r4-c-route-contracts.test.ts G01; representative behavior G02–G04; existing C01-1–8' } };
  }).sort((a,b) => `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`));
  const actual = policies.map(r => `${r.method.toLowerCase()} ${r.path}`).sort();
  const expected = Object.entries(spec.paths).flatMap(([path, ms]) => Object.keys(ms).map(m => `${m} ${path}`)).sort();
  if (normalize(actual) !== normalize(expected)) throw new Error('Full method/path mismatch');
  console.log(JSON.stringify({ runtime: process.version, policies, note: 'Transport extensions document policy; ordinary OpenAPI parameter validation does not implement unknown or repeated query rejection. Standard HTTP headers are allowed. Path IDs remain strings; ACL and business existence checks stay in core.' }, null, 2));
} finally { await app.close(); db.close(); }
