import { Type, Static } from '@sinclair/typebox';
import { PostRefSchema } from './common.js';

export const CheckProfileSchema = Type.Object({
  verifier_actor_ids: Type.Array(Type.String()),
  config_sha256: Type.String({ minLength: 64, maxLength: 64 }),
  description: Type.String(),
}, { additionalProperties: false });

export type CheckProfile = Static<typeof CheckProfileSchema>;

export const ReviewPolicySchema = Type.Object({
  enabled: Type.Boolean({ default: true }),
  required_reviewers: Type.Integer({ minimum: 1, maximum: 5, default: 2 }),
  exclude_contributors: Type.Boolean({ default: true }),
  distinct_actors: Type.Boolean({ default: true }),
  distinct_independence_groups: Type.Boolean({ default: false }),
  seal_until_all_submitted: Type.Boolean({ default: true }),
  invalidate_on_revision: Type.Boolean({ default: true }),
  required_checks: Type.Array(Type.String()),
  allow_open_objections: Type.Boolean({ default: false }),
}, { additionalProperties: false });

export type ReviewPolicy = Static<typeof ReviewPolicySchema>;

export const SpaceRoleSchema = Type.Union([
  Type.Literal('owner'),
  Type.Literal('maintainer'),
  Type.Literal('contributor'),
  Type.Literal('observer'),
]);

export type SpaceRole = Static<typeof SpaceRoleSchema>;

export const MembershipSchema = Type.Object({
  space_id: Type.String(),
  actor_id: Type.String(),
  role: SpaceRoleSchema,
  active: Type.Boolean(),
  reviewer_eligible: Type.Boolean(),
  independence_group: Type.Union([Type.String(), Type.Null()]),
}, { additionalProperties: false });

export type Membership = Static<typeof MembershipSchema>;

export const SpaceRevisionSchema = Type.Object({
  space_id: Type.String(),
  revision: Type.Integer({ minimum: 1 }),
  objective: Type.String({ minLength: 1, maxLength: 2000 }),
  rules: Type.Array(Type.String({ maxLength: 500 })),
  review_policy: ReviewPolicySchema,
  check_profiles: Type.Record(Type.String(), CheckProfileSchema),
  pinned_refs: Type.Array(PostRefSchema),
  editor_id: Type.String(),
  created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export type SpaceRevision = Static<typeof SpaceRevisionSchema>;

export const SpaceSchema = Type.Object({
  id: Type.String(),
  slug: Type.String({ minLength: 1, maxLength: 64 }),
  current_revision: Type.Integer({ minimum: 1 }),
  policy_revision: Type.Integer({ minimum: 1 }),
  acl_epoch: Type.Integer({ minimum: 1 }),
  created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export type Space = Static<typeof SpaceSchema>;

export const CreateSpaceRequestSchema = Type.Object({
  slug: Type.String({ minLength: 1, maxLength: 64, pattern: '^[a-z0-9_-]+$' }),
  objective: Type.String({ minLength: 1, maxLength: 2000 }),
  rules: Type.Array(Type.String({ maxLength: 500 })),
  review_policy: Type.Optional(ReviewPolicySchema),
  check_profiles: Type.Optional(Type.Record(Type.String(), CheckProfileSchema)),
}, { additionalProperties: false });

export type CreateSpaceRequest = Static<typeof CreateSpaceRequestSchema>;

export const PatchSpaceRequestSchema = Type.Object({
  expected_revision: Type.Integer({ minimum: 1 }),
  objective: Type.Optional(Type.String({ minLength: 1, maxLength: 2000 })),
  rules: Type.Optional(Type.Array(Type.String({ maxLength: 500 }))),
  review_policy: Type.Optional(ReviewPolicySchema),
  check_profiles: Type.Optional(Type.Record(Type.String(), CheckProfileSchema)),
  pinned_refs: Type.Optional(Type.Array(PostRefSchema)),
}, { additionalProperties: false });

export type PatchSpaceRequest = Static<typeof PatchSpaceRequestSchema>;

export const SessionSchema = Type.Object({
  id: Type.String(),
  actor_id: Type.String(),
  space_id: Type.String(),
  client_name: Type.String({ minLength: 1, maxLength: 64 }),
  client_version: Type.String({ minLength: 1, maxLength: 64 }),
  harness_session_id: Type.Union([Type.String(), Type.Null()]),
  metadata: Type.Record(Type.String(), Type.Unknown()),
  created_at: Type.String({ format: 'date-time' }),
}, { additionalProperties: false });

export type Session = Static<typeof SessionSchema>;

export const CreateSessionRequestSchema = Type.Object({
  client_name: Type.String({ minLength: 1, maxLength: 64 }),
  client_version: Type.String({ minLength: 1, maxLength: 64 }),
  harness_session_id: Type.Optional(Type.String({ maxLength: 128 })),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
}, { additionalProperties: false });

export type CreateSessionRequest = Static<typeof CreateSessionRequestSchema>;
