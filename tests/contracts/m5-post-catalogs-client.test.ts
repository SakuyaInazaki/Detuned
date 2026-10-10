import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { DetunedClient, ClientProtocolError, UserAbortError, TimeoutError } from '@detuned/client';
import { PostRevisionCatalogQuerySchema, RevisionArtifactsQuerySchema, isPostRevisionCatalogPage,
  isPostRevisionArtifactsPage, isPostRevisionCatalogCursorPayload, isRevisionArtifactsCursorPayload,
  buildPostRevisionCatalogEnvelope, buildPostRevisionArtifactsEnvelope, postRevisionCatalogEnvelopeBytes,
  postRevisionArtifactsEnvelopeBytes, PostRevisionCatalogEnvelopeSchema, PostRevisionArtifactsEnvelopeSchema,
  generateOpenApiSpec, type PostRevisionCatalogPage, type PostRevisionArtifactsPage } from '@detuned/protocol';

const date = '2026-10-09T00:00:00Z';
const revisionPage = (): PostRevisionCatalogPage => ({ data: { post_id: 'post-a', current_revision: 2,
  revisions: [{ revision: 2, editor_id: 'actor-a', created_at: date, content_hash: 'a'.repeat(64) }] },
  meta: { truncated: false, next_cursor: 'opaque-first' } });
const artifactPage = (): PostRevisionArtifactsPage => ({ data: { ref: { post_id: 'post-a', revision: 1 }, artifacts: [
  { id: 'art-missing', state: 'missing', owner_id: 'actor-a', sha256: 'b'.repeat(64), bytes: 26_214_401, mime: 'application/octet-stream', created_at: date, purpose: '' },
  { id: 'art-redacted', state: 'redacted' },
] }, meta: { truncated: false, next_cursor: null } });
const envelope = (data: unknown, meta?: unknown) => ({ api_version: '1', request_id: 'catalog-contract', data, ...(meta === undefined ? {} : { meta }) });
function splitJson(value: unknown, cancelled?: () => void) {
  const bytes = new TextEncoder().encode(JSON.stringify(value)); let offset = 0;
  return new Response(new ReadableStream<Uint8Array>({ pull(controller) {
    if (offset === bytes.length) { controller.close(); return; }
    const end = Math.min(bytes.length, offset + 37); controller.enqueue(bytes.slice(offset, end)); offset = end;
  }, cancel() { cancelled?.(); } }), { headers: { 'content-type': 'application/json' } });
}

describe('bounded post catalogs client/protocol contracts', () => {
  it('PC01: strict known DTOs, actual date formats and correlated pages preserve historical missing metadata and OpenAPI budget', () => {
    expect(Value.Check(PostRevisionCatalogQuerySchema, {})).toBe(true);
    expect(Value.Check(RevisionArtifactsQuerySchema, { limit: 20, max_bytes: 4096, cursor: 'opaque' })).toBe(true);
    for (const bad of [{ limit: 0 }, { max_bytes: 4095 }, { cursor: '' }, { unknown: true }]) expect(Value.Check(PostRevisionCatalogQuerySchema, bad)).toBe(false);
    const rev = revisionPage(); const artifacts = artifactPage(); const original = JSON.stringify({ rev, artifacts });
    expect(isPostRevisionCatalogPage(rev)).toBe(true); expect(isPostRevisionArtifactsPage(artifacts)).toBe(true);
    expect(isPostRevisionCatalogPage({ ...rev, data: { ...rev.data, revisions: [{ ...rev.data.revisions[0], created_at: '2026-02-31T00:00:00Z' }] } })).toBe(false);
    expect(isPostRevisionCatalogPage({ ...rev, data: { ...rev.data, body: 'forbidden' } })).toBe(false);
    expect(isPostRevisionCatalogPage({ ...rev, data: { ...rev.data, revisions: [] } })).toBe(false);
    expect(isPostRevisionArtifactsPage({ ...artifacts, data: { ...artifacts.data, artifacts: [{ id: 'redacted', state: 'redacted', purpose: 'must not leak' }] } })).toBe(false);
    expect(isPostRevisionArtifactsPage({ ...artifacts, data: { ...artifacts.data, artifacts: [{ ...artifacts.data.artifacts[0], bytes: Number.MAX_SAFE_INTEGER + 1 }] } })).toBe(false);
    expect(isPostRevisionArtifactsPage({ ...artifacts, meta: { truncated: true, next_cursor: null } })).toBe(false);
    expect(JSON.stringify({ rev, artifacts })).toBe(original);
    const cursor = { v: 1, purpose: 'post_revisions_catalog', actor_id: 'actor', space_id: 'space', post_id: 'post', sort: 'revision_desc', after_revision: 2, exp: 1 };
    expect(isPostRevisionCatalogCursorPayload(cursor)).toBe(true); expect(isRevisionArtifactsCursorPayload(cursor)).toBe(false);
    const aCursor = { ...cursor, purpose: 'revision_artifacts', sort: 'artifact_id_asc', revision: 1, after_id: 'art' };
    const { after_revision: _after, ...validACursor } = aCursor;
    expect(isRevisionArtifactsCursorPayload(validACursor)).toBe(true);
    expect(postRevisionCatalogEnvelopeBytes('汉字-request', rev)).toBe(new TextEncoder().encode(JSON.stringify(buildPostRevisionCatalogEnvelope('汉字-request', rev))).byteLength);
    expect(postRevisionArtifactsEnvelopeBytes('请求', artifacts)).toBe(new TextEncoder().encode(JSON.stringify(buildPostRevisionArtifactsEnvelope('请求', artifacts))).byteLength);
    const spec = generateOpenApiSpec() as { paths: Record<string, { get: { parameters: Array<{ name: string; schema: unknown }>; responses: Record<string, { content: { 'application/json': { schema: unknown } } }> } }> };
    const r = spec.paths['/spaces/{space_id}/posts/{id}/revisions/catalog']!.get;
    const a = spec.paths['/spaces/{space_id}/posts/{id}/revisions/{revision}/artifacts']!.get;
    expect(r.responses['200']!.content['application/json'].schema).toEqual(PostRevisionCatalogEnvelopeSchema);
    expect(a.responses['200']!.content['application/json'].schema).toEqual(PostRevisionArtifactsEnvelopeSchema);
    expect(r.parameters.find(p => p.name === 'cursor')?.schema).toEqual(PostRevisionCatalogQuerySchema.properties.cursor);
  });

  it('PC02: split UTF8 EOF catalogs use exact encoded paths, opaque query and old Bearer/browser-session transport', async () => {
    const originalFetch = globalThis.fetch; const requests: Array<{ url: URL; authorization: string | null; csrf: string | null; credentials?: RequestInit['credentials'] }> = [];
    try {
      globalThis.fetch = async (input, options) => { const url = new URL(String(input)); const headers = new Headers(options?.headers);
        requests.push({ url, authorization: headers.get('authorization'), csrf: headers.get('x-detuned-csrf'), credentials: options?.credentials });
        const page = url.pathname.endsWith('/artifacts') ? artifactPage() : revisionPage();
        return splitJson(envelope(page.data, page.meta)); };
      const browser = new DetunedClient({ baseUrl: 'http://catalog.invalid', token: 'fixture-not-sent', browserSession: { getCsrfToken: () => 'fixture-not-sent-on-GET' }, maxRetries: 0 });
      const r = await browser.getPostRevisionCatalog('space/a', 'post-a', { limit: 20, max_bytes: 65536, cursor: 'opaque&+汉字' });
      expect(r.data.revisions[0]?.revision).toBe(2); expect(r.meta.next_cursor).toBe('opaque-first');
      expect(requests[0]?.url.pathname).toBe('/api/v1/spaces/space%2Fa/posts/post-a/revisions/catalog');
      expect(requests[0]?.url.searchParams.get('cursor')).toBe('opaque&+汉字');
      expect(requests[0]?.credentials).toBe('same-origin'); expect(requests[0]?.authorization).toBeNull(); expect(requests[0]?.csrf).toBeNull();
      const bearer = new DetunedClient({ baseUrl: 'http://catalog.invalid', token: 'isolated-contract', maxRetries: 0 });
      const a = await bearer.getPostRevisionArtifacts('space', 'post-a', 1, { max_bytes: 12288 });
      expect(a.data.artifacts[0]).toMatchObject({ state: 'missing', bytes: 26_214_401, purpose: '' });
      expect(requests[1]?.authorization === 'Bearer isolated-contract').toBe(true); expect(requests[1]?.credentials).toBeUndefined();
      globalThis.fetch = async () => { const page = revisionPage(); page.meta = { truncated: false, next_cursor: null }; page.data.revisions = [{ revision: 1, editor_id: 'actor-a', created_at: date, content_hash: 'c'.repeat(64) }]; return splitJson(envelope(page.data, page.meta)); };
      expect((await bearer.getPostRevisionCatalog('space', 'post-a', { cursor: r.meta.next_cursor! })).data.revisions[0]?.revision).toBe(1);
    } finally { globalThis.fetch = originalFetch; }
  });

  it('PC03: bounded raw responses, invalid UTF8/ref/leaked fields and pending-body abort/timeout reject without partial success', async () => {
    const originalFetch = globalThis.fetch; let cancelled = 0;
    const client = new DetunedClient({ baseUrl: 'http://catalog.invalid', maxRetries: 0, timeoutMs: 40 });
    try {
      globalThis.fetch = async () => new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(1_048_577)); }, cancel() { cancelled++; } }));
      await expect(client.getPostRevisionCatalog('space', 'post-a')).rejects.toBeInstanceOf(ClientProtocolError); expect(cancelled).toBe(1);
      globalThis.fetch = async () => new Response(new Uint8Array([0xff]));
      await expect(client.getPostRevisionCatalog('space', 'post-a')).rejects.toBeInstanceOf(ClientProtocolError);
      const badRevision = revisionPage(); badRevision.data.post_id = 'different-post';
      globalThis.fetch = async () => splitJson(envelope(badRevision.data, badRevision.meta));
      await expect(client.getPostRevisionCatalog('space', 'post-a')).rejects.toBeInstanceOf(ClientProtocolError);
      const badArtifact = artifactPage(); badArtifact.data.ref.revision = 2;
      globalThis.fetch = async () => splitJson(envelope(badArtifact.data, badArtifact.meta));
      await expect(client.getPostRevisionArtifacts('space', 'post-a', 1)).rejects.toBeInstanceOf(ClientProtocolError);
      globalThis.fetch = async () => splitJson(envelope({ ...artifactPage().data, storage_key: 'private' }, artifactPage().meta));
      await expect(client.getPostRevisionArtifacts('space', 'post-a', 1)).rejects.toBeInstanceOf(ClientProtocolError);
      globalThis.fetch = async () => new Response(new ReadableStream({ cancel() { cancelled++; } }));
      const abort = new AbortController(); const pending = client.getPostRevisionArtifacts('space', 'post-a', 1, {}, { signal: abort.signal });
      await new Promise(resolve => setTimeout(resolve, 0)); abort.abort();
      await expect(pending).rejects.toBeInstanceOf(UserAbortError);
      await expect(client.getPostRevisionCatalog('space', 'post-a')).rejects.toBeInstanceOf(TimeoutError);
      expect(cancelled).toBe(3);
    } finally { globalThis.fetch = originalFetch; }
  }, 10000);

  it('PC04: complete server error retains code/no partial success and old full-revision JSON remains unchanged', async () => {
    const originalFetch = globalThis.fetch; let calls = 0;
    try {
      // Use the actual server status, not a malformed 200 success envelope.
      globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ api_version: '1', request_id: 'contract', error: { code: 'QUERY_TOO_BROAD', message: 'A single item does not fit.', retryable: false } }), { status: 422 }); };
      const client = new DetunedClient({ baseUrl: 'http://catalog.invalid', maxRetries: 3 });
      await expect(client.getPostRevisionCatalog('space', 'post-a')).rejects.toMatchObject({ code: 'QUERY_TOO_BROAD', statusCode: 422 }); expect(calls).toBe(1);
      const fullBody = 'x'.repeat(1_048_577);
      globalThis.fetch = async () => new Response(JSON.stringify(envelope([{ post_id: 'post-a', revision: 1, body: fullBody }], { truncated: false, next_cursor: null })));
      expect((await client.listPostRevisions('space', 'post-a', 1)).data[0].body.length).toBe(fullBody.length);
    } finally { globalThis.fetch = originalFetch; }
  }, 10000);
});
