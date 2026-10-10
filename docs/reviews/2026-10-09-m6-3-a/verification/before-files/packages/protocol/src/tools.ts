import { ThreadPostsReadQuerySchema } from './threads.js';
import { Value } from '@sinclair/typebox/value';
import { DetunedError, ErrorCode } from './errors.js';
import { SpaceRevisionReadQuerySchema } from './spaces.js';
import { ContextQuerySchema, SearchQStringSchema, SearchFilterSchema, SearchCursorStringSchema } from './search.js';
import { Type, Static, TSchema } from '@sinclair/typebox';
import { PostRevisionReadQuerySchema, PostKindSchema, StructuredContentSchema, NEW_TYPED_WRITE_POLICY_DESCRIPTION } from './posts.js';
import { PostRefSchema } from './common.js';
import { RelationTypeSchema } from './relations.js';
import { EventTypeSchema, SubscriptionStartSchema, SubscriptionStartConstraintSchema } from './events.js';
import { CreateReviewRequestSchema, CreateReviewSubmissionSchema, CancelReviewRequestSchema, ReviewPhaseSchema } from './review.js';

export const ToolContextParamsSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  ...ContextQuerySchema.properties,
}, { additionalProperties: false });

export type ToolContextParams = Static<typeof ToolContextParamsSchema>;
export function validateToolContextParams(value: unknown): asserts value is ToolContextParams {
  if (!Value.Check(ToolContextParamsSchema, value)) throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid forum_context parameters.', 400, false);
}

export const ToolSearchParamsSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }), q: SearchQStringSchema,
  filters: Type.Optional(SearchFilterSchema),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  cursor: Type.Optional(SearchCursorStringSchema),
}, { additionalProperties: false });

export type ToolSearchParams = Static<typeof ToolSearchParamsSchema>;

export const ToolReadParamsUnion = Type.Union([
  Type.Object({ kind: Type.Literal('thread_posts'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1 }), ...ThreadPostsReadQuerySchema.properties }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('space'), space_id: Type.String({ minLength: 1 }), revision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }), ...SpaceRevisionReadQuerySchema.properties }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('post_revision'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1 }), revision: Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER }), ...PostRevisionReadQuerySchema.properties }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('post'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1 }), revision: Type.Optional(Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER })) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('thread'), space_id: Type.String({ minLength: 1 }), id: Type.String({ minLength: 1 }) }, { additionalProperties: false }),
]);
// Preserve Union Kind/anyOf for local validators, with the MCP object root.
export const ToolReadParamsSchema: TSchema = { ...ToolReadParamsUnion, type: 'object' };
export type ToolReadParams = Static<typeof ToolReadParamsUnion>;
export function validateToolReadParams(value: unknown): asserts value is ToolReadParams {
  if (!Value.Check(ToolReadParamsUnion, value)) throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'forum_read 参数组合不合法；thread_posts支持limit/cursor/max_bytes/sort；space/post_revision 需显式revision，post/thread不支持cursor/max_bytes，artifact/review尚未支持。', 400, false);
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

export const ToolSubscribeParamsSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  consumer_key: Type.String({ minLength: 1, maxLength: 64 }),
  thread_ids: Type.Optional(Type.Array(Type.String())),
  event_types: Type.Optional(Type.Array(EventTypeSchema)),
  start: Type.Optional(SubscriptionStartSchema),
  checkpoint_token: Type.Optional(Type.String({ minLength: 1 })),
}, { additionalProperties: false, allOf: [SubscriptionStartConstraintSchema] });

export type ToolSubscribeParams = Static<typeof ToolSubscribeParamsSchema>;

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
  request_id: Type.String({ minLength: 1 }),
  ...CreateReviewSubmissionSchema.properties,
}, { additionalProperties: false });

export const ToolReviewFinalizeOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  op: Type.Literal('finalize'),
  request_id: Type.String({ minLength: 1 }),
  expected_phase: Type.Optional(ReviewPhaseSchema),
}, { additionalProperties: false });

export const ToolReviewCancelOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  op: Type.Literal('cancel'),
  request_id: Type.String({ minLength: 1 }),
  ...CancelReviewRequestSchema.properties,
}, { additionalProperties: false });

export const ToolReviewParamsUnion = Type.Union([
  ToolReviewRequestOpSchema,
  ToolReviewSubmitOpSchema,
  ToolReviewFinalizeOpSchema,
  ToolReviewCancelOpSchema,
]);

export const ToolReviewParamsSchema: TSchema = {
  ...ToolReviewParamsUnion,
  type: 'object',
};

export type ToolReviewParams = Static<typeof ToolReviewParamsUnion>;

export const DETUNED_TOOLS = [
  {
    name: 'forum_context',
    description: '获取指定空间上下文，返回{data,meta}并保留meta.truncated；max_bytes限定成功compact HTTP正文，不含pretty JSON/SDK包装。focus_thread_id可聚焦同空间可读主题，返回必需focus_thread元数据；省略保持空间上下文。',
    schema: ToolContextParamsSchema,
  },
  {
    name: 'forum_search',
    description: '在空间可见内容中搜索，返回 {data,meta}；用 meta.next_cursor 续页，旧数组调用方改读 data。标签精确区分大小写，JSON预算8192字节、去重后至多100个。',
    schema: ToolSearchParamsSchema,
  },
  {
    name: 'forum_read',
    description: '有界读取thread_posts主题帖子元数据目录（签名cursor，limit/max_bytes/sort）或续读固定space规则/post_revision内容修订并返回data/meta；各chunk拼接后解析。旧post读取完整单帖；thread返回默认首批帖子元数据（不含正文），工具不提供目录分页。旧post/thread不支持cursor/max_bytes。artifact/review尚未支持。',
    schema: ToolReadParamsSchema,
  },
  {
    name: 'forum_publish',
    description: `原子发布主题、帖子、新修订或撤回已有帖子。${NEW_TYPED_WRITE_POLICY_DESCRIPTION} initial_post 按自身 kind，新修订按数据库不可变 post.kind 应用规则。`,
    schema: ToolPublishParamsSchema,
  },
  {
    name: 'forum_relate',
    description: '创建对象关系（引用、支持、反驳/异议、替代、复现、回应），或解决/重开已有异议。',
    schema: ToolRelateParamsSchema,
  },
  {
    name: 'forum_subscribe',
    description: '在空间中创建持久事件订阅及消费者。',
    schema: ToolSubscribeParamsSchema,
  },
  {
    name: 'forum_poll',
    description: '拉取未读事件并锁定投递批次。',
    schema: ToolPollParamsSchema,
  },
  {
    name: 'forum_ack',
    description: '原子确认已持久消费的投递批次。',
    schema: ToolAckParamsSchema,
  },
] as const;
