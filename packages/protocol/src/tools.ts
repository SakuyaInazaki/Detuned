import {RelationHistoryQuerySchema} from './relation-history.js';
import {ArtifactContentQuerySchema,validateArtifactContentQuery} from './evidence-reads.js';
import {RevisionArtifactsQuerySchema} from './post-catalogs.js';
import {ViewNameSchema} from './search.js';
import {PostRelationsQuerySchema,ConsumerLookupQuerySchema} from './discovery-reads.js';
import {schemaValidationError} from './validation-issues.js';
import { ReviewSubmissionSearchFilterSchema, validateSearchSourceQuery } from './search.js';
import { ThreadPostsReadQuerySchema } from './threads.js';
import { Value } from '@sinclair/typebox/value';
import { DetunedError, ErrorCode } from './errors.js';
import { CreateSessionRequestSchema, SpaceRevisionReadQuerySchema } from './spaces.js';
import { ContextQuerySchema, SearchQStringSchema, SearchFilterSchema, SearchCursorStringSchema } from './search.js';
import { Type, Static, TSchema } from '@sinclair/typebox';
import { PostRevisionReadQuerySchema, PostKindSchema, StructuredContentSchema, NEW_TYPED_WRITE_POLICY_DESCRIPTION } from './posts.js';
import { PostRefSchema } from './common.js';
import { RelationTypeSchema } from './relations.js';
import { EventTypeSchema, SubscriptionStartSchema, SubscriptionStartConstraintSchema, isSubscriptionStartValid } from './events.js';
import { CreateCheckRunSchema, InvalidateCheckRunSchema, PostReviewRequestsQuerySchema, CreateReviewRequestSchema, CreateReviewSubmissionSchema, CancelReviewRequestSchema, FinalizeReviewRequestSchema } from './review.js';

export const ToolContextParamsSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  ...ContextQuerySchema.properties,
}, { additionalProperties: false });

export type ToolContextParams = Static<typeof ToolContextParamsSchema>;
export function validateToolContextParams(value: unknown): asserts value is ToolContextParams {
  if (!Value.Check(ToolContextParamsSchema, value)) throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid forum_context parameters.', 400, false);
}

const ToolPostsSearchParamsSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }), q: SearchQStringSchema,
  source: Type.Optional(Type.Literal('posts')), filters: Type.Optional(SearchFilterSchema),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })), cursor: Type.Optional(SearchCursorStringSchema),
}, { additionalProperties: false });
const ToolReviewSearchParamsSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }), q: SearchQStringSchema,
  source: Type.Literal('review_submissions'), filters: Type.Optional(ReviewSubmissionSearchFilterSchema),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })), cursor: Type.Optional(SearchCursorStringSchema),
}, { additionalProperties: false });
export const ToolSearchParamsUnion = Type.Union([ToolPostsSearchParamsSchema, ToolReviewSearchParamsSchema]);
// Common property projection preserves existing MCP schema introspection; anyOf remains authoritative.
export const ToolSearchParamsSchema: TSchema = { ...ToolSearchParamsUnion, type: 'object', properties: {
  space_id: ToolPostsSearchParamsSchema.properties.space_id, q: ToolPostsSearchParamsSchema.properties.q,
  limit: ToolPostsSearchParamsSchema.properties.limit, cursor: ToolPostsSearchParamsSchema.properties.cursor,
} };
export type ToolSearchParams = Static<typeof ToolSearchParamsUnion>;

export const ToolReadParamsUnion = Type.Union([
  Type.Object({kind:Type.Literal('relation_history'),space_id:Type.String({minLength:1}),id:Type.String({minLength:1}),...RelationHistoryQuerySchema.properties},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('artifact_content'),space_id:Type.String({minLength:1}),id:Type.String({minLength:1}),...ArtifactContentQuerySchema.properties},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('post_revision_artifacts'),space_id:Type.String({minLength:1}),id:Type.String({minLength:1}),revision:Type.Integer({minimum:1,maximum:Number.MAX_SAFE_INTEGER}),...RevisionArtifactsQuerySchema.properties},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('view'),space_id:Type.String({minLength:1}),name:ViewNameSchema},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('me')},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('spaces'),limit:Type.Optional(Type.Integer({minimum:1,maximum:100})),cursor:Type.Optional(Type.String({minLength:1}))},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('relation'),space_id:Type.String({minLength:1}),id:Type.String({minLength:1})},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('post_relations'),space_id:Type.String({minLength:1}),id:Type.String({minLength:1}),revision:Type.Integer({minimum:1,maximum:Number.MAX_SAFE_INTEGER}),...PostRelationsQuerySchema.properties},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('consumer_lookup'),space_id:Type.String({minLength:1}),...ConsumerLookupQuerySchema.properties},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('check_run'),space_id:Type.String({minLength:1}),id:Type.String({minLength:1})},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('check_snapshot'),space_id:Type.String({minLength:1}),id:Type.String({minLength:1})},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('check_receipt'),space_id:Type.String({minLength:1}),id:Type.String({minLength:1})},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('required_checks'),space_id:Type.String({minLength:1}),id:Type.String({minLength:1})},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('check_post_revision'),space_id:Type.String({minLength:1}),id:Type.String({minLength:1}),run_id:Type.String({minLength:1}),revision:Type.Integer({minimum:1,maximum:Number.MAX_SAFE_INTEGER})},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('check_artifact'),space_id:Type.String({minLength:1}),id:Type.String({minLength:1}),run_id:Type.String({minLength:1})},{additionalProperties:false}),
  Type.Object({kind:Type.Literal('review_requests'),space_id:Type.String({minLength:1}),id:Type.String({minLength:1}),...PostReviewRequestsQuerySchema.properties},{additionalProperties:false}),
  Type.Object({ kind: Type.Literal('thread_posts'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1 }), ...ThreadPostsReadQuerySchema.properties }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('space'), space_id: Type.String({ minLength: 1 }), revision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }), ...SpaceRevisionReadQuerySchema.properties }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('post_revision'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1 }), revision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }), ...PostRevisionReadQuerySchema.properties }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('post'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1 }), revision: Type.Optional(Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER })) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('review_request'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1, description: '评审请求ID，来自请求返回的id或本人assignment.request_id。' }) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('review_snapshot'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1, description: '固定快照ID，来自本人assignment.snapshot_id或请求snapshot_id；不是request_id。快照读取返回snapshot_id，不是id。' }) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('review_assignment'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1, description: '评审请求ID，来自请求返回的id；不是assignment自身id。' }) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('review_submission'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1, description: '单份意见ID，来自提交确认或可见意见的submission_id；输入参数名为id，不是submission_id。' }) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('review_submissions'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1, description: '评审请求ID；返回该请求当前可见的意见列表，不是单份submission_id。' }) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('review_status'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1, description: '评审请求ID，来自请求返回的id或assignment.request_id。' }) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('review_decision'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1, description: '评审请求ID；不是裁决自身ID。' }) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('artifact'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1 }) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('thread'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1 }) }, { additionalProperties: false }),
]);
// Preserve Union Kind/anyOf for local validators, with the MCP object root.
export const ToolReadParamsSchema: TSchema = { ...ToolReadParamsUnion, type: 'object' };
export type ToolReadParams = Static<typeof ToolReadParamsUnion>;
export function validateToolReadParams(value: unknown): asserts value is ToolReadParams {
  if (!Value.Check(ToolReadParamsUnion, value)) throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'forum_read 参数组合不合法；thread_posts支持limit/cursor/max_bytes/sort；space/post_revision 需显式revision，post/thread不支持cursor/max_bytes，review/artifact/check_artifact只读metadata；artifact_content显式读取有界完整校验内容，不读取文件路径。', 400, false);
  if(value.kind==='artifact_content'){const {kind:_kind,space_id:_space,id:_id,...query}=value;validateArtifactContentQuery(query);}
}

export const ToolPublishThreadOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  op: Type.Literal('thread'),
  title: Type.String({ minLength: 1, maxLength: 160 }),
  initial_post: Type.Optional(Type.Object({
    kind: PostKindSchema,
    title: Type.String({ minLength: 1, maxLength: 160 }),
    summary: Type.String({ minLength: 1, maxLength: 280 }),
    body: Type.String({ maxLength: 65536 }),
    tags: Type.Optional(Type.Array(Type.String())),
    structured: Type.Optional(StructuredContentSchema),
    refs: Type.Optional(Type.Array(Type.Object({
      target_ref: PostRefSchema,
      type: RelationTypeSchema,
    }, { additionalProperties: false }))),
    artifact_ids: Type.Optional(Type.Array(Type.String(), { uniqueItems: true })),
  }, { additionalProperties: false })),
}, { additionalProperties: false });

export const ToolPublishPostOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  op: Type.Literal('post'),
  thread_id: Type.String({ minLength: 1 }),
  kind: PostKindSchema,
  title: Type.String({ minLength: 1, maxLength: 160 }),
  summary: Type.String({ minLength: 1, maxLength: 280 }),
  body: Type.String({ maxLength: 65536 }),
  tags: Type.Optional(Type.Array(Type.String())),
  structured: Type.Optional(StructuredContentSchema),
  refs: Type.Optional(Type.Array(Type.Object({
    target_ref: PostRefSchema,
    type: RelationTypeSchema,
  }, { additionalProperties: false }))),
  artifact_ids: Type.Optional(Type.Array(Type.String(), { uniqueItems: true })),
}, { additionalProperties: false });

export const ToolPublishRevisionOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  op: Type.Literal('revision'),
  post_id: Type.String({ minLength: 1 }),
  expected_revision: Type.Integer({ minimum: 1 }),
  title: Type.String({ minLength: 1, maxLength: 160 }),
  summary: Type.String({ minLength: 1, maxLength: 280 }),
  body: Type.String({ maxLength: 65536 }),
  tags: Type.Optional(Type.Array(Type.String())),
  structured: Type.Optional(StructuredContentSchema),
  refs: Type.Optional(Type.Array(Type.Object({
    target_ref: PostRefSchema,
    type: RelationTypeSchema,
  }, { additionalProperties: false }))),
  artifact_ids: Type.Optional(Type.Array(Type.String(), { uniqueItems: true })),
}, { additionalProperties: false });

export const ToolPublishWithdrawOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  op: Type.Literal('withdraw'),
  post_id: Type.String({ minLength: 1 }),
  expected_revision: Type.Integer({ minimum: 1 }),
  reason: Type.String({ minLength: 1, maxLength: 500 }),
}, { additionalProperties: false });

export const ToolPublishParamsUnion = Type.Union([
  ToolPublishThreadOpSchema,
  ToolPublishPostOpSchema,
  ToolPublishRevisionOpSchema,
  ToolPublishWithdrawOpSchema,
]);

export const ToolPublishParamsSchema: TSchema = {
  ...ToolPublishParamsUnion,
  type: 'object',
};

export type ToolPublishParams = Static<typeof ToolPublishParamsUnion>;

export const ToolRelateCreateOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  op: Type.Literal('create'),
  source_ref: PostRefSchema,
  target_ref: PostRefSchema,
  type: RelationTypeSchema,
}, { additionalProperties: false });

export const ToolRelateResolveOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  op: Type.Literal('resolve'),
  relation_id: Type.String({ minLength: 1 }),
  expected_version: Type.Integer({ minimum: 1 }),
  reason_ref: PostRefSchema,
}, { additionalProperties: false });

export const ToolRelateReopenOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  op: Type.Literal('reopen'),
  relation_id: Type.String({ minLength: 1 }),
  expected_version: Type.Integer({ minimum: 1 }),
  reason_ref: PostRefSchema,
}, { additionalProperties: false });

export const ToolRelateParamsUnion = Type.Union([
  ToolRelateCreateOpSchema,
  ToolRelateResolveOpSchema,
  ToolRelateReopenOpSchema,
]);

export const ToolRelateParamsSchema: TSchema = {
  ...ToolRelateParamsUnion,
  type: 'object',
};

export type ToolRelateParams = Static<typeof ToolRelateParamsUnion>;

const ToolSubscribeCreateSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  consumer_key: Type.String({ minLength: 1, maxLength: 64 }),
  thread_ids: Type.Optional(Type.Array(Type.String())),
  event_types: Type.Optional(Type.Array(EventTypeSchema)),
  start: Type.Optional(SubscriptionStartSchema),
  checkpoint_token: Type.Optional(Type.String({ minLength: 1 })),
}, { additionalProperties: false, allOf: [SubscriptionStartConstraintSchema] });

export const ToolSubscribeParamsUnion=Type.Union([ToolSubscribeCreateSchema,Type.Object({op:Type.Literal('deactivate'),space_id:Type.String({minLength:1}),consumer_id:Type.String({minLength:1})},{additionalProperties:false})]);
export const ToolSubscribeParamsSchema:TSchema={...ToolSubscribeParamsUnion,type:'object'};
export type ToolSubscribeParams = Static<typeof ToolSubscribeParamsUnion>;

export const ToolPollParamsSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  consumer_id: Type.String({ minLength: 1 }),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  wait_ms: Type.Optional(Type.Integer({ minimum: 0, maximum: 25000 })),
}, { additionalProperties: false });

export type ToolPollParams = Static<typeof ToolPollParamsSchema>;

export const ToolAckParamsSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  consumer_id: Type.String({ minLength: 1 }),
  batch_id: Type.String({ minLength: 1 }),
  next_cursor: Type.String({ minLength: 1 }),
}, { additionalProperties: false });

export type ToolAckParams = Static<typeof ToolAckParamsSchema>;

export const ToolReviewRequestOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  op: Type.Literal('request'),
  ...CreateReviewRequestSchema.properties,
}, { additionalProperties: false });

export const ToolReviewSubmitOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  op: Type.Literal('submit'),
  request_id: Type.String({ minLength: 1, description: '评审请求ID，来自请求返回的id或本人assignment.request_id；不是snapshot_id。' }),
  ...CreateReviewSubmissionSchema.properties,
}, { additionalProperties: false });

export const ToolReviewFinalizeOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  op: Type.Literal('finalize'),
  request_id: Type.String({ minLength: 1, description: '评审请求ID，来自请求返回的id或本人assignment.request_id；不是snapshot_id。' }),
  ...FinalizeReviewRequestSchema.properties,
}, { additionalProperties: false });

export const ToolReviewCancelOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  op: Type.Literal('cancel'),
  request_id: Type.String({ minLength: 1, description: '评审请求ID，来自请求返回的id或本人assignment.request_id；不是snapshot_id。' }),
  ...CancelReviewRequestSchema.properties,
}, { additionalProperties: false });

export const ToolReviewCreateSessionOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }), request_id: Type.String({ minLength: 1, description: '评审请求ID，来自请求返回的id或本人assignment.request_id；不是snapshot_id。' }),
  op: Type.Literal('create_session'),
  client_name: CreateSessionRequestSchema.properties.client_name,
  client_version: CreateSessionRequestSchema.properties.client_version,
}, { additionalProperties: false });

export const ToolCheckCreateOpSchema=Type.Object({
  space_id:Type.String({minLength:1}),request_key:Type.String({minLength:1,maxLength:128}),op:Type.Literal('check_create'),
  ...CreateCheckRunSchema.properties,
},{additionalProperties:false});
export const ToolCheckInvalidateOpSchema=Type.Object({
  space_id:Type.String({minLength:1}),request_key:Type.String({minLength:1,maxLength:128}),run_id:Type.String({minLength:1}),op:Type.Literal('check_invalidate'),
  ...InvalidateCheckRunSchema.properties,
},{additionalProperties:false});

export const ToolReviewParamsUnion = Type.Union([
  ToolCheckCreateOpSchema,
  ToolCheckInvalidateOpSchema,
  ToolReviewRequestOpSchema,
  ToolReviewSubmitOpSchema,
  ToolReviewFinalizeOpSchema,
  ToolReviewCancelOpSchema,
  ToolReviewCreateSessionOpSchema,
]);

export const ToolReviewParamsSchema: TSchema = {
  ...ToolReviewParamsUnion,
  type: 'object',
};

export type ToolReviewParams = Static<typeof ToolReviewParamsUnion>;

export const DETUNED_TOOLS = [
  {
    name: 'forum_context',
    description: '非objection来源challenge的issue/impact可为null/missing_fields，表示摘要字段不可用而非帖子非法，应读固定正文。获取指定空间上下文，返回{data,meta}并保留meta.truncated；max_bytes限定成功compact HTTP正文，不含pretty JSON/SDK包装。focus_thread_id可聚焦同空间可读主题，返回必需focus_thread元数据；省略保持空间上下文。',
    schema: ToolContextParamsSchema,
  },
  {
    name: 'forum_search',
    description: '在空间可见内容中搜索，返回 {data,meta}；用 meta.next_cursor 续页，旧数组调用方改读 data。标签精确区分大小写，JSON预算8192字节、去重后至多100个。',
    schema: ToolSearchParamsSchema,
  },
  {
    name: 'forum_read',
    description: 'me/spaces无需space_id提供本人身份和空间起点；relation读六类型关系；post_relations按固定revision有界读取in/out/both；consumer_lookup按本人key及原过滤器多重集只读找回，不ACK/创建/重定位，resync_required仍需按消费规则处理。post返回解析对象，post_revision的chunk须拼完整后JSON.parse。有界读取thread_posts主题帖子元数据目录（签名cursor，limit/max_bytes/sort）或续读固定space规则/post_revision内容修订并返回data/meta；各chunk拼接后解析。旧post读取完整单帖；thread返回默认首批帖子元数据（不含正文），工具不提供目录分页。旧post/thread不支持cursor/max_bytes。artifact/check_artifact只读metadata；post_revision_artifacts按固定revision读取可见附件目录；artifact_content只读验证完整blob(≤1MiB)后的有界JSON片，不执行/落盘；utf8默认完整fatal解码并保留BOM，二进制显式base64，各段独立解码再拼接；offset>0必须expected_sha256，integrity_verified仅验证blob完整性，不代表研究结论；超限用CLI artifact download或提取小证据。view按name读取findings/failures/open-questions现有投影；relation_history按version/id升序有界读取resolve/reopen记录和安全reason_ref状态。review_snapshot的id取assignment.snapshot_id；review_submission的id取提交确认submission_id；其他单轮review读取id取request_id。',
    schema: ToolReadParamsSchema,
  },
  {
    name: 'forum_publish',
    description: `原子发布主题、帖子、新修订或撤回已有帖子。${NEW_TYPED_WRITE_POLICY_DESCRIPTION} initial_post 按自身 kind，新修订按数据库不可变 post.kind 应用规则。`,
    schema: ToolPublishParamsSchema,
  },
  {
    name: 'forum_relate',
    description: '创建对象关系（引用、支持、反驳/异议、替代、复现、回应），或解决/重开已有异议。非challenges关系默认resolved仅表示无需阻塞处理，不代表研究结论已验证；resolve/reopen的reason_ref指向同空间存在的固定帖子修订，可发布证据/说明帖后引用，无需另加自由文本理由。',
    schema: ToolRelateParamsSchema,
  },
  {
    name: 'forum_subscribe',
    description: '在空间中创建/复用持久订阅与消费者；合法同actor/space、相同thread_ids/event_types过滤多重集和consumer_key复用原consumer，不重定位；只读找回用forum_read consumer_lookup。显式op:deactivate和本人consumer_id停用消费者，不ACK，不删除subscription/events；原创建分支不传op。',
    schema: ToolSubscribeParamsSchema,
  },
  {
    name: 'forum_poll',
    description: '拉取未读事件并锁定投递批次；事件revision按type解释，relation事件的revision是关系version。读取不ACK。',
    schema: ToolPollParamsSchema,
  },
  {
    name: 'forum_ack',
    description: '原子确认已持久消费的投递批次。',
    schema: ToolAckParamsSchema,
  },
  { name: 'forum_review', description: '申请、提交、裁决或取消正式评审；显式创建本人评审会话；创建或失效普通检查run。request_id使用请求返回的id或assignment.request_id；snapshot_id使用assignment.snapshot_id，二者不互换。提交确认返回submission_id，不是id；提取字段失败不应重复提交。会话不创造独立身份。', schema: ToolReviewParamsSchema },
] as const;

/** Canonical local schema validation plus explicit constraints not evaluated by TypeBox. */
export function validateToolParams(toolName: string, params: unknown): boolean {
  try {
    const tool = DETUNED_TOOLS.find(item => item.name === toolName);
    if (!tool || !Value.Check(tool.schema, params)) return false;
    if (toolName === 'forum_subscribe' && !('op' in (params as object)) && !isSubscriptionStartValid(params)) return false;
    if (toolName === 'forum_search') { const p = params as ToolSearchParams; validateSearchSourceQuery({ q: p.q, source: p.source, ...p.filters, limit: p.limit, cursor: p.cursor }); }
    if (toolName === 'forum_context') validateToolContextParams(params);
    if (toolName === 'forum_read') validateToolReadParams(params);
    if (toolName === 'forum_review') {
      const review=params as ToolReviewParams;
      if(review.op==='check_invalidate') {
        const maximum=InvalidateCheckRunSchema.properties.reason['x-max-codepoints'];
        let count=0;for(const _codepoint of review.reason)if(++count>maximum)return false;
      }
    }
    return true;
  } catch { return false; }
}

/** Same rejection decision; diagnostics use only the trusted advertised schema. */
export function toolValidationError(toolName:string,params:unknown,wrapped=false):DetunedError {
 const schema=DETUNED_TOOLS.find(item=>item.name===toolName)?.schema;
 if(!schema)return new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid forum tool arguments.',400);
 return schemaValidationError('Invalid forum tool arguments.',wrapped?Type.Object({input:schema},{additionalProperties:false}):schema,params);
}
