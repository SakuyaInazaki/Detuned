import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { createRequire } from 'node:module';
import {
  NEW_TYPED_STRUCTURED_SCHEMAS, parseNewTypedStructured,
  CreatePostRequestSchema, CreatePostRevisionRequestSchema, CreateThreadRequestSchema,
  ToolPublishParamsSchema, DETUNED_TOOLS, generateOpenApiSpec,
} from '@detuned/protocol';

const serverRequire = createRequire(new URL('../../packages/server/package.json', import.meta.url));
const fastifyRequire = createRequire(serverRequire.resolve('fastify'));
const compilerRequire = createRequire(fastifyRequire.resolve('@fastify/ajv-compiler'));
const Ajv = compilerRequire('ajv');
const ajv = new Ajv({ coerceTypes: false, removeAdditional: false, useDefaults: true, strict: false });
const proposal = { statement: ' statement ', assumptions: [''], scope: 'scope', falsification_plan: 'test' };
const failure = { attempt: 'run', category: 'test_failure', assumptions: [], tested_scope: 'scope', expected: 'pass', observed: 'fail', evidence_refs: [{ kind: 'post', post_id: 'p', revision: 1 }], evidence_state: 'provided', ruled_out: 'this run', not_ruled_out: [''], retry_when: [] };
const summary = { source_refs: [{ post_id: 'p', revision: 1 }] };
const base = { title: 't', summary: 's', body: 'b' };

function agree(kind: keyof typeof NEW_TYPED_STRUCTURED_SCHEMAS, input: unknown, valid: boolean) {
  const schema = NEW_TYPED_STRUCTURED_SCHEMAS[kind];
  const before = JSON.stringify(input);
  expect(Value.Check(schema, input)).toBe(valid);
  expect(ajv.compile(schema)(input)).toBe(valid);
  if (valid) expect(parseNewTypedStructured(kind, input)).toBe(input);
  else {
    try { parseNewTypedStructured(kind, input); expect.fail('must reject'); }
    catch (e) { expect(e).toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400, retryable: false }); }
  }
  expect(JSON.stringify(input)).toBe(before);
}

describe('M2.2-A strict new action and compatible transport contracts', () => {
  it('B01: four strict definitions agree in TypeBox, installed Fastify AJV and parser', () => {
    agree('proposal', proposal, true); agree('claim', proposal, true);
    agree('failure', failure, true); agree('summary', summary, true);
    agree('failure', { ...failure, evidence_state: 'unverified', evidence_refs: [], evidence_missing_reason: 'cannot attach yet' }, true);
    for (const kind of ['note', 'question', 'objection', 'review', 'decision'] as const) expect(parseNewTypedStructured(kind, undefined)).toBeUndefined();
  });

  it('B02: missing, types, unknown keys, blank text, lengths and array elements reject without coercion', () => {
    for (const kind of ['proposal', 'claim', 'failure', 'summary'] as const) { agree(kind, undefined, false); agree(kind, {}, false); }
    for (const kind of ['proposal', 'claim'] as const) {
      for (const field of ['statement', 'scope', 'falsification_plan'] as const) {
        const bad = { ...proposal }; delete (bad as Partial<typeof proposal>)[field]; agree(kind, bad, false);
        agree(kind, { ...proposal, [field]: ' \n\t' }, false);
      }
      agree(kind, { ...proposal, extra: 1 }, false);
      agree(kind, { ...proposal, statement: 'x'.repeat(5000), scope: 'x'.repeat(1000), falsification_plan: 'x'.repeat(2000), assumptions: ['x'.repeat(1000)] }, true);
      for (const [field, max] of [['statement', 5000], ['scope', 1000], ['falsification_plan', 2000]] as const) agree(kind, { ...proposal, [field]: 'x'.repeat(max + 1) }, false);
      agree(kind, { ...proposal, assumptions: [1] }, false); agree(kind, { ...proposal, assumptions: ['x'.repeat(1001)] }, false);
    }
    for (const field of ['attempt', 'tested_scope', 'expected', 'observed', 'ruled_out'] as const) {
      agree('failure', { ...failure, [field]: '' }, false);
      const max = field === 'tested_scope' ? 1000 : 2000;
      agree('failure', { ...failure, [field]: 'x'.repeat(max) }, true);
      agree('failure', { ...failure, [field]: 'x'.repeat(max + 1) }, false);
    }
    for (const field of ['assumptions', 'not_ruled_out', 'retry_when'] as const) {
      agree('failure', { ...failure, [field]: [false] }, false);
      agree('failure', { ...failure, [field]: ['x'.repeat(1001)] }, false);
    }
    agree('failure', { ...failure, category: 'made_up' }, false);
    for (const category of ['counterexample', 'proof_gap', 'test_failure', 'performance_failure', 'environment_error', 'budget_exhausted']) agree('failure', { ...failure, category }, true);
    agree('failure', { ...failure, extra: true }, false);
    for (const field of Object.keys(failure)) { const bad = { ...failure } as Record<string, unknown>; delete bad[field]; agree('failure', bad, false); }
    agree('failure', { ...failure, attempt: ' ' }, true); // Existing minLength, no new whitespace rule.
  });

  it('B03: failure conditions and fixed reference shapes are public schema rules', () => {
    agree('failure', { ...failure, evidence_refs: [] }, false);
    const { evidence_state: _state, ...missingState } = failure; agree('failure', missingState, false);
    for (const reason of [undefined, '', ' \n', 'x'.repeat(1001)]) agree('failure', { ...failure, evidence_state: 'unverified', evidence_missing_reason: reason }, false);
    agree('failure', { ...failure, evidence_state: 'unverified', evidence_missing_reason: 'x'.repeat(1000), evidence_refs: [] }, true);
    agree('failure', { ...failure, evidence_refs: [{ kind: 'artifact', artifact_id: 'a' }] }, true);
    for (const evidence_refs of [[{ kind: 'post', post_id: 'p', revision: 0 }], [{ kind: 'post', post_id: 'p', revision: '1' }], [{ kind: 'artifact', artifact_id: '', extra: 1 }], [{ kind: 'post', post_id: 'p', revision: 1, extra: 1 }]]) agree('failure', { ...failure, evidence_refs }, false);
    for (const source_refs of [[], [{ post_id: '', revision: 1 }], [{ post_id: 'p', revision: 1, extra: 1 }], [{ post_id: 'p', revision: 1.5 }]]) agree('summary', { source_refs }, false);
    agree('summary', { ...summary, extra: 1 }, false);
  });

  it('B04: legacy broad structured payload remains wire-compatible in all three HTTP/tool branches without defaults', () => {
    const legacy = { ...failure, evidence_refs: [] }; delete (legacy as Partial<typeof failure>).evidence_state;
    const requests = [
      [CreatePostRequestSchema, { ...base, kind: 'failure', structured: legacy }],
      [CreateThreadRequestSchema, { title: 'thread', initial_post: { ...base, kind: 'failure', structured: legacy } }],
      [CreatePostRevisionRequestSchema, { ...base, expected_revision: 1, structured: legacy }],
      [ToolPublishParamsSchema, { ...base, op: 'post', space_id: 's', thread_id: 't', request_key: 'old', kind: 'failure', structured: legacy }],
      [ToolPublishParamsSchema, { op: 'thread', space_id: 's', request_key: 'old', title: 'thread', initial_post: { ...base, kind: 'failure', structured: legacy } }],
      [ToolPublishParamsSchema, { ...base, op: 'revision', space_id: 's', post_id: 'p', request_key: 'old', expected_revision: 1, structured: legacy }],
    ] as const;
    for (const [schema, request] of requests) {
      const before = JSON.stringify(request); expect(Value.Check(schema, request)).toBe(true); expect(ajv.compile(schema)(request)).toBe(true); expect(JSON.stringify(request)).toBe(before);
    }
    agree('failure', legacy, false);
  });

  it('B05: OpenAPI preserves wire schemas and publishes honest new action components and tool policy', () => {
    const spec = generateOpenApiSpec() as any;
    const paths = ['/spaces/{space_id}/threads', '/spaces/{space_id}/threads/{id}/posts', '/spaces/{space_id}/posts/{id}/revisions'];
    for (const path of paths) {
      const operation = spec.paths[path].post;
      expect(operation['x-new-write-policy'].schemas).toEqual(Object.fromEntries(Object.keys(NEW_TYPED_STRUCTURED_SCHEMAS).map(kind => [kind, `#/components/schemas/NewWrite${kind[0].toUpperCase()}${kind.slice(1)}Structured`])));
      expect(operation.description).toContain('历史');
    }
    expect(spec.paths[paths[0]].post['x-new-write-policy'].kind_source).toBe('initial_post.kind');
    expect(spec.paths[paths[2]].post['x-new-write-policy'].kind_source).toBe('stored post.kind');
    for (const [kind, schema] of Object.entries(NEW_TYPED_STRUCTURED_SCHEMAS)) expect(spec.components.schemas[`NewWrite${kind[0].toUpperCase()}${kind.slice(1)}Structured`]).toEqual(schema);
    expect(spec.paths[paths[1]].post.requestBody.content['application/json'].schema).toEqual(CreatePostRequestSchema);
    expect(DETUNED_TOOLS.find(t => t.name === 'forum_publish')?.description).toContain('历史');
  });
});
