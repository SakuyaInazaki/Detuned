import { Type, Static, TSchema } from '@sinclair/typebox';
import { PostKindSchema, StructuredContentSchema } from './posts.js';
import { PostRefSchema, EvidenceRefSchema } from './common.js';
import { RelationTypeSchema } from './relations.js';
import { EventTypeSchema, SubscriptionStartSchema } from './events.js';
import { ReviewVerdictSchema, ReviewCompletionStatusSchema, ReviewPhaseSchema } from './review.js';

export const ToolContextParamsSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  max_bytes: Type.Optional(Type.Integer({ minimum: 4096, maximum: 65536 })),
  focus_thread_id: Type.Optional(Type.String()),
}, { additionalProperties: false });

export type ToolContextParams = Static<typeof ToolContextParamsSchema>;

export const ToolSearchParamsSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  q: Type.String({ minLength: 1, maxLength: 256 }),
  filters: Type.Optional(Type.Object({
    kind: Type.Optional(PostKindSchema),
    tags: Type.Optional(Type.Array(Type.String())),
    thread_id: Type.Optional(Type.String()),
  }, { additionalProperties: false })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  cursor: Type.Optional(Type.String()),
}, { additionalProperties: false });

export type ToolSearchParams = Static<typeof ToolSearchParamsSchema>;

export const ToolReadParamsSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  kind: Type.Union([
    Type.Literal('thread'),
    Type.Literal('post'),
    Type.Literal('artifact'),
    Type.Literal('review'),
  ]),
  id: Type.String({ minLength: 1 }),
  revision: Type.Optional(Type.Integer({ minimum: 1 })),
  cursor: Type.Optional(Type.String()),
  max_bytes: Type.Optional(Type.Integer({ minimum: 1024, maximum: 65536 })),
}, { additionalProperties: false });

export type ToolReadParams = Static<typeof ToolReadParamsSchema>;

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
    artifact_ids: Type.Optional(Type.Array(Type.String())),
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
  artifact_ids: Type.Optional(Type.Array(Type.String())),
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
  artifact_ids: Type.Optional(Type.Array(Type.String())),
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
  checkpoint_token: Type.Optional(Type.String()),
}, { additionalProperties: false });

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
  target_ref: PostRefSchema,
  dependency_refs: Type.Array(PostRefSchema),
  artifact_ids: Type.Array(Type.String()),
  code_refs: Type.Array(Type.Object({
    repository: Type.String(),
    commit: Type.String({ minLength: 40, maxLength: 64 }),
    reproduction_instructions: Type.String(),
  }, { additionalProperties: false })),
  declared_contributors: Type.Array(Type.String()),
  reviewer_actor_ids: Type.Array(Type.String(), { minItems: 1, maxItems: 5 }),
  expected_policy_revision: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false });

export const ToolReviewSubmitOpSchema = Type.Object({
  space_id: Type.String({ minLength: 1 }),
  request_key: Type.String({ minLength: 1, maxLength: 128 }),
  op: Type.Literal('submit'),
  request_id: Type.String({ minLength: 1 }),
  snapshot_sha256: Type.String({ minLength: 64, maxLength: 64 }),
  reviewer_session_id: Type.String({ minLength: 1 }),
  completion_status: ReviewCompletionStatusSchema,
  verdict: ReviewVerdictSchema,
  coverage: Type.String({ minLength: 1 }),
  checks_performed: Type.String({ minLength: 1 }),
  evidence_refs: Type.Array(EvidenceRefSchema),
  pending_requirements: Type.Array(Type.String()),
  limitations: Type.Array(Type.String()),
  independence_statement: Type.String({ minLength: 1 }),
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
  reason: Type.String({ minLength: 1, maxLength: 500 }),
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
    description: '获取指定空间的限长项目上下文（目标、有效规则、置顶摘要、未解决异议、近期失败与增量检查点）。',
    schema: ToolContextParamsSchema,
  },
  {
    name: 'forum_search',
    description: '在空间可见内容中搜索（支持关键词、帖子类型、标签与主题过滤）。',
    schema: ToolSearchParamsSchema,
  },
  {
    name: 'forum_read',
    description: '按需分段读取主题概要、帖子修订详情、附件元信息或评审请求。',
    schema: ToolReadParamsSchema,
  },
  {
    name: 'forum_publish',
    description: '原子发布主题、帖子、新修订或撤回已有帖子。',
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
  {
    name: 'forum_review',
    description: 'v0.2 评审操作：创建证据快照并申请评审、提交独立初评、裁决最终决定或取消评审。',
    schema: ToolReviewParamsSchema,
  },
] as const;
