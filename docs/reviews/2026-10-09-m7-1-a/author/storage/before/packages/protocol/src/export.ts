import { Type, type Static, type TProperties } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { POST_KINDS } from './posts.js';
import { PostRefSchema } from './common.js';
import { ApiErrorResponseSchema, type ApiErrorResponse } from './errors.js';
import { RelationTypeSchema } from './relations.js';

export const EXPORT_LIMITS = { max_raw_bytes: 1048576, max_line_bytes: 1048576, max_total_bytes: 536870912, max_records: 2000000, deadline_ms: 120000, max_active: 4 } as const;
const id = Type.String({ minLength: 1, maxLength: 512 });
const positive = Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER });
const count = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
const date = Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$' });
const hash = Type.String({ pattern: '^[0-9a-f]{64}$' });
const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const state = Type.Union([Type.Literal('open'), Type.Literal('archived')]);
const projected = Type.Optional(Type.Literal(true));
const legacyHeader = object({ type: Type.Literal('header'), format: Type.Literal('detuned-space-export'), version: Type.Literal(1), export_id: Type.String({ pattern: '^exp_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' }), created_at: date, source: object({ space_id: id, schema_version: Type.Literal(2), snapshot_event_seq: Type.String({ pattern: '^(0|[1-9][0-9]*)$' }), space_revision: positive }), identity_semantics: Type.Literal('source_actor_ids_only'), scope: Type.Literal('public_research'), formal_review_status: Type.Literal('not_enabled'), formal_check_status: Type.Literal('not_enabled'), hash_algorithm: Type.Literal('sha256-chain-v1') });
const currentHeader = object({ type: Type.Literal('header'), format: Type.Literal('detuned-space-export'), version: Type.Literal(2), export_id: Type.String({ pattern: '^exp_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' }), created_at: date, source: object({ space_id: id, schema_version: Type.Union([Type.Literal(3), Type.Literal(4), Type.Literal(5)]), snapshot_event_seq: Type.String({ pattern: '^(0|[1-9][0-9]*)$' }), space_revision: positive }), identity_semantics: Type.Literal('source_actor_ids_only'), scope: Type.Literal('public_research'), formal_review_status: Type.Literal('excluded'), formal_check_status: Type.Literal('excluded'), hash_algorithm: Type.Literal('sha256-chain-v1') });
export const SpaceExportHeaderSchema = Type.Union([legacyHeader, currentHeader]);
const dataSchemas = {
  space: object({ id, slug: Type.String(), current_revision: positive, policy_revision: positive, created_at: date }),
  space_revision: object({ space_id: id, revision: positive, objective: Type.String(), rules: Type.Array(Type.String()), review_policy: Type.Record(Type.String(), Type.Unknown()), check_profiles: Type.Record(Type.String(), Type.Unknown()), pinned_refs: Type.Array(PostRefSchema), editor_id: id, created_at: date, projected }),
  thread: object({ id, space_id: id, title: Type.String(), version: positive, state, creator_id: id, created_at: date, updated_at: date }),
  thread_version: object({ thread_id: id, version: positive, title: Type.String(), state, created_at: date }),
  post: Type.Union([object({ id, space_id: id, thread_id: id, author_id: id, kind: Type.Union(POST_KINDS.map(kind => Type.Literal(kind))), current_revision: positive, lifecycle: Type.Union([Type.Literal('active'), Type.Literal('withdrawn')]), created_at: date }), object({ id, space_id: id, thread_id: id, current_revision: positive, lifecycle: Type.Literal('redacted'), tombstone: Type.Literal(true) })]),
  post_revision: Type.Union([object({ post_id: id, revision: positive, title: Type.String(), summary: Type.String(), body: Type.String(), tags: Type.Array(Type.String()), structured: Type.Record(Type.String(), Type.Unknown()), editor_id: id, created_at: date, source_content_hash: Type.Optional(hash), projected }), object({ post_id: id, revision: positive, tombstone: Type.Literal(true) })]),
  relation: object({ id, space_id: id, source_post_id: id, source_revision: positive, target_post_id: id, target_revision: positive, type: RelationTypeSchema, state: Type.Union([Type.Literal('open'), Type.Literal('resolved')]), version: positive, creator_id: id, created_at: date }),
  relation_resolution: object({ id, relation_id: id, version: positive, resolver_id: id, reason_ref: PostRefSchema, action: Type.Union([Type.Literal('resolve'), Type.Literal('reopen')]), created_at: date }),
  revision_artifact: object({ post_id: id, revision: positive, artifact_id: id, purpose: Type.String() }),
  artifact: Type.Union([object({ id, space_id: id, owner_id: id, visibility: Type.Literal('space'), sha256: hash, bytes: count, mime: Type.String(), state: Type.Literal('ready'), created_at: date, content_url: Type.String() }), object({ id, space_id: id, state: Type.Union([Type.Literal('redacted'), Type.Literal('missing')]), tombstone: Type.Literal(true) })]),
};
export const SpaceExportRecordSchema = Type.Union(Object.entries(dataSchemas).map(([kind, data]) => object({ type: Type.Literal('record'), seq: positive, kind: Type.Literal(kind), data })));
export const SpaceExportEndSchema = object({ type: Type.Literal('end'), complete: Type.Literal(true), record_count: count, bytes_before_end: count, chain_sha256: hash });
export const SpaceExportLineSchema = Type.Union([SpaceExportHeaderSchema, SpaceExportRecordSchema, SpaceExportEndSchema]);
export const SpaceExportQuerySchema = object({ format: Type.Optional(Type.Literal('ndjson')) });
export type SpaceExportHeader = Static<typeof SpaceExportHeaderSchema>;
export type SpaceExportRecord = Static<typeof SpaceExportRecordSchema>;
export type SpaceExportEnd = Static<typeof SpaceExportEndSchema>;
export type SpaceExportLine = Static<typeof SpaceExportLineSchema>;
export interface SpaceExportComplete { header: SpaceExportHeader; end: SpaceExportEnd; bytes: number }
export function validateSpaceExportLine(value: unknown): value is SpaceExportLine {
  if (!Value.Check(SpaceExportLineSchema, value)) return false;
  const line = value as SpaceExportLine;
  if (line.type === 'header' && (!Number.isFinite(Date.parse(line.created_at)) || new Date(line.created_at).toISOString() !== line.created_at)) return false;
  if (line.type === 'record' && line.kind === 'post_revision' && !('tombstone' in line.data)) {
    if (Object.hasOwn(line.data, 'projected') ? Object.hasOwn(line.data, 'source_content_hash') : !Object.hasOwn(line.data, 'source_content_hash')) return false;
  }
  return true;
}

/** Fixed public vector: exact UTF-8 lines include LF; zero raw32 seed, end excluded. */
export const SPACE_EXPORT_HASH_VECTOR = {
  "lines": [
    "{\"type\":\"header\",\"format\":\"detuned-space-export\",\"version\":1,\"export_id\":\"exp_00000000-0000-0000-0000-000000000001\",\"created_at\":\"2026-10-06T00:00:00.000Z\",\"source\":{\"space_id\":\"space-vector\",\"schema_version\":2,\"snapshot_event_seq\":\"0\",\"space_revision\":1},\"identity_semantics\":\"source_actor_ids_only\",\"scope\":\"public_research\",\"formal_review_status\":\"not_enabled\",\"formal_check_status\":\"not_enabled\",\"hash_algorithm\":\"sha256-chain-v1\"}\n",
    "{\"type\":\"record\",\"seq\":1,\"kind\":\"space\",\"data\":{\"id\":\"space-vector\",\"slug\":\"unicode-中文🙂\",\"current_revision\":1,\"policy_revision\":1,\"created_at\":\"2026-10-06T00:00:00.000Z\"}}\n"
  ],
  "bytes_before_end": 615,
  "record_count": 1,
  "chain_sha256": "5e7fc520f524e978da985e777305b2d3cc66c563daccf9a0598c07f81474731c"
} as const;

export function validateSpaceExportError(value: unknown): value is ApiErrorResponse { return Value.Check(ApiErrorResponseSchema, value); }
