import { ReviewPhaseSchema, ReviewStatusViewSchema, ReviewRoundSummarySchema } from './review.js';
import { ThreadSchema } from './threads.js';
import { SpaceRevisionRefSchema } from './spaces.js';
import { CONTEXT_BYTES } from './request-policies.js';
import { Type } from '@sinclair/typebox';
import { PostKindSchema, FailureCategorySchema, FailureStructuredSchema, ProposalClaimStructuredSchema } from './posts.js';
import { Value } from '@sinclair/typebox/value';
import { PostRefSchema } from './common.js';
import { RelationStateSchema } from './relations.js';
import { DetunedError, ErrorCode } from './errors.js';
export const SEARCH_LIMITS = Object.freeze({
    q_codepoints: 256, tags_json_bytes: 8192, unique_tags: 100, cursor_chars: 4096,
    candidates: 5000, response_bytes: 262144, cursor_ttl_seconds: 86400,
});
// Explicit surrogate-pair alternatives count code points with both Unicode and
// non-Unicode RegExp compilers. Outer whitespace is transport-compatible; core trims it.
export const SearchQStringSchema = Type.String({
    pattern: '^\\s*(?=\\S)(?:[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]|[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|[^\\uD800-\\uDBFF]){1,256}\\s*$',
    description: 'Trim outer whitespace; 1–256 Unicode code points. No NFC/case normalization.',
});
export const SearchTagsSchema = Type.Array(Type.String(), {
    description: 'Exact case-sensitive strings; JSON UTF-8 <=8192 bytes before deduplication, <=100 unique tags. Empty array disables filtering.',
    'x-max-json-utf8-bytes': SEARCH_LIMITS.tags_json_bytes,
    'x-max-unique-items': SEARCH_LIMITS.unique_tags,
});
export const SearchCursorStringSchema = Type.String({ minLength: 1, maxLength: SEARCH_LIMITS.cursor_chars, pattern: '\\S' });
export const SearchFilterSchema = Type.Object({
    kind: Type.Optional(PostKindSchema), tags: Type.Optional(SearchTagsSchema),
    thread_id: Type.Optional(Type.String({ pattern: '\\S' })),
}, { additionalProperties: false });
export const SearchQuerySchema = Type.Object({
    q: SearchQStringSchema, ...SearchFilterSchema.properties,
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    cursor: Type.Optional(SearchCursorStringSchema),
}, { additionalProperties: false });
export const SEARCH_CURSOR_ERROR_MESSAGE = '搜索游标无效，请去掉 cursor 重新获取第一页。';
export function normalizeSearchQuery(query) {
    const invalid = (message) => { throw new DetunedError(ErrorCode.VALIDATION_ERROR, message, 400, false); };
    if (query?.cursor !== undefined && (typeof query.cursor !== 'string' || !query.cursor.trim() || query.cursor.length > SEARCH_LIMITS.cursor_chars))
        invalid(SEARCH_CURSOR_ERROR_MESSAGE);
    if (!Value.Check(SearchQuerySchema, query))
        invalid('搜索参数不符合结构或长度规则。');
    const q = query.q.trim();
    if (!q || Array.from(q).length > SEARCH_LIMITS.q_codepoints)
        invalid('搜索关键词需为1–256个Unicode码点。');
    const rawTags = query.tags ?? [];
    if (new TextEncoder().encode(JSON.stringify(rawTags)).byteLength > SEARCH_LIMITS.tags_json_bytes)
        invalid('搜索标签JSON超过8192字节。');
    const tags = [...new Set(rawTags)].sort();
    if (tags.length > SEARCH_LIMITS.unique_tags)
        invalid('搜索标签超过100个不同值。');
    return { ...query, q, tags, limit: query.limit ?? 20 };
}
export const SearchCursorPayloadSchema = Type.Object({
    v: Type.Literal(1), purpose: Type.Literal('search'), actor_id: Type.String({ pattern: '\\S' }),
    space_id: Type.String({ pattern: '\\S' }), query_hash: Type.String({ pattern: '^[a-f0-9]{64}$' }),
    sort: Type.Literal('id_desc'), before_id: Type.String({ pattern: '\\S' }),
    exp: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
}, { additionalProperties: false });
export function isSearchCursorPayload(value) { return Value.Check(SearchCursorPayloadSchema, value); }
export const SearchResultItemSchema = Type.Object({
    post_id: Type.String(),
    revision: Type.Integer({ minimum: 1 }),
    thread_id: Type.String(),
    kind: PostKindSchema,
    title: Type.String(),
    summary: Type.String(),
    tags: Type.Array(Type.String()),
    snippet: Type.String(),
    created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });
export const SearchResponseDataSchema = Type.Array(SearchResultItemSchema);
export const SearchResponseMetaSchema = Type.Object({ truncated: Type.Literal(false), next_cursor: Type.Union([SearchCursorStringSchema, Type.Null()]) }, { additionalProperties: false });
export const SearchPageSchema = Type.Object({ data: SearchResponseDataSchema, meta: SearchResponseMetaSchema }, { additionalProperties: false });
export const ContextQuerySchema = Type.Object({
    max_bytes: Type.Optional(Type.Integer({ ...CONTEXT_BYTES })),
    focus_thread_id: Type.Optional(Type.String({ minLength: 1, pattern: '\\S', description: 'Focus on a readable thread in the same space; omitted preserves space context.' })),
}, { additionalProperties: false });
// Read projections deliberately accept explicit nulls for unknown historical fields.
// They do not validate/migrate historical material using the strict new-write parser.
const nullable = (schema) => Type.Union([schema, Type.Null()]);
const missingFields = (names) => Type.Array(Type.Union(names.map(name => Type.Literal(name))), { uniqueItems: true });
const nonblank = (maxLength) => Type.String({ minLength: 1, maxLength, pattern: '\\S' });
export const SourceStatusSchema = Type.Union([
    ...['active', 'withdrawn'].map(status => Type.Object({
        ref: PostRefSchema, status: Type.Literal(status), has_newer_revision: Type.Boolean(),
    }, { additionalProperties: false })),
    ...['redacted', 'unavailable'].map(status => Type.Object({
        ref: PostRefSchema, status: Type.Literal(status), has_newer_revision: Type.Null(),
    }, { additionalProperties: false })),
]);
const relationFields = {
    relation_id: Type.String(),
    relation_type: Type.Union([Type.Literal('supports'), Type.Literal('challenges'), Type.Literal('reproduces')]),
    source_ref: PostRefSchema, target_ref: PostRefSchema,
    creator_id: Type.String(), source_author_id: Type.String(), target_author_id: Type.String(),
    state: RelationStateSchema, version: Type.Integer({ minimum: 1 }),
};
const endpointStatuses = ['active', 'withdrawn', 'redacted'];
// Nine flat variants preserve existing refs and enforce each endpoint's unknown-version state.
function mergeProperties(base, extra) {
    // Object spread replaces keys; an A & B type would incorrectly intersect schema literals.
    return { ...base, ...extra };
}
function relationVariants(extra) {
    const fields = mergeProperties(relationFields, extra);
    return endpointStatuses.flatMap(sourceStatus => endpointStatuses.map(targetStatus => Type.Object({
        ...fields,
        source_status: Type.Literal(sourceStatus), target_status: Type.Literal(targetStatus),
        source_has_newer_revision: sourceStatus === 'redacted' ? Type.Null() : Type.Boolean(),
        target_has_newer_revision: targetStatus === 'redacted' ? Type.Null() : Type.Boolean(),
    }, { additionalProperties: false })));
}
export const RelationProjectionSchema = Type.Union(relationVariants({}));
export const ClaimMaterialSchema = Type.Object({
    statement: nullable(nonblank(5000)), assumptions: nullable(ProposalClaimStructuredSchema.properties.assumptions),
    scope: nullable(nonblank(1000)), falsification_plan: nullable(nonblank(2000)),
    missing_fields: missingFields(['statement', 'assumptions', 'scope', 'falsification_plan']),
}, { additionalProperties: false });
const failure = FailureStructuredSchema.properties;
export const FailureMaterialSchema = Type.Object({
    attempt: nullable(failure.attempt), category: nullable(FailureCategorySchema),
    assumptions: nullable(failure.assumptions), tested_scope: nullable(failure.tested_scope),
    expected: nullable(failure.expected), observed: nullable(failure.observed),
    evidence_refs: nullable(failure.evidence_refs), evidence_state: nullable(failure.evidence_state),
    evidence_missing_reason: nullable(Type.String({ maxLength: 1000 })),
    ruled_out: nullable(failure.ruled_out), not_ruled_out: nullable(failure.not_ruled_out), retry_when: nullable(failure.retry_when),
    missing_fields: missingFields(['attempt', 'category', 'assumptions', 'tested_scope', 'expected', 'observed', 'evidence_refs', 'evidence_state', 'evidence_missing_reason', 'ruled_out', 'not_ruled_out', 'retry_when']),
}, { additionalProperties: false });
const reportFlags = {
    report_kind: Type.Literal('author_report'),
    formal_review_status: Type.Union([Type.Literal('not_enabled'), Type.Literal('not_requested'), ReviewPhaseSchema]),
    formal_check_status: Type.Union([Type.Literal('not_enabled'), Type.Literal('not_requested'), ReviewStatusViewSchema.properties.verification_status]),
    formal_review: Type.Union([ReviewRoundSummarySchema, Type.Null()]),
};
export const FindingViewItemSchema = Type.Object({
    ...SearchResultItemSchema.properties, type: Type.Literal('claim'), kind: Type.Literal('claim'),
    ...reportFlags, material: ClaimMaterialSchema, relations: Type.Array(RelationProjectionSchema),
}, { additionalProperties: false });
export const FailureViewItemSchema = Type.Object({
    ...SearchResultItemSchema.properties, type: Type.Literal('failure'), kind: Type.Literal('failure'),
    ...reportFlags, material: FailureMaterialSchema, relations: Type.Array(RelationProjectionSchema),
}, { additionalProperties: false });
export const QuestionViewItemSchema = Type.Object({
    ...SearchResultItemSchema.properties, type: Type.Literal('question'), kind: Type.Literal('question'),
}, { additionalProperties: false });
const openChallengeFields = { type: Type.Literal('open_challenge'), relation_type: Type.Literal('challenges'), state: Type.Literal('open') };
export const OpenChallengeViewItemSchema = Type.Union(relationVariants(openChallengeFields));
export const VIEW_RESPONSE_DATA_SCHEMAS = {
    findings: Type.Array(FindingViewItemSchema), failures: Type.Array(FailureViewItemSchema),
    'open-questions': Type.Array(Type.Union([QuestionViewItemSchema, OpenChallengeViewItemSchema])),
};
export const ViewResponseDataSchema = Type.Union(Object.values(VIEW_RESPONSE_DATA_SCHEMAS));
export const PinnedSummarySchema = Type.Object({
    ref: PostRefSchema, title: Type.String(), summary: Type.String(), has_newer_revision: Type.Boolean(),
    source_refs: nullable(Type.Array(SourceStatusSchema, { minItems: 1 })), missing_fields: missingFields(['source_refs']),
}, { additionalProperties: false });
export const RecentFailureSchema = Type.Object({
    ref: PostRefSchema, title: Type.String(), category: nullable(FailureCategorySchema),
    attempt: nullable(failure.attempt), tested_scope: nullable(failure.tested_scope), evidence_state: nullable(failure.evidence_state),
    missing_fields: missingFields(['category', 'attempt', 'tested_scope', 'evidence_state']),
    report_kind: Type.Literal('author_report'),
}, { additionalProperties: false });
export const BlockingObjectionSchema = Type.Union(relationVariants(openChallengeFields).map(schema => {
    const redacted = schema.properties.source_status.const === 'redacted' || schema.properties.target_status.const === 'redacted';
    return Type.Object({
        ...schema.properties,
        issue: redacted ? Type.Null() : nullable(Type.String()),
        impact: redacted ? Type.Null() : nullable(Type.String()),
        missing_fields: Type.Array(Type.Union([Type.Literal('issue'), Type.Literal('impact')]), {
            uniqueItems: true, ...(redacted ? { minItems: 2, maxItems: 2 } : {}),
        }),
    }, { additionalProperties: false });
}));
export const ContextFocusThreadSchema = Type.Object({ ...ThreadSchema.properties, title: Type.String() }, { additionalProperties: false });
const contextDataFields = {
    focus_thread: Type.Optional(ContextFocusThreadSchema),
    space_id: Type.String(), slug: Type.String(),
    policy_revision: Type.Integer({ minimum: 1 }),
    pinned_summaries: Type.Array(PinnedSummarySchema), blocking_objections: Type.Array(BlockingObjectionSchema),
    recent_failures: Type.Array(RecentFailureSchema),
    recent_activity: Type.Array(Type.Object({
        type: Type.String(), object_id: Type.String(), occurred_at: Type.String({ format: 'date-time' }),
    }, { additionalProperties: false })), checkpoint_token: Type.String(),
};
export const ContextIncludedDataSchema = Type.Object({ ...contextDataFields, space_revision_ref: SpaceRevisionRefSchema, space_content_status: Type.Literal('included'), objective: Type.String(), rules: Type.Array(Type.String()) }, { additionalProperties: false });
export const ContextOmittedDataSchema = Type.Object({ ...contextDataFields, space_revision_ref: SpaceRevisionRefSchema, space_content_status: Type.Literal('omitted_for_budget'), objective: Type.Null(), rules: Type.Null() }, { additionalProperties: false });
export const ContextResponseDataSchema = Type.Union([ContextIncludedDataSchema, ContextOmittedDataSchema]);
export const ContextResponseMetaSchema = Type.Object({ truncated: Type.Boolean(), next_cursor: Type.Null() }, { additionalProperties: false });
export const ContextPageSchema = Type.Union([
    Type.Object({ data: ContextIncludedDataSchema, meta: ContextResponseMetaSchema }, { additionalProperties: false }),
    Type.Object({ data: ContextOmittedDataSchema, meta: Type.Object({ truncated: Type.Literal(true), next_cursor: Type.Null() }, { additionalProperties: false }) }, { additionalProperties: false }),
]);
export const ContextEnvelopeSchema = Type.Union(ContextPageSchema.anyOf.map(page => Type.Object({ api_version: Type.Literal('1'), request_id: Type.String(), ...page.properties }, { additionalProperties: false })));
// One compact encoding is shared by core's byte accounting and HTTP transmission.
// Transport identity is supplied by the caller; no assumed UUID/header overhead.
export function buildContextEnvelope(requestId, page) {
    return { api_version: '1', request_id: requestId, ...page };
}
export function serializeContextEnvelope(requestId, page) {
    return JSON.stringify(buildContextEnvelope(requestId, page));
}
export function contextEnvelopeBytes(requestId, page) {
    return new TextEncoder().encode(serializeContextEnvelope(requestId, page)).byteLength;
}
export const ViewNameSchema = Type.Union([
    Type.Literal('failures'),
    Type.Literal('findings'),
    Type.Literal('open-questions'),
]);
/** Field-local historical shape guards: no defaults, authorization or lifecycle logic. */
export function isHistoricalMaterialField(kind, field, value) {
    const properties = kind === 'claim' ? ProposalClaimStructuredSchema.properties : FailureStructuredSchema.properties;
    const schema = Object.prototype.hasOwnProperty.call(properties, field) ? properties[field] : undefined;
    return schema !== undefined && Value.Check(schema, value);
}
export function isPostRef(value) {
    return Value.Check(PostRefSchema, value);
}
const HistoricalPostRefArraySchema = Type.Array(PostRefSchema, { minItems: 1 });
export function isPostRefArray(value) {
    return Value.Check(HistoricalPostRefArraySchema, value);
}
// Explicit public review source; the existing post query/normalization stays intact.
export const ReviewSubmissionSearchFilterSchema = Type.Object({
    request_id: Type.Optional(Type.String({ minLength: 1, pattern: '\\S' })),
    target_post_id: Type.Optional(Type.String({ minLength: 1, pattern: '\\S' })),
}, { additionalProperties: false });
export const ReviewSubmissionSearchQuerySchema = Type.Object({
    source: Type.Literal('review_submissions'), q: SearchQStringSchema,
    ...ReviewSubmissionSearchFilterSchema.properties,
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    cursor: Type.Optional(SearchCursorStringSchema),
}, { additionalProperties: false });
export const PostsSearchSourceQuerySchema = Type.Object({ ...SearchQuerySchema.properties, source: Type.Optional(Type.Literal('posts')) }, { additionalProperties: false });
export const SearchSourceQuerySchema = Type.Union([PostsSearchSourceQuerySchema, ReviewSubmissionSearchQuerySchema]);
export function validateSearchSourceQuery(value) {
    if (!Value.Check(SearchSourceQuerySchema, value))
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid search source or filter combination.', 400, false);
    if (value.source === 'review_submissions')
        normalizeReviewSubmissionSearchQuery(value);
    else {
        const { source: _source, ...query } = value;
        normalizeSearchQuery(query);
    }
}
export function foldReviewSearchText(value) { return value.replace(/[A-Z]/g, letter => letter.toLowerCase()); }
export function normalizeReviewSubmissionSearchQuery(query) {
    if (!Value.Check(ReviewSubmissionSearchQuerySchema, query))
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid public review search query.', 400, false);
    const q = foldReviewSearchText(query.q.trim());
    if (!q || Array.from(q).length > SEARCH_LIMITS.q_codepoints)
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid public review search query.', 400, false);
    return { ...query, q, limit: query.limit ?? 20 };
}
export const PublicReviewSubmissionSearchItemSchema = Type.Object({
    type: Type.Literal('review_submission'), submission_id: Type.String({ minLength: 1 }), space_id: Type.String({ minLength: 1 }),
    request_id: Type.String({ minLength: 1 }), snapshot_id: Type.String({ minLength: 1 }), target_ref: Type.Object({ ...PostRefSchema.properties, revision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }) }, { additionalProperties: false }),
    round: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }), reviewer_actor_id: Type.String({ minLength: 1 }),
    verdict: Type.Union([Type.Literal('accept'), Type.Literal('changes_requested'), Type.Literal('reject')]),
    submitted_at: Type.String({ format: 'date-time' }), revealed_at: Type.String({ format: 'date-time' }),
    snippet: Type.String({ 'x-max-codepoints': 320 }),
}, { additionalProperties: false });
export const PublicReviewSubmissionSearchPageSchema = Type.Object({
    data: Type.Array(PublicReviewSubmissionSearchItemSchema, { maxItems: 100 }), meta: SearchResponseMetaSchema,
}, { additionalProperties: false });
export const ReviewSubmissionSearchCursorPayloadSchema = Type.Object({
    v: Type.Literal(1), purpose: Type.Literal('review_submission_search'), source: Type.Literal('review_submissions'),
    actor_id: Type.String({ minLength: 1 }), space_id: Type.String({ minLength: 1 }), query_hash: Type.String({ pattern: '^[a-f0-9]{64}$' }),
    sort: Type.Literal('submission_id_desc'), before_submission_id: Type.String({ minLength: 1 }),
    exp: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
}, { additionalProperties: false });
export function isReviewSubmissionSearchCursorPayload(value) { return Value.Check(ReviewSubmissionSearchCursorPayloadSchema, value) && [value.actor_id, value.space_id, value.before_submission_id].every(isUnicodeReviewId); }
/** SQLite UTF-8 TEXT/BINARY order, shared by service and wire guards; no locale collation. */
export function compareReviewSubmissionIds(a, b) {
    const left = new TextEncoder().encode(a), right = new TextEncoder().encode(b);
    for (let i = 0; i < Math.min(left.length, right.length); i++)
        if (left[i] !== right[i])
            return left[i] < right[i] ? -1 : 1;
    return left.length < right.length ? -1 : left.length > right.length ? 1 : 0;
}
export function isUnicodeReviewId(value) {
    return value.length > 0 && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(value);
}
//# sourceMappingURL=search.js.map