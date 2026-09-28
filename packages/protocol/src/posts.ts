import { Type, Static } from '@sinclair/typebox';
import { PostRefSchema, EvidenceRefSchema } from './common.js';
import { RelationTypeSchema } from './relations.js';

export const PostKindSchema = Type.Union([
  Type.Literal('note'),
  Type.Literal('question'),
  Type.Literal('proposal'),
  Type.Literal('claim'),
  Type.Literal('objection'),
  Type.Literal('failure'),
  Type.Literal('summary'),
  Type.Literal('review'),
  Type.Literal('decision'),
]);

export type PostKind = Static<typeof PostKindSchema>;

export const PostLifecycleSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('withdrawn'),
  Type.Literal('redacted'),
]);

export type PostLifecycle = Static<typeof PostLifecycleSchema>;

export const FailureCategorySchema = Type.Union([
  Type.Literal('counterexample'),
  Type.Literal('proof_gap'),
  Type.Literal('test_failure'),
  Type.Literal('performance_failure'),
  Type.Literal('environment_error'),
  Type.Literal('budget_exhausted'),
]);

export type FailureCategory = Static<typeof FailureCategorySchema>;

export const ProposalClaimStructuredSchema = Type.Object({
  statement: Type.String({ minLength: 1, maxLength: 5000 }),
  assumptions: Type.Array(Type.String({ maxLength: 1000 })),
  scope: Type.String({ minLength: 1, maxLength: 1000 }),
  falsification_plan: Type.String({ minLength: 1, maxLength: 2000 }),
}, { additionalProperties: false });

export const ObjectionStructuredSchema = Type.Object({
  target_ref: PostRefSchema,
  issue: Type.String({ minLength: 1, maxLength: 2000 }),
  impact: Type.String({ minLength: 1, maxLength: 2000 }),
  evidence_refs: Type.Array(EvidenceRefSchema),
  verification_plan: Type.Optional(Type.String({ maxLength: 2000 })),
}, { additionalProperties: false });

export const FailureStructuredSchema = Type.Object({
  attempt: Type.String({ minLength: 1, maxLength: 2000 }),
  category: FailureCategorySchema,
  assumptions: Type.Array(Type.String({ maxLength: 1000 })),
  tested_scope: Type.String({ minLength: 1, maxLength: 1000 }),
  expected: Type.String({ minLength: 1, maxLength: 2000 }),
  observed: Type.String({ minLength: 1, maxLength: 2000 }),
  evidence_refs: Type.Array(EvidenceRefSchema),
  evidence_state: Type.Union([Type.Literal('provided'), Type.Literal('unverified')]),
  evidence_missing_reason: Type.Optional(Type.String({ maxLength: 1000 })),
  ruled_out: Type.String({ minLength: 1, maxLength: 2000 }),
  not_ruled_out: Type.Array(Type.String({ maxLength: 1000 })),
  retry_when: Type.Array(Type.String({ maxLength: 1000 })),
}, { additionalProperties: false });

export const SummaryStructuredSchema = Type.Object({
  source_refs: Type.Array(PostRefSchema, { minItems: 1 }),
}, { additionalProperties: false });

export const InformalReviewDecisionStructuredSchema = Type.Object({
  subject_refs: Type.Array(PostRefSchema, { minItems: 1 }),
  informal: Type.Literal(true),
}, { additionalProperties: false });

export const StructuredContentSchema = Type.Union([
  ProposalClaimStructuredSchema,
  ObjectionStructuredSchema,
  FailureStructuredSchema,
  SummaryStructuredSchema,
  InformalReviewDecisionStructuredSchema,
  Type.Record(Type.String(), Type.Unknown()),
]);

export type StructuredContent = Static<typeof StructuredContentSchema>;

export const PostRevisionSchema = Type.Object({
  post_id: Type.String(),
  revision: Type.Integer({ minimum: 1 }),
  title: Type.String({ minLength: 1, maxLength: 160 }),
  summary: Type.String({ minLength: 1, maxLength: 280 }),
  body: Type.String({ maxLength: 65536 }),
  tags: Type.Array(Type.String({ maxLength: 48 }), { maxItems: 20 }),
  structured: StructuredContentSchema,
  content_hash: Type.String({ minLength: 64, maxLength: 64 }),
  editor_id: Type.String(),
  created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export type PostRevision = Static<typeof PostRevisionSchema>;

export const PostSchema = Type.Object({
  id: Type.String(),
  space_id: Type.String(),
  thread_id: Type.String(),
  author_id: Type.String(),
  kind: PostKindSchema,
  current_revision: Type.Integer({ minimum: 1 }),
  lifecycle: PostLifecycleSchema,
  created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export type Post = Static<typeof PostSchema>;

export const CreatePostRelationInputSchema = Type.Object({
  target_ref: PostRefSchema,
  type: RelationTypeSchema,
}, { additionalProperties: false });

export type CreatePostRelationInput = Static<typeof CreatePostRelationInputSchema>;

export const CreatePostRequestSchema = Type.Object({
  kind: PostKindSchema,
  title: Type.String({ minLength: 1, maxLength: 160 }),
  summary: Type.String({ minLength: 1, maxLength: 280 }),
  body: Type.String({ maxLength: 65536 }),
  tags: Type.Optional(Type.Array(Type.String({ maxLength: 48 }), { maxItems: 20 })),
  structured: Type.Optional(StructuredContentSchema),
  refs: Type.Optional(Type.Array(CreatePostRelationInputSchema)),
  artifact_ids: Type.Optional(Type.Array(Type.String())),
}, { additionalProperties: false });

export type CreatePostRequest = Static<typeof CreatePostRequestSchema>;

export const CreatePostRevisionRequestSchema = Type.Object({
  expected_revision: Type.Integer({ minimum: 1 }),
  title: Type.String({ minLength: 1, maxLength: 160 }),
  summary: Type.String({ minLength: 1, maxLength: 280 }),
  body: Type.String({ maxLength: 65536 }),
  tags: Type.Optional(Type.Array(Type.String({ maxLength: 48 }), { maxItems: 20 })),
  structured: Type.Optional(StructuredContentSchema),
  refs: Type.Optional(Type.Array(CreatePostRelationInputSchema)),
  artifact_ids: Type.Optional(Type.Array(Type.String())),
}, { additionalProperties: false });

export type CreatePostRevisionRequest = Static<typeof CreatePostRevisionRequestSchema>;

export const WithdrawPostRequestSchema = Type.Object({
  expected_revision: Type.Integer({ minimum: 1 }),
  reason: Type.String({ minLength: 1, maxLength: 500 }),
}, { additionalProperties: false });

export type WithdrawPostRequest = Static<typeof WithdrawPostRequestSchema>;
