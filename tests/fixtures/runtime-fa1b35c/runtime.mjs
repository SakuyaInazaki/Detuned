// legacy:packages/server/src/app.ts
import Fastify from "../../../packages/server/node_modules/fastify/fastify.js";
import cors from "../../../packages/server/node_modules/@fastify/cors/index.js";

// legacy:packages/core/src/ports/clock.ts
var SystemClock = class {
  now() {
    return /* @__PURE__ */ new Date();
  }
  nowIso() {
    return (/* @__PURE__ */ new Date()).toISOString();
  }
};

// legacy:packages/core/src/ports/id-generator.ts
import { randomUUID } from "node:crypto";
var CryptoIdGenerator = class {
  generateId(prefix) {
    const uuid = randomUUID();
    return prefix ? `${prefix}_${uuid}` : uuid;
  }
};

// legacy:packages/core/src/ports/hasher.ts
import { createHash } from "node:crypto";
function canonicalJsonStringify(data) {
  if (data === null || data === void 0) {
    return "null";
  }
  if (typeof data === "boolean" || typeof data === "number") {
    return JSON.stringify(data);
  }
  if (typeof data === "string") {
    return JSON.stringify(data);
  }
  if (Array.isArray(data)) {
    return "[" + data.map((item) => canonicalJsonStringify(item)).join(",") + "]";
  }
  if (typeof data === "object") {
    const keys = Object.keys(data).sort();
    const parts = [];
    for (const key of keys) {
      const val = data[key];
      if (val !== void 0 && typeof val !== "function" && typeof val !== "symbol") {
        parts.push(`${JSON.stringify(key)}:${canonicalJsonStringify(val)}`);
      }
    }
    return "{" + parts.join(",") + "}";
  }
  return JSON.stringify(data);
}
var CryptoHasher = class {
  sha256(data) {
    return createHash("sha256").update(data).digest("hex");
  }
  canonicalJson(data) {
    return canonicalJsonStringify(data);
  }
};

// legacy:packages/core/src/ports/token-signer.ts
import { createHmac, timingSafeEqual } from "node:crypto";
var HmacTokenSigner = class {
  sign(payload, secret) {
    const jsonStr = JSON.stringify(payload);
    const dataB64 = Buffer.from(jsonStr, "utf8").toString("base64url");
    const hmac = createHmac("sha256", secret).update(dataB64).digest("base64url");
    return `${dataB64}.${hmac}`;
  }
  verify(token, secret) {
    try {
      const parts = token.split(".");
      if (parts.length !== 2) return null;
      const [dataB64, hmac] = parts;
      if (!dataB64 || !hmac) return null;
      const expectedHmac = createHmac("sha256", secret).update(dataB64).digest("base64url");
      const sigA = Buffer.from(hmac);
      const sigB = Buffer.from(expectedHmac);
      if (sigA.length !== sigB.length || !timingSafeEqual(sigA, sigB)) {
        return null;
      }
      const jsonStr = Buffer.from(dataB64, "base64url").toString("utf8");
      const payload = JSON.parse(jsonStr);
      if (typeof payload["exp"] === "number" && Date.now() / 1e3 > payload["exp"]) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }
};

// legacy:packages/protocol/src/errors.ts
import { Type } from "@sinclair/typebox";
var ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  REVISION_CONFLICT: "REVISION_CONFLICT",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
  ACK_INVALID: "ACK_INVALID",
  RESYNC_REQUIRED: "RESYNC_REQUIRED",
  SNAPSHOT_STALE: "SNAPSHOT_STALE",
  REVIEW_INCOMPLETE: "REVIEW_INCOMPLETE",
  OPEN_OBJECTIONS: "OPEN_OBJECTIONS",
  CONTENT_REDACTED: "CONTENT_REDACTED",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  QUERY_TOO_BROAD: "QUERY_TOO_BROAD",
  CHECK_MISMATCH: "CHECK_MISMATCH",
  RATE_LIMITED: "RATE_LIMITED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  STORAGE_BUSY: "STORAGE_BUSY",
  TEMPORARILY_UNAVAILABLE: "TEMPORARILY_UNAVAILABLE"
};
var ErrorCodeSchema = Type.Union([
  Type.Literal("VALIDATION_ERROR"),
  Type.Literal("UNAUTHENTICATED"),
  Type.Literal("FORBIDDEN"),
  Type.Literal("NOT_FOUND"),
  Type.Literal("REVISION_CONFLICT"),
  Type.Literal("IDEMPOTENCY_CONFLICT"),
  Type.Literal("ACK_INVALID"),
  Type.Literal("RESYNC_REQUIRED"),
  Type.Literal("SNAPSHOT_STALE"),
  Type.Literal("REVIEW_INCOMPLETE"),
  Type.Literal("OPEN_OBJECTIONS"),
  Type.Literal("CONTENT_REDACTED"),
  Type.Literal("PAYLOAD_TOO_LARGE"),
  Type.Literal("QUERY_TOO_BROAD"),
  Type.Literal("CHECK_MISMATCH"),
  Type.Literal("RATE_LIMITED"),
  Type.Literal("QUOTA_EXCEEDED"),
  Type.Literal("STORAGE_BUSY"),
  Type.Literal("TEMPORARILY_UNAVAILABLE")
]);
var ApiErrorDetailSchema = Type.Object({
  code: ErrorCodeSchema,
  message: Type.String(),
  retryable: Type.Boolean(),
  details: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
}, { additionalProperties: false });
var ApiErrorResponseSchema = Type.Object({
  api_version: Type.Literal("1"),
  request_id: Type.String(),
  error: ApiErrorDetailSchema
}, { additionalProperties: false });
var DetunedError = class extends Error {
  code;
  statusCode;
  retryable;
  details;
  constructor(code, message, statusCode, retryable = false, details) {
    super(message);
    this.name = "DetunedError";
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
  }
};

// legacy:packages/protocol/src/common.ts
import { Type as Type2 } from "@sinclair/typebox";
var ApiMetaSchema = Type2.Object({
  truncated: Type2.Boolean(),
  next_cursor: Type2.Union([Type2.String(), Type2.Null()])
}, { additionalProperties: false });
var PaginationQuerySchema = Type2.Object({
  limit: Type2.Optional(Type2.Integer({ minimum: 1, maximum: 100, default: 20 })),
  cursor: Type2.Optional(Type2.String())
}, { additionalProperties: false });
var PostRefSchema = Type2.Object({
  post_id: Type2.String({ minLength: 1 }),
  revision: Type2.Integer({ minimum: 1 })
}, { additionalProperties: false });
var PostEvidenceRefSchema = Type2.Object({
  kind: Type2.Literal("post"),
  post_id: Type2.String({ minLength: 1 }),
  revision: Type2.Integer({ minimum: 1 })
}, { additionalProperties: false });
var ArtifactEvidenceRefSchema = Type2.Object({
  kind: Type2.Literal("artifact"),
  artifact_id: Type2.String({ minLength: 1 })
}, { additionalProperties: false });
var EvidenceRefSchema = Type2.Union([
  PostEvidenceRefSchema,
  ArtifactEvidenceRefSchema
]);

// legacy:packages/protocol/src/actors.ts
import { Type as Type3 } from "@sinclair/typebox";
var ActorKindSchema = Type3.Union([
  Type3.Literal("human"),
  Type3.Literal("agent"),
  Type3.Literal("service")
]);
var ActorSchema = Type3.Object({
  id: Type3.String(),
  kind: ActorKindSchema,
  display_name: Type3.String({ minLength: 1, maxLength: 80 }),
  created_at: Type3.String({ format: "date-time" }),
  disabled_at: Type3.Union([Type3.String({ format: "date-time" }), Type3.Null()])
}, { additionalProperties: false });
var CredentialCapabilitySchema = Type3.Union([
  Type3.Literal("read"),
  Type3.Literal("write"),
  Type3.Literal("admin")
]);
var CredentialSchema = Type3.Object({
  id: Type3.String(),
  actor_id: Type3.String(),
  token_hash: Type3.String(),
  allowed_space_ids: Type3.Array(Type3.String()),
  capabilities: Type3.Array(CredentialCapabilitySchema),
  expires_at: Type3.Union([Type3.String({ format: "date-time" }), Type3.Null()]),
  revoked_at: Type3.Union([Type3.String({ format: "date-time" }), Type3.Null()]),
  created_at: Type3.String({ format: "date-time" })
}, { additionalProperties: false });
var MeResponseSchema = Type3.Object({
  actor: ActorSchema,
  capabilities: Type3.Array(CredentialCapabilitySchema),
  allowed_space_ids: Type3.Array(Type3.String()),
  visible_spaces: Type3.Array(Type3.Object({
    id: Type3.String(),
    slug: Type3.String(),
    role: Type3.String()
  }, { additionalProperties: false }))
}, { additionalProperties: false });

// legacy:packages/protocol/src/spaces.ts
import { Type as Type4 } from "@sinclair/typebox";
var CheckProfileSchema = Type4.Object({
  verifier_actor_ids: Type4.Array(Type4.String()),
  config_sha256: Type4.String({ minLength: 64, maxLength: 64 }),
  description: Type4.String()
}, { additionalProperties: false });
var ReviewPolicySchema = Type4.Object({
  enabled: Type4.Boolean({ default: true }),
  required_reviewers: Type4.Integer({ minimum: 1, maximum: 5, default: 2 }),
  exclude_contributors: Type4.Boolean({ default: true }),
  distinct_actors: Type4.Boolean({ default: true }),
  distinct_independence_groups: Type4.Boolean({ default: false }),
  seal_until_all_submitted: Type4.Boolean({ default: true }),
  invalidate_on_revision: Type4.Boolean({ default: true }),
  required_checks: Type4.Array(Type4.String()),
  allow_open_objections: Type4.Boolean({ default: false })
}, { additionalProperties: false });
var SpaceRoleSchema = Type4.Union([
  Type4.Literal("owner"),
  Type4.Literal("maintainer"),
  Type4.Literal("contributor"),
  Type4.Literal("observer")
]);
var MembershipSchema = Type4.Object({
  space_id: Type4.String(),
  actor_id: Type4.String(),
  role: SpaceRoleSchema,
  active: Type4.Boolean(),
  reviewer_eligible: Type4.Boolean(),
  independence_group: Type4.Union([Type4.String(), Type4.Null()])
}, { additionalProperties: false });
var SpaceRevisionSchema = Type4.Object({
  space_id: Type4.String(),
  revision: Type4.Integer({ minimum: 1 }),
  objective: Type4.String({ minLength: 1, maxLength: 2e3 }),
  rules: Type4.Array(Type4.String({ maxLength: 500 })),
  review_policy: ReviewPolicySchema,
  check_profiles: Type4.Record(Type4.String(), CheckProfileSchema),
  pinned_refs: Type4.Array(PostRefSchema),
  editor_id: Type4.String(),
  created_at: Type4.String({ format: "date-time" })
}, { additionalProperties: false });
var SpaceSchema = Type4.Object({
  id: Type4.String(),
  slug: Type4.String({ minLength: 1, maxLength: 64 }),
  current_revision: Type4.Integer({ minimum: 1 }),
  policy_revision: Type4.Integer({ minimum: 1 }),
  acl_epoch: Type4.Integer({ minimum: 1 }),
  created_at: Type4.String({ format: "date-time" })
}, { additionalProperties: false });
var CreateSpaceRequestSchema = Type4.Object({
  slug: Type4.String({ minLength: 1, maxLength: 64, pattern: "^[a-z0-9_-]+$" }),
  objective: Type4.String({ minLength: 1, maxLength: 2e3 }),
  rules: Type4.Array(Type4.String({ maxLength: 500 })),
  review_policy: Type4.Optional(ReviewPolicySchema),
  check_profiles: Type4.Optional(Type4.Record(Type4.String(), CheckProfileSchema))
}, { additionalProperties: false });
var PatchSpaceRequestSchema = Type4.Object({
  expected_revision: Type4.Integer({ minimum: 1 }),
  objective: Type4.Optional(Type4.String({ minLength: 1, maxLength: 2e3 })),
  rules: Type4.Optional(Type4.Array(Type4.String({ maxLength: 500 }))),
  review_policy: Type4.Optional(ReviewPolicySchema),
  check_profiles: Type4.Optional(Type4.Record(Type4.String(), CheckProfileSchema)),
  pinned_refs: Type4.Optional(Type4.Array(PostRefSchema))
}, { additionalProperties: false });
var SessionSchema = Type4.Object({
  id: Type4.String(),
  actor_id: Type4.String(),
  space_id: Type4.String(),
  client_name: Type4.String({ minLength: 1, maxLength: 64 }),
  client_version: Type4.String({ minLength: 1, maxLength: 64 }),
  harness_session_id: Type4.Union([Type4.String(), Type4.Null()]),
  metadata: Type4.Record(Type4.String(), Type4.Unknown()),
  created_at: Type4.String({ format: "date-time" })
}, { additionalProperties: false });
var CreateSessionRequestSchema = Type4.Object({
  client_name: Type4.String({ minLength: 1, maxLength: 64 }),
  client_version: Type4.String({ minLength: 1, maxLength: 64 }),
  harness_session_id: Type4.Optional(Type4.String({ maxLength: 128 })),
  metadata: Type4.Optional(Type4.Record(Type4.String(), Type4.Unknown()))
}, { additionalProperties: false });

// legacy:packages/protocol/src/threads.ts
import { Type as Type7 } from "@sinclair/typebox";

// legacy:packages/protocol/src/posts.ts
import { Type as Type6 } from "@sinclair/typebox";

// legacy:packages/protocol/src/relations.ts
import { Type as Type5 } from "@sinclair/typebox";
var RelationTypeSchema = Type5.Union([
  Type5.Literal("cites"),
  Type5.Literal("supports"),
  Type5.Literal("challenges"),
  Type5.Literal("supersedes"),
  Type5.Literal("reproduces"),
  Type5.Literal("addresses")
]);
var RelationStateSchema = Type5.Union([
  Type5.Literal("open"),
  Type5.Literal("resolved")
]);
var RelationSchema = Type5.Object({
  id: Type5.String(),
  space_id: Type5.String(),
  source_post_id: Type5.String(),
  source_revision: Type5.Integer({ minimum: 1 }),
  target_post_id: Type5.String(),
  target_revision: Type5.Integer({ minimum: 1 }),
  type: RelationTypeSchema,
  state: RelationStateSchema,
  version: Type5.Integer({ minimum: 1 }),
  creator_id: Type5.String(),
  created_at: Type5.String({ format: "date-time" })
}, { additionalProperties: false });
var RelationResolutionActionSchema = Type5.Union([
  Type5.Literal("resolve"),
  Type5.Literal("reopen")
]);
var RelationResolutionSchema = Type5.Object({
  id: Type5.String(),
  relation_id: Type5.String(),
  version: Type5.Integer({ minimum: 1 }),
  resolver_id: Type5.String(),
  reason_ref: PostRefSchema,
  action: RelationResolutionActionSchema,
  created_at: Type5.String({ format: "date-time" })
}, { additionalProperties: false });
var CreateRelationRequestSchema = Type5.Object({
  source_ref: PostRefSchema,
  target_ref: PostRefSchema,
  type: RelationTypeSchema
}, { additionalProperties: false });
var ResolveRelationRequestSchema = Type5.Object({
  expected_version: Type5.Integer({ minimum: 1 }),
  reason_ref: PostRefSchema
}, { additionalProperties: false });
var ReopenRelationRequestSchema = Type5.Object({
  expected_version: Type5.Integer({ minimum: 1 }),
  reason_ref: PostRefSchema
}, { additionalProperties: false });

// legacy:packages/protocol/src/posts.ts
var PostKindSchema = Type6.Union([
  Type6.Literal("note"),
  Type6.Literal("question"),
  Type6.Literal("proposal"),
  Type6.Literal("claim"),
  Type6.Literal("objection"),
  Type6.Literal("failure"),
  Type6.Literal("summary"),
  Type6.Literal("review"),
  Type6.Literal("decision")
]);
var PostLifecycleSchema = Type6.Union([
  Type6.Literal("active"),
  Type6.Literal("withdrawn"),
  Type6.Literal("redacted")
]);
var FailureCategorySchema = Type6.Union([
  Type6.Literal("counterexample"),
  Type6.Literal("proof_gap"),
  Type6.Literal("test_failure"),
  Type6.Literal("performance_failure"),
  Type6.Literal("environment_error"),
  Type6.Literal("budget_exhausted")
]);
var ProposalClaimStructuredSchema = Type6.Object({
  statement: Type6.String({ minLength: 1, maxLength: 5e3 }),
  assumptions: Type6.Array(Type6.String({ maxLength: 1e3 })),
  scope: Type6.String({ minLength: 1, maxLength: 1e3 }),
  falsification_plan: Type6.String({ minLength: 1, maxLength: 2e3 })
}, { additionalProperties: false });
var ObjectionStructuredSchema = Type6.Object({
  target_ref: PostRefSchema,
  issue: Type6.String({ minLength: 1, maxLength: 2e3 }),
  impact: Type6.String({ minLength: 1, maxLength: 2e3 }),
  evidence_refs: Type6.Array(EvidenceRefSchema),
  verification_plan: Type6.Optional(Type6.String({ maxLength: 2e3 }))
}, { additionalProperties: false });
var FailureStructuredSchema = Type6.Object({
  attempt: Type6.String({ minLength: 1, maxLength: 2e3 }),
  category: FailureCategorySchema,
  assumptions: Type6.Array(Type6.String({ maxLength: 1e3 })),
  tested_scope: Type6.String({ minLength: 1, maxLength: 1e3 }),
  expected: Type6.String({ minLength: 1, maxLength: 2e3 }),
  observed: Type6.String({ minLength: 1, maxLength: 2e3 }),
  evidence_refs: Type6.Array(EvidenceRefSchema),
  evidence_state: Type6.Union([Type6.Literal("provided"), Type6.Literal("unverified")]),
  evidence_missing_reason: Type6.Optional(Type6.String({ maxLength: 1e3 })),
  ruled_out: Type6.String({ minLength: 1, maxLength: 2e3 }),
  not_ruled_out: Type6.Array(Type6.String({ maxLength: 1e3 })),
  retry_when: Type6.Array(Type6.String({ maxLength: 1e3 }))
}, { additionalProperties: false });
var SummaryStructuredSchema = Type6.Object({
  source_refs: Type6.Array(PostRefSchema, { minItems: 1 })
}, { additionalProperties: false });
var InformalReviewDecisionStructuredSchema = Type6.Object({
  subject_refs: Type6.Array(PostRefSchema, { minItems: 1 }),
  informal: Type6.Literal(true)
}, { additionalProperties: false });
var StructuredContentSchema = Type6.Union([
  ProposalClaimStructuredSchema,
  ObjectionStructuredSchema,
  FailureStructuredSchema,
  SummaryStructuredSchema,
  InformalReviewDecisionStructuredSchema,
  Type6.Record(Type6.String(), Type6.Unknown())
]);
var PostRevisionSchema = Type6.Object({
  post_id: Type6.String(),
  revision: Type6.Integer({ minimum: 1 }),
  title: Type6.String({ minLength: 1, maxLength: 160 }),
  summary: Type6.String({ minLength: 1, maxLength: 280 }),
  body: Type6.String({ maxLength: 65536 }),
  tags: Type6.Array(Type6.String({ maxLength: 48 }), { maxItems: 20 }),
  structured: StructuredContentSchema,
  content_hash: Type6.String({ minLength: 64, maxLength: 64 }),
  editor_id: Type6.String(),
  created_at: Type6.String({ format: "date-time" })
}, { additionalProperties: false });
var PostSchema = Type6.Object({
  id: Type6.String(),
  space_id: Type6.String(),
  thread_id: Type6.String(),
  author_id: Type6.String(),
  kind: PostKindSchema,
  current_revision: Type6.Integer({ minimum: 1 }),
  lifecycle: PostLifecycleSchema,
  created_at: Type6.String({ format: "date-time" })
}, { additionalProperties: false });
var CreatePostRelationInputSchema = Type6.Object({
  target_ref: PostRefSchema,
  type: RelationTypeSchema
}, { additionalProperties: false });
var CreatePostRequestSchema = Type6.Object({
  kind: PostKindSchema,
  title: Type6.String({ minLength: 1, maxLength: 160 }),
  summary: Type6.String({ minLength: 1, maxLength: 280 }),
  body: Type6.String({ maxLength: 65536 }),
  tags: Type6.Optional(Type6.Array(Type6.String({ maxLength: 48 }), { maxItems: 20 })),
  structured: Type6.Optional(StructuredContentSchema),
  refs: Type6.Optional(Type6.Array(CreatePostRelationInputSchema)),
  artifact_ids: Type6.Optional(Type6.Array(Type6.String()))
}, { additionalProperties: false });
var CreatePostRevisionRequestSchema = Type6.Object({
  expected_revision: Type6.Integer({ minimum: 1 }),
  title: Type6.String({ minLength: 1, maxLength: 160 }),
  summary: Type6.String({ minLength: 1, maxLength: 280 }),
  body: Type6.String({ maxLength: 65536 }),
  tags: Type6.Optional(Type6.Array(Type6.String({ maxLength: 48 }), { maxItems: 20 })),
  structured: Type6.Optional(StructuredContentSchema),
  refs: Type6.Optional(Type6.Array(CreatePostRelationInputSchema)),
  artifact_ids: Type6.Optional(Type6.Array(Type6.String()))
}, { additionalProperties: false });
var WithdrawPostRequestSchema = Type6.Object({
  expected_revision: Type6.Integer({ minimum: 1 }),
  reason: Type6.String({ minLength: 1, maxLength: 500 })
}, { additionalProperties: false });

// legacy:packages/protocol/src/threads.ts
var ThreadStateSchema = Type7.Union([
  Type7.Literal("open"),
  Type7.Literal("archived")
]);
var ThreadSchema = Type7.Object({
  id: Type7.String(),
  space_id: Type7.String(),
  title: Type7.String({ minLength: 1, maxLength: 160 }),
  version: Type7.Integer({ minimum: 1 }),
  state: ThreadStateSchema,
  creator_id: Type7.String(),
  created_at: Type7.String({ format: "date-time" }),
  updated_at: Type7.String({ format: "date-time" })
}, { additionalProperties: false });
var CreateThreadRequestSchema = Type7.Object({
  title: Type7.String({ minLength: 1, maxLength: 160 }),
  initial_post: Type7.Optional(CreatePostRequestSchema)
}, { additionalProperties: false });
var PatchThreadRequestSchema = Type7.Object({
  expected_version: Type7.Integer({ minimum: 1 }),
  title: Type7.Optional(Type7.String({ minLength: 1, maxLength: 160 })),
  state: Type7.Optional(ThreadStateSchema)
}, { additionalProperties: false });

// legacy:packages/protocol/src/artifacts.ts
import { Type as Type8 } from "@sinclair/typebox";
var ArtifactVisibilitySchema = Type8.Union([
  Type8.Literal("space"),
  Type8.Literal("review_assignment")
]);
var ArtifactStateSchema = Type8.Union([
  Type8.Literal("ready"),
  Type8.Literal("redacted"),
  Type8.Literal("missing")
]);
var ArtifactSchema = Type8.Object({
  id: Type8.String(),
  space_id: Type8.String(),
  owner_id: Type8.String(),
  visibility: ArtifactVisibilitySchema,
  review_assignment_id: Type8.Union([Type8.String(), Type8.Null()]),
  check_run_id: Type8.Union([Type8.String(), Type8.Null()]),
  sha256: Type8.String({ minLength: 64, maxLength: 64 }),
  bytes: Type8.Integer({ minimum: 0, maximum: 26214400 }),
  // 25 MiB
  mime: Type8.String(),
  storage_key: Type8.String(),
  state: ArtifactStateSchema,
  created_at: Type8.String({ format: "date-time" })
}, { additionalProperties: false });

// legacy:packages/protocol/src/events.ts
import { Type as Type9 } from "@sinclair/typebox";
var EventTypeSchema = Type9.Union([
  Type9.Literal("space.revised"),
  Type9.Literal("thread.created"),
  Type9.Literal("thread.updated"),
  Type9.Literal("post.created"),
  Type9.Literal("post.revised"),
  Type9.Literal("post.withdrawn"),
  Type9.Literal("post.redacted"),
  Type9.Literal("relation.created"),
  Type9.Literal("relation.resolved"),
  Type9.Literal("relation.reopened"),
  Type9.Literal("artifact.redacted"),
  Type9.Literal("review.requested"),
  Type9.Literal("review.revealed"),
  Type9.Literal("review.finalized"),
  Type9.Literal("review.invalidated"),
  Type9.Literal("check.completed"),
  Type9.Literal("check.invalidated")
]);
var EventVisibilitySchema = Type9.Union([
  Type9.Literal("public"),
  Type9.Literal("review_assignment")
]);
var EventSchema = Type9.Object({
  id: Type9.String(),
  space_id: Type9.String(),
  seq: Type9.Integer({ minimum: 1 }),
  type: EventTypeSchema,
  object_id: Type9.String(),
  revision: Type9.Union([Type9.Integer({ minimum: 1 }), Type9.Null()]),
  visibility: EventVisibilitySchema,
  actor_id: Type9.String(),
  created_at: Type9.String({ format: "date-time" })
}, { additionalProperties: false });
var SubscriptionStartSchema = Type9.Union([
  Type9.Literal("beginning"),
  Type9.Literal("now"),
  Type9.Literal("context_checkpoint")
]);
var CreateSubscriptionRequestSchema = Type9.Object({
  thread_ids: Type9.Optional(Type9.Array(Type9.String())),
  event_types: Type9.Optional(Type9.Array(EventTypeSchema)),
  consumer_key: Type9.String({ minLength: 1, maxLength: 64 }),
  start: Type9.Optional(SubscriptionStartSchema),
  checkpoint_token: Type9.Optional(Type9.String())
}, { additionalProperties: false });
var SubscriptionSchema = Type9.Object({
  id: Type9.String(),
  actor_id: Type9.String(),
  space_id: Type9.String(),
  thread_ids: Type9.Array(Type9.String()),
  event_types: Type9.Array(EventTypeSchema),
  created_at: Type9.String({ format: "date-time" })
}, { additionalProperties: false });
var ConsumerSchema = Type9.Object({
  id: Type9.String(),
  subscription_id: Type9.String(),
  consumer_key: Type9.String(),
  ack_seq: Type9.Integer({ minimum: 0 }),
  version: Type9.Integer({ minimum: 1 }),
  active_batch_id: Type9.Union([Type9.String(), Type9.Null()]),
  acl_epoch: Type9.Integer({ minimum: 1 })
}, { additionalProperties: false });
var PollRequestSchema = Type9.Object({
  limit: Type9.Optional(Type9.Integer({ minimum: 1, maximum: 100, default: 20 })),
  wait_ms: Type9.Optional(Type9.Integer({ minimum: 0, maximum: 25e3, default: 0 }))
}, { additionalProperties: false });
var PollResponseDataSchema = Type9.Object({
  batch_id: Type9.Union([Type9.String(), Type9.Null()]),
  events: Type9.Array(EventSchema),
  next_cursor: Type9.Union([Type9.String(), Type9.Null()]),
  has_more: Type9.Boolean()
}, { additionalProperties: false });
var AckRequestSchema = Type9.Object({
  batch_id: Type9.String({ minLength: 1 }),
  next_cursor: Type9.String({ minLength: 1 })
}, { additionalProperties: false });
var AckResponseDataSchema = Type9.Object({
  confirmed: Type9.Boolean(),
  acknowledged_batch_id: Type9.String()
}, { additionalProperties: false });

// legacy:packages/protocol/src/search.ts
import { Type as Type10 } from "@sinclair/typebox";
var SearchQuerySchema = Type10.Object({
  q: Type10.String({ minLength: 1, maxLength: 256 }),
  kind: Type10.Optional(PostKindSchema),
  tags: Type10.Optional(Type10.Array(Type10.String())),
  thread_id: Type10.Optional(Type10.String()),
  limit: Type10.Optional(Type10.Integer({ minimum: 1, maximum: 100, default: 20 })),
  cursor: Type10.Optional(Type10.String())
}, { additionalProperties: false });
var SearchResultItemSchema = Type10.Object({
  post_id: Type10.String(),
  revision: Type10.Integer({ minimum: 1 }),
  thread_id: Type10.String(),
  kind: PostKindSchema,
  title: Type10.String(),
  summary: Type10.String(),
  tags: Type10.Array(Type10.String()),
  snippet: Type10.String(),
  created_at: Type10.String({ format: "date-time" })
}, { additionalProperties: false });
var ContextQuerySchema = Type10.Object({
  max_bytes: Type10.Optional(Type10.Integer({ minimum: 4096, maximum: 65536, default: 12288 })),
  focus_thread_id: Type10.Optional(Type10.String())
}, { additionalProperties: false });
var ContextResponseDataSchema = Type10.Object({
  space_id: Type10.String(),
  slug: Type10.String(),
  objective: Type10.String(),
  rules: Type10.Array(Type10.String()),
  policy_revision: Type10.Integer({ minimum: 1 }),
  pinned_summaries: Type10.Array(Type10.Object({
    ref: PostRefSchema,
    title: Type10.String(),
    summary: Type10.String(),
    has_newer_revision: Type10.Boolean()
  }, { additionalProperties: false })),
  blocking_objections: Type10.Array(Type10.Object({
    relation_id: Type10.String(),
    source_ref: PostRefSchema,
    target_ref: PostRefSchema,
    issue: Type10.String(),
    impact: Type10.String()
  }, { additionalProperties: false })),
  recent_failures: Type10.Array(Type10.Object({
    ref: PostRefSchema,
    title: Type10.String(),
    category: Type10.String(),
    attempt: Type10.String(),
    tested_scope: Type10.String(),
    evidence_state: Type10.String()
  }, { additionalProperties: false })),
  recent_activity: Type10.Array(Type10.Object({
    type: Type10.String(),
    object_id: Type10.String(),
    occurred_at: Type10.String({ format: "date-time" })
  }, { additionalProperties: false })),
  checkpoint_token: Type10.String()
}, { additionalProperties: false });
var ViewNameSchema = Type10.Union([
  Type10.Literal("failures"),
  Type10.Literal("findings"),
  Type10.Literal("open-questions")
]);

// legacy:packages/protocol/src/review.ts
import { Type as Type11 } from "@sinclair/typebox";
var ReviewPhaseSchema = Type11.Union([
  Type11.Literal("collecting"),
  Type11.Literal("revealed"),
  Type11.Literal("accepted"),
  Type11.Literal("changes_requested"),
  Type11.Literal("rejected"),
  Type11.Literal("stale"),
  Type11.Literal("cancelled")
]);
var ReviewVerdictSchema = Type11.Union([
  Type11.Literal("accept"),
  Type11.Literal("changes_requested"),
  Type11.Literal("reject")
]);
var ReviewCompletionStatusSchema = Type11.Union([
  Type11.Literal("complete"),
  Type11.Literal("provisional")
]);
var CreateReviewRequestSchema = Type11.Object({
  target_ref: PostRefSchema,
  dependency_refs: Type11.Array(PostRefSchema),
  artifact_ids: Type11.Array(Type11.String()),
  code_refs: Type11.Array(Type11.Object({
    repository: Type11.String(),
    commit: Type11.String({ minLength: 40, maxLength: 64 }),
    reproduction_instructions: Type11.String()
  }, { additionalProperties: false })),
  declared_contributors: Type11.Array(Type11.String()),
  reviewer_actor_ids: Type11.Array(Type11.String(), { minItems: 1, maxItems: 5 }),
  expected_policy_revision: Type11.Integer({ minimum: 1 })
}, { additionalProperties: false });
var CreateReviewSubmissionSchema = Type11.Object({
  snapshot_sha256: Type11.String({ minLength: 64, maxLength: 64 }),
  reviewer_session_id: Type11.String({ minLength: 1 }),
  completion_status: ReviewCompletionStatusSchema,
  verdict: ReviewVerdictSchema,
  coverage: Type11.String({ minLength: 1 }),
  checks_performed: Type11.String({ minLength: 1 }),
  evidence_refs: Type11.Array(EvidenceRefSchema),
  pending_requirements: Type11.Array(Type11.String()),
  limitations: Type11.Array(Type11.String()),
  independence_statement: Type11.String({ minLength: 1 })
}, { additionalProperties: false });
var CheckRunResultSchema = Type11.Union([
  Type11.Literal("pass"),
  Type11.Literal("fail"),
  Type11.Literal("error")
]);
var SubmitCheckReceiptSchema = Type11.Object({
  receipt_id: Type11.String({ minLength: 1 }),
  observed_snapshot_sha256: Type11.String({ minLength: 64, maxLength: 64 }),
  observed_check_config_sha256: Type11.String({ minLength: 64, maxLength: 64 }),
  result: CheckRunResultSchema,
  environment: Type11.String({ minLength: 1 }),
  execution_steps: Type11.String({ minLength: 1 }),
  exit_code: Type11.Integer(),
  logs_artifact_id: Type11.String({ minLength: 1 })
}, { additionalProperties: false });
var FinalizeReviewRequestSchema = Type11.Object({
  expected_phase: Type11.Optional(ReviewPhaseSchema)
}, { additionalProperties: false });
var CancelReviewRequestSchema = Type11.Object({
  reason: Type11.String({ minLength: 1, maxLength: 500 })
}, { additionalProperties: false });

// legacy:packages/protocol/src/tools.ts
import { Type as Type12 } from "@sinclair/typebox";
var ToolContextParamsSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  max_bytes: Type12.Optional(Type12.Integer({ minimum: 4096, maximum: 65536 })),
  focus_thread_id: Type12.Optional(Type12.String())
}, { additionalProperties: false });
var ToolSearchParamsSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  q: Type12.String({ minLength: 1, maxLength: 256 }),
  filters: Type12.Optional(Type12.Object({
    kind: Type12.Optional(PostKindSchema),
    tags: Type12.Optional(Type12.Array(Type12.String())),
    thread_id: Type12.Optional(Type12.String())
  }, { additionalProperties: false })),
  limit: Type12.Optional(Type12.Integer({ minimum: 1, maximum: 100 })),
  cursor: Type12.Optional(Type12.String())
}, { additionalProperties: false });
var ToolReadParamsSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  kind: Type12.Union([
    Type12.Literal("thread"),
    Type12.Literal("post"),
    Type12.Literal("artifact"),
    Type12.Literal("review")
  ]),
  id: Type12.String({ minLength: 1 }),
  revision: Type12.Optional(Type12.Integer({ minimum: 1 })),
  cursor: Type12.Optional(Type12.String()),
  max_bytes: Type12.Optional(Type12.Integer({ minimum: 1024, maximum: 65536 }))
}, { additionalProperties: false });
var ToolPublishThreadOpSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  request_key: Type12.String({ minLength: 1, maxLength: 128 }),
  op: Type12.Literal("thread"),
  title: Type12.String({ minLength: 1, maxLength: 160 }),
  initial_post: Type12.Optional(Type12.Object({
    kind: PostKindSchema,
    title: Type12.String({ minLength: 1, maxLength: 160 }),
    summary: Type12.String({ minLength: 1, maxLength: 280 }),
    body: Type12.String({ maxLength: 65536 }),
    tags: Type12.Optional(Type12.Array(Type12.String())),
    structured: Type12.Optional(StructuredContentSchema),
    refs: Type12.Optional(Type12.Array(Type12.Object({
      target_ref: PostRefSchema,
      type: RelationTypeSchema
    }, { additionalProperties: false }))),
    artifact_ids: Type12.Optional(Type12.Array(Type12.String()))
  }, { additionalProperties: false }))
}, { additionalProperties: false });
var ToolPublishPostOpSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  request_key: Type12.String({ minLength: 1, maxLength: 128 }),
  op: Type12.Literal("post"),
  thread_id: Type12.String({ minLength: 1 }),
  kind: PostKindSchema,
  title: Type12.String({ minLength: 1, maxLength: 160 }),
  summary: Type12.String({ minLength: 1, maxLength: 280 }),
  body: Type12.String({ maxLength: 65536 }),
  tags: Type12.Optional(Type12.Array(Type12.String())),
  structured: Type12.Optional(StructuredContentSchema),
  refs: Type12.Optional(Type12.Array(Type12.Object({
    target_ref: PostRefSchema,
    type: RelationTypeSchema
  }, { additionalProperties: false }))),
  artifact_ids: Type12.Optional(Type12.Array(Type12.String()))
}, { additionalProperties: false });
var ToolPublishRevisionOpSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  request_key: Type12.String({ minLength: 1, maxLength: 128 }),
  op: Type12.Literal("revision"),
  post_id: Type12.String({ minLength: 1 }),
  expected_revision: Type12.Integer({ minimum: 1 }),
  title: Type12.String({ minLength: 1, maxLength: 160 }),
  summary: Type12.String({ minLength: 1, maxLength: 280 }),
  body: Type12.String({ maxLength: 65536 }),
  tags: Type12.Optional(Type12.Array(Type12.String())),
  structured: Type12.Optional(StructuredContentSchema),
  refs: Type12.Optional(Type12.Array(Type12.Object({
    target_ref: PostRefSchema,
    type: RelationTypeSchema
  }, { additionalProperties: false }))),
  artifact_ids: Type12.Optional(Type12.Array(Type12.String()))
}, { additionalProperties: false });
var ToolPublishWithdrawOpSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  request_key: Type12.String({ minLength: 1, maxLength: 128 }),
  op: Type12.Literal("withdraw"),
  post_id: Type12.String({ minLength: 1 }),
  expected_revision: Type12.Integer({ minimum: 1 }),
  reason: Type12.String({ minLength: 1, maxLength: 500 })
}, { additionalProperties: false });
var ToolPublishParamsUnion = Type12.Union([
  ToolPublishThreadOpSchema,
  ToolPublishPostOpSchema,
  ToolPublishRevisionOpSchema,
  ToolPublishWithdrawOpSchema
]);
var ToolPublishParamsSchema = {
  ...ToolPublishParamsUnion,
  type: "object"
};
var ToolRelateCreateOpSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  request_key: Type12.String({ minLength: 1, maxLength: 128 }),
  op: Type12.Literal("create"),
  source_ref: PostRefSchema,
  target_ref: PostRefSchema,
  type: RelationTypeSchema
}, { additionalProperties: false });
var ToolRelateResolveOpSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  request_key: Type12.String({ minLength: 1, maxLength: 128 }),
  op: Type12.Literal("resolve"),
  relation_id: Type12.String({ minLength: 1 }),
  expected_version: Type12.Integer({ minimum: 1 }),
  reason_ref: PostRefSchema
}, { additionalProperties: false });
var ToolRelateReopenOpSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  request_key: Type12.String({ minLength: 1, maxLength: 128 }),
  op: Type12.Literal("reopen"),
  relation_id: Type12.String({ minLength: 1 }),
  expected_version: Type12.Integer({ minimum: 1 }),
  reason_ref: PostRefSchema
}, { additionalProperties: false });
var ToolRelateParamsUnion = Type12.Union([
  ToolRelateCreateOpSchema,
  ToolRelateResolveOpSchema,
  ToolRelateReopenOpSchema
]);
var ToolRelateParamsSchema = {
  ...ToolRelateParamsUnion,
  type: "object"
};
var ToolSubscribeParamsSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  request_key: Type12.String({ minLength: 1, maxLength: 128 }),
  consumer_key: Type12.String({ minLength: 1, maxLength: 64 }),
  thread_ids: Type12.Optional(Type12.Array(Type12.String())),
  event_types: Type12.Optional(Type12.Array(EventTypeSchema)),
  start: Type12.Optional(SubscriptionStartSchema),
  checkpoint_token: Type12.Optional(Type12.String())
}, { additionalProperties: false });
var ToolPollParamsSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  consumer_id: Type12.String({ minLength: 1 }),
  limit: Type12.Optional(Type12.Integer({ minimum: 1, maximum: 100 })),
  wait_ms: Type12.Optional(Type12.Integer({ minimum: 0, maximum: 25e3 }))
}, { additionalProperties: false });
var ToolAckParamsSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  consumer_id: Type12.String({ minLength: 1 }),
  batch_id: Type12.String({ minLength: 1 }),
  next_cursor: Type12.String({ minLength: 1 })
}, { additionalProperties: false });
var ToolReviewRequestOpSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  request_key: Type12.String({ minLength: 1, maxLength: 128 }),
  op: Type12.Literal("request"),
  target_ref: PostRefSchema,
  dependency_refs: Type12.Array(PostRefSchema),
  artifact_ids: Type12.Array(Type12.String()),
  code_refs: Type12.Array(Type12.Object({
    repository: Type12.String(),
    commit: Type12.String({ minLength: 40, maxLength: 64 }),
    reproduction_instructions: Type12.String()
  }, { additionalProperties: false })),
  declared_contributors: Type12.Array(Type12.String()),
  reviewer_actor_ids: Type12.Array(Type12.String(), { minItems: 1, maxItems: 5 }),
  expected_policy_revision: Type12.Integer({ minimum: 1 })
}, { additionalProperties: false });
var ToolReviewSubmitOpSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  request_key: Type12.String({ minLength: 1, maxLength: 128 }),
  op: Type12.Literal("submit"),
  request_id: Type12.String({ minLength: 1 }),
  snapshot_sha256: Type12.String({ minLength: 64, maxLength: 64 }),
  reviewer_session_id: Type12.String({ minLength: 1 }),
  completion_status: ReviewCompletionStatusSchema,
  verdict: ReviewVerdictSchema,
  coverage: Type12.String({ minLength: 1 }),
  checks_performed: Type12.String({ minLength: 1 }),
  evidence_refs: Type12.Array(EvidenceRefSchema),
  pending_requirements: Type12.Array(Type12.String()),
  limitations: Type12.Array(Type12.String()),
  independence_statement: Type12.String({ minLength: 1 })
}, { additionalProperties: false });
var ToolReviewFinalizeOpSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  request_key: Type12.String({ minLength: 1, maxLength: 128 }),
  op: Type12.Literal("finalize"),
  request_id: Type12.String({ minLength: 1 }),
  expected_phase: Type12.Optional(ReviewPhaseSchema)
}, { additionalProperties: false });
var ToolReviewCancelOpSchema = Type12.Object({
  space_id: Type12.String({ minLength: 1 }),
  request_key: Type12.String({ minLength: 1, maxLength: 128 }),
  op: Type12.Literal("cancel"),
  request_id: Type12.String({ minLength: 1 }),
  reason: Type12.String({ minLength: 1, maxLength: 500 })
}, { additionalProperties: false });
var ToolReviewParamsUnion = Type12.Union([
  ToolReviewRequestOpSchema,
  ToolReviewSubmitOpSchema,
  ToolReviewFinalizeOpSchema,
  ToolReviewCancelOpSchema
]);
var ToolReviewParamsSchema = {
  ...ToolReviewParamsUnion,
  type: "object"
};

// legacy:packages/core/src/services/auth-service.ts
var AuthService = class {
  constructor(storage, hasher, clock) {
    this.storage = storage;
    this.hasher = hasher;
    this.clock = clock;
  }
  storage;
  hasher;
  clock;
  authenticateToken(rawToken) {
    if (!rawToken || typeof rawToken !== "string") {
      throw new DetunedError(
        ErrorCode.UNAUTHENTICATED,
        "\u7F3A\u5C11\u6216\u65E0\u6548\u7684 Authorization Token\u3002",
        401
      );
    }
    const tokenHash = this.hasher.sha256(rawToken.trim());
    const cred = this.storage.findCredentialByTokenHash(tokenHash);
    if (!cred) {
      throw new DetunedError(
        ErrorCode.UNAUTHENTICATED,
        "\u51ED\u636E\u4E0D\u5B58\u5728\u6216\u5DF2\u5931\u6548\u3002",
        401
      );
    }
    const nowIso = this.clock.nowIso();
    if (cred.revoked_at) {
      throw new DetunedError(
        ErrorCode.UNAUTHENTICATED,
        "\u51ED\u636E\u5DF2\u88AB\u64A4\u9500\u3002",
        401
      );
    }
    if (cred.expires_at && cred.expires_at < nowIso) {
      throw new DetunedError(
        ErrorCode.UNAUTHENTICATED,
        "\u51ED\u636E\u5DF2\u8FC7\u671F\u3002",
        401
      );
    }
    const actor = this.storage.findActorById(cred.actor_id);
    if (!actor || actor.disabled_at) {
      throw new DetunedError(
        ErrorCode.UNAUTHENTICATED,
        "\u8EAB\u4EFD\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u7981\u7528\u3002",
        401
      );
    }
    return { actor, credential: cred };
  }
  requireInstanceAdmin(auth) {
    if (!auth.credential.capabilities.includes("admin")) {
      throw new DetunedError(
        ErrorCode.FORBIDDEN,
        "\u9700\u8981\u5B9E\u4F8B\u7BA1\u7406\u5458\u6743\u9650\u3002",
        403
      );
    }
  }
  requireSpaceAccess(auth, spaceId, minimumRole = "observer") {
    const space = this.storage.findSpaceById(spaceId);
    if (!space) {
      throw new DetunedError(
        ErrorCode.NOT_FOUND,
        "\u7A7A\u95F4\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE\u3002",
        404
      );
    }
    const allowed = auth.credential.allowed_space_ids.length === 0 || auth.credential.allowed_space_ids.includes("*") || auth.credential.allowed_space_ids.includes(spaceId);
    if (!allowed) {
      throw new DetunedError(
        ErrorCode.NOT_FOUND,
        "\u7A7A\u95F4\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE\u3002",
        404
      );
    }
    let membership = this.storage.getMembership(spaceId, auth.actor.id);
    if (!membership && auth.credential.capabilities.includes("admin")) {
      membership = {
        space_id: spaceId,
        actor_id: auth.actor.id,
        role: "owner",
        active: true,
        reviewer_eligible: true,
        independence_group: null
      };
    }
    if (!membership || !membership.active) {
      throw new DetunedError(
        ErrorCode.NOT_FOUND,
        "\u7A7A\u95F4\u4E0D\u5B58\u5728\u6216\u65E0\u6743\u8BBF\u95EE\u3002",
        404
      );
    }
    const roleLevels = {
      observer: 1,
      contributor: 2,
      maintainer: 3,
      owner: 4
    };
    if (roleLevels[membership.role] < roleLevels[minimumRole]) {
      throw new DetunedError(
        ErrorCode.FORBIDDEN,
        `\u8BE5\u64CD\u4F5C\u9700\u8981 ${minimumRole} \u6216\u66F4\u9AD8\u89D2\u8272\u6743\u9650\u3002`,
        403
      );
    }
    if (minimumRole !== "observer") {
      const hasWrite = auth.credential.capabilities.includes("write") || auth.credential.capabilities.includes("admin");
      if (!hasWrite) {
        throw new DetunedError(
          ErrorCode.FORBIDDEN,
          "\u51ED\u636E\u7F3A\u5C11 write \u5199\u5165\u80FD\u529B\u3002",
          403
        );
      }
    }
    return {
      actor: auth.actor,
      credential: auth.credential,
      membership,
      spaceRole: membership.role
    };
  }
};

// legacy:packages/core/src/services/idempotency-service.ts
var IdempotencyService = class {
  constructor(storage, hasher, clock) {
    this.storage = storage;
    this.hasher = hasher;
    this.clock = clock;
  }
  storage;
  hasher;
  clock;
  executeIdempotent(actorId, spaceId, operation, key, payload, statusCode, action) {
    if (!key || typeof key !== "string") {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        "\u7F3A\u5C11 Idempotency-Key / request_key\u3002",
        400
      );
    }
    const requestHash = this.hasher.sha256(this.hasher.canonicalJson(payload));
    return this.storage.transaction((tx) => {
      const existing = tx.getIdempotencyRecord(actorId, spaceId, operation, key);
      if (existing) {
        if (existing.request_hash !== requestHash) {
          throw new DetunedError(
            ErrorCode.IDEMPOTENCY_CONFLICT,
            "\u540C\u540D Idempotency-Key \u5305\u542B\u4E0D\u540C\u7684\u8BF7\u6C42\u5185\u5BB9\u3002",
            409,
            false,
            { key }
          );
        }
        const parsed = JSON.parse(existing.result_ref);
        return { data: parsed, isReplay: true };
      }
      const result = action(tx);
      const record = {
        actor_id: actorId,
        space_id: spaceId,
        operation,
        key,
        request_hash: requestHash,
        result_ref: JSON.stringify(result),
        http_status: statusCode,
        created_at: this.clock.nowIso()
      };
      tx.createIdempotencyRecord(record);
      return { data: result, isReplay: false };
    });
  }
};

// legacy:packages/core/src/services/space-service.ts
var DEFAULT_REVIEW_POLICY = {
  enabled: true,
  required_reviewers: 2,
  exclude_contributors: true,
  distinct_actors: true,
  distinct_independence_groups: false,
  seal_until_all_submitted: true,
  invalidate_on_revision: true,
  required_checks: ["reproduce"],
  allow_open_objections: false
};
var SpaceService = class {
  constructor(storage, idGen, clock, authService, idempotency) {
    this.storage = storage;
    this.idGen = idGen;
    this.clock = clock;
    this.authService = authService;
    this.idempotency = idempotency;
  }
  storage;
  idGen;
  clock;
  authService;
  idempotency;
  createSpace(auth, req, requestKey) {
    this.authService.requireInstanceAdmin(auth);
    return this.idempotency.executeIdempotent(
      auth.actor.id,
      "instance",
      "space.create",
      requestKey,
      req,
      201,
      (tx) => {
        const existing = tx.findSpaceBySlug(req.slug);
        if (existing) {
          throw new DetunedError(
            ErrorCode.IDEMPOTENCY_CONFLICT,
            `\u7A7A\u95F4\u6807\u8BC6 slug '${req.slug}' \u5DF2\u88AB\u4F7F\u7528\u3002`,
            409
          );
        }
        const now = this.clock.nowIso();
        const spaceId = this.idGen.generateId("spc");
        const space = {
          id: spaceId,
          slug: req.slug,
          current_revision: 1,
          policy_revision: 1,
          acl_epoch: 1,
          created_at: now
        };
        const revision = {
          space_id: spaceId,
          revision: 1,
          objective: req.objective,
          rules: req.rules,
          review_policy: req.review_policy ?? DEFAULT_REVIEW_POLICY,
          check_profiles: req.check_profiles ?? {},
          pinned_refs: [],
          editor_id: auth.actor.id,
          created_at: now
        };
        tx.createSpace(space, revision);
        tx.upsertMembership({
          space_id: spaceId,
          actor_id: auth.actor.id,
          role: "owner",
          active: true,
          reviewer_eligible: true,
          independence_group: null
        });
        tx.appendEvent(spaceId, {
          id: this.idGen.generateId("evt"),
          space_id: spaceId,
          type: "space.revised",
          object_id: spaceId,
          revision: 1,
          visibility: "public",
          actor_id: auth.actor.id,
          created_at: now
        });
        return { space, revision };
      }
    ).data;
  }
  patchSpace(auth, spaceId, req, requestKey) {
    this.authService.requireSpaceAccess(auth, spaceId, "maintainer");
    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      "space.patch",
      requestKey,
      req,
      200,
      (tx) => {
        const space = tx.findSpaceById(spaceId);
        if (!space) {
          throw new DetunedError(ErrorCode.NOT_FOUND, "\u7A7A\u95F4\u4E0D\u5B58\u5728\u3002", 404);
        }
        if (space.current_revision !== req.expected_revision) {
          throw new DetunedError(
            ErrorCode.REVISION_CONFLICT,
            "\u7A7A\u95F4\u89C4\u5219\u5DF2\u6709\u66F4\u65B0\uFF0C\u8BF7\u83B7\u53D6\u6700\u65B0\u7248\u672C\u540E\u91CD\u8BD5\u3002",
            409,
            false,
            { current_revision: space.current_revision }
          );
        }
        const currentRev = tx.getSpaceRevision(spaceId, space.current_revision);
        if (!currentRev) {
          throw new DetunedError(ErrorCode.NOT_FOUND, "\u7A7A\u95F4\u4FEE\u8BA2\u5386\u53F2\u4E0D\u5B58\u5728\u3002", 404);
        }
        const now = this.clock.nowIso();
        const nextRevision = space.current_revision + 1;
        const policyChanged = req.objective !== void 0 || req.rules !== void 0 || req.review_policy !== void 0 || req.check_profiles !== void 0;
        const nextPolicyRevision = policyChanged ? nextRevision : space.policy_revision;
        const updatedSpace = {
          ...space,
          current_revision: nextRevision,
          policy_revision: nextPolicyRevision
        };
        const newRevision = {
          space_id: spaceId,
          revision: nextRevision,
          objective: req.objective ?? currentRev.objective,
          rules: req.rules ?? currentRev.rules,
          review_policy: req.review_policy ?? currentRev.review_policy,
          check_profiles: req.check_profiles ?? currentRev.check_profiles,
          pinned_refs: req.pinned_refs ?? currentRev.pinned_refs,
          editor_id: auth.actor.id,
          created_at: now
        };
        tx.updateSpace(updatedSpace, newRevision);
        tx.appendEvent(spaceId, {
          id: this.idGen.generateId("evt"),
          space_id: spaceId,
          type: "space.revised",
          object_id: spaceId,
          revision: nextRevision,
          visibility: "public",
          actor_id: auth.actor.id,
          created_at: now
        });
        return { space: updatedSpace, revision: newRevision };
      }
    ).data;
  }
  createSession(auth, spaceId, req) {
    this.authService.requireSpaceAccess(auth, spaceId, "observer");
    const session = {
      id: this.idGen.generateId("ses"),
      actor_id: auth.actor.id,
      space_id: spaceId,
      client_name: req.client_name,
      client_version: req.client_version,
      harness_session_id: req.harness_session_id ?? null,
      metadata: req.metadata ?? {},
      created_at: this.clock.nowIso()
    };
    this.storage.createSession(session);
    return session;
  }
};

// legacy:packages/core/src/services/thread-service.ts
var ThreadService = class {
  constructor(storage, idGen, clock, hasher, authService, idempotency) {
    this.storage = storage;
    this.idGen = idGen;
    this.clock = clock;
    this.hasher = hasher;
    this.authService = authService;
    this.idempotency = idempotency;
  }
  storage;
  idGen;
  clock;
  hasher;
  authService;
  idempotency;
  validateStructuredContent(kind, structured) {
    const structuredRequiredKinds = ["proposal", "claim", "objection", "failure", "summary"];
    if (structuredRequiredKinds.includes(kind)) {
      if (!structured || typeof structured !== "object") {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          `${kind} \u7C7B\u578B\u7684\u5E16\u5B50\u5FC5\u987B\u63D0\u4F9B structured \u7ED3\u6784\u5316\u5B57\u6BB5\u3002`,
          422
        );
      }
    }
    if (!structured) return;
    if (kind === "proposal" || kind === "claim") {
      if (!structured.statement || typeof structured.statement !== "string" || structured.statement.trim() === "" || !Array.isArray(structured.assumptions) || !structured.scope || typeof structured.scope !== "string" || structured.scope.trim() === "" || !structured.falsification_plan || typeof structured.falsification_plan !== "string" || structured.falsification_plan.trim() === "") {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "proposal/claim \u5FC5\u987B\u5305\u542B statement, assumptions (\u6570\u7EC4), scope, falsification_plan\u3002",
          422
        );
      }
    } else if (kind === "objection") {
      if (!structured.target_ref || !structured.issue || !structured.impact) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "objection \u5FC5\u987B\u5305\u542B target_ref, issue, impact\u3002",
          422
        );
      }
    } else if (kind === "failure") {
      if (!structured.attempt || !structured.category || !Array.isArray(structured.assumptions) || !structured.tested_scope || !structured.expected || !structured.observed || !structured.ruled_out) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "failure \u5FC5\u987B\u5305\u542B attempt, category, assumptions (\u6570\u7EC4), tested_scope, expected, observed, ruled_out\u3002",
          422
        );
      }
    } else if (kind === "summary") {
      if (!Array.isArray(structured.source_refs) || structured.source_refs.length === 0) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "summary \u5FC5\u987B\u5305\u542B\u81F3\u5C11\u4E00\u4E2A source_refs\u3002",
          422
        );
      }
    }
  }
  createThread(auth, spaceId, req, requestKey) {
    this.authService.requireSpaceAccess(auth, spaceId, "contributor");
    if (req.title && Buffer.byteLength(req.title, "utf8") > 160) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        "\u6807\u9898\u957F\u5EA6\u8D85\u51FA\u4E0A\u9650 (160 \u5B57\u7B26/\u5B57\u8282)\u3002",
        400
      );
    }
    if (req.initial_post) {
      if (req.initial_post.artifact_ids && req.initial_post.artifact_ids.length > 0) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "\u9644\u4EF6\u5B58\u50A8\u5728 M1 \u5C1A\u672A\u5F00\u653E (scheduled for M2)\u3002",
          400
        );
      }
      if (req.initial_post.title && Buffer.byteLength(req.initial_post.title, "utf8") > 160) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "\u521D\u59CB\u5E16\u5B50\u6807\u9898\u957F\u5EA6\u8D85\u51FA\u4E0A\u9650 (160 \u5B57\u7B26/\u5B57\u8282)\u3002",
          400
        );
      }
      if (req.initial_post.body && Buffer.byteLength(req.initial_post.body, "utf8") > 65536) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "\u521D\u59CB\u5E16\u5B50\u6B63\u6587\u5927\u5C0F\u8D85\u51FA\u4E0A\u9650 (64KB)\u3002",
          422
        );
      }
      this.validateStructuredContent(req.initial_post.kind, req.initial_post.structured);
    }
    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      "thread.create",
      requestKey,
      req,
      201,
      (tx) => {
        const now = this.clock.nowIso();
        const threadId = this.idGen.generateId("thd");
        const thread = {
          id: threadId,
          space_id: spaceId,
          title: req.title,
          version: 1,
          state: "open",
          creator_id: auth.actor.id,
          created_at: now,
          updated_at: now
        };
        tx.createThread(thread);
        tx.appendEvent(spaceId, {
          id: this.idGen.generateId("evt"),
          space_id: spaceId,
          type: "thread.created",
          object_id: threadId,
          revision: null,
          visibility: "public",
          actor_id: auth.actor.id,
          created_at: now
        });
        let initial_post = void 0;
        if (req.initial_post) {
          const postId = this.idGen.generateId("pst");
          const post = {
            id: postId,
            space_id: spaceId,
            thread_id: threadId,
            author_id: auth.actor.id,
            kind: req.initial_post.kind,
            current_revision: 1,
            lifecycle: "active",
            created_at: now
          };
          const body = req.initial_post.body ?? "";
          const contentHash = this.hasher.sha256(
            `${req.initial_post.title}
${req.initial_post.summary}
${body}
${this.hasher.canonicalJson(req.initial_post.structured ?? {})}`
          );
          const postRev = {
            post_id: postId,
            revision: 1,
            title: req.initial_post.title,
            summary: req.initial_post.summary,
            body,
            tags: req.initial_post.tags ?? [],
            structured: req.initial_post.structured ?? {},
            content_hash: contentHash,
            editor_id: auth.actor.id,
            created_at: now
          };
          tx.createPost(post, postRev);
          if (req.initial_post.refs && req.initial_post.refs.length > 0) {
            for (const ref of req.initial_post.refs) {
              const targetPost = tx.findPostById(ref.target_ref.post_id);
              if (!targetPost || targetPost.space_id !== spaceId) {
                throw new DetunedError(
                  ErrorCode.NOT_FOUND,
                  `\u5F15\u7528\u7684\u76EE\u6807\u5E16\u5B50 ${ref.target_ref.post_id} \u4E0D\u5B58\u5728\u4E8E\u672C\u7A7A\u95F4\u3002`,
                  404
                );
              }
              const targetRev = tx.getPostRevision(ref.target_ref.post_id, ref.target_ref.revision);
              if (!targetRev) {
                throw new DetunedError(
                  ErrorCode.NOT_FOUND,
                  `\u5F15\u7528\u7684\u76EE\u6807\u5E16\u5B50\u4FEE\u8BA2\u7248\u672C ${ref.target_ref.revision} \u4E0D\u5B58\u5728\u3002`,
                  404
                );
              }
              const relId = this.idGen.generateId("rel");
              const rel = {
                id: relId,
                space_id: spaceId,
                source_post_id: postId,
                source_revision: 1,
                target_post_id: ref.target_ref.post_id,
                target_revision: ref.target_ref.revision,
                type: ref.type,
                state: ref.type === "challenges" ? "open" : "resolved",
                version: 1,
                creator_id: auth.actor.id,
                created_at: now
              };
              tx.createRelation(rel);
              tx.appendEvent(spaceId, {
                id: this.idGen.generateId("evt"),
                space_id: spaceId,
                type: "relation.created",
                object_id: relId,
                revision: 1,
                visibility: "public",
                actor_id: auth.actor.id,
                created_at: now
              });
            }
          }
          tx.appendEvent(spaceId, {
            id: this.idGen.generateId("evt"),
            space_id: spaceId,
            type: "post.created",
            object_id: postId,
            revision: 1,
            visibility: "public",
            actor_id: auth.actor.id,
            created_at: now
          });
          initial_post = { post, revision: postRev };
        }
        return { thread, initial_post };
      }
    ).data;
  }
  patchThread(auth, spaceId, threadId, req, requestKey) {
    const spaceAuth = this.authService.requireSpaceAccess(auth, spaceId, "contributor");
    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      `thread.patch:${threadId}`,
      requestKey,
      req,
      200,
      (tx) => {
        const thread = tx.findThreadById(threadId);
        if (!thread || thread.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, "\u4E3B\u9898\u4E0D\u5B58\u5728\u3002", 404);
        }
        const isCreator = thread.creator_id === auth.actor.id;
        const isMaintainerOrAbove = ["maintainer", "owner"].includes(spaceAuth.spaceRole);
        if (!isCreator && !isMaintainerOrAbove) {
          throw new DetunedError(ErrorCode.FORBIDDEN, "\u65E0\u6743\u4FEE\u6539\u8BE5\u4E3B\u9898\u3002", 403);
        }
        if (thread.version !== req.expected_version) {
          throw new DetunedError(
            ErrorCode.REVISION_CONFLICT,
            "\u4E3B\u9898\u5DF2\u88AB\u5176\u4ED6\u64CD\u4F5C\u66F4\u65B0\uFF0C\u8BF7\u83B7\u53D6\u6700\u65B0\u72B6\u6001\u540E\u91CD\u8BD5\u3002",
            409,
            false,
            { current_version: thread.version }
          );
        }
        const now = this.clock.nowIso();
        const updated = {
          ...thread,
          title: req.title ?? thread.title,
          state: req.state ?? thread.state,
          version: thread.version + 1,
          updated_at: now
        };
        tx.updateThread(updated);
        tx.appendEvent(spaceId, {
          id: this.idGen.generateId("evt"),
          space_id: spaceId,
          type: "thread.updated",
          object_id: threadId,
          revision: null,
          visibility: "public",
          actor_id: auth.actor.id,
          created_at: now
        });
        return updated;
      }
    ).data;
  }
};

// legacy:packages/core/src/services/post-service.ts
var PostService = class {
  constructor(storage, idGen, clock, hasher, authService, idempotency) {
    this.storage = storage;
    this.idGen = idGen;
    this.clock = clock;
    this.hasher = hasher;
    this.authService = authService;
    this.idempotency = idempotency;
  }
  storage;
  idGen;
  clock;
  hasher;
  authService;
  idempotency;
  validateStructuredContent(kind, structured) {
    const structuredRequiredKinds = ["proposal", "claim", "objection", "failure", "summary"];
    if (structuredRequiredKinds.includes(kind)) {
      if (!structured || typeof structured !== "object") {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          `${kind} \u7C7B\u578B\u7684\u5E16\u5B50\u5FC5\u987B\u63D0\u4F9B structured \u7ED3\u6784\u5316\u5B57\u6BB5\u3002`,
          422
        );
      }
    }
    if (!structured) return;
    if (kind === "proposal" || kind === "claim") {
      if (!structured.statement || typeof structured.statement !== "string" || structured.statement.trim() === "" || !Array.isArray(structured.assumptions) || !structured.scope || typeof structured.scope !== "string" || structured.scope.trim() === "" || !structured.falsification_plan || typeof structured.falsification_plan !== "string" || structured.falsification_plan.trim() === "") {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "proposal/claim \u5FC5\u987B\u5305\u542B statement, assumptions (\u6570\u7EC4), scope, falsification_plan\u3002",
          422
        );
      }
    } else if (kind === "objection") {
      if (!structured.target_ref || !structured.issue || !structured.impact) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "objection \u5FC5\u987B\u5305\u542B target_ref, issue, impact\u3002",
          422
        );
      }
    } else if (kind === "failure") {
      if (!structured.attempt || !structured.category || !Array.isArray(structured.assumptions) || !structured.tested_scope || !structured.expected || !structured.observed || !structured.ruled_out) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "failure \u5FC5\u987B\u5305\u542B attempt, category, assumptions (\u6570\u7EC4), tested_scope, expected, observed, ruled_out\u3002",
          422
        );
      }
    } else if (kind === "summary") {
      if (!Array.isArray(structured.source_refs) || structured.source_refs.length === 0) {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "summary \u5FC5\u987B\u5305\u542B\u81F3\u5C11\u4E00\u4E2A source_refs\u3002",
          422
        );
      }
    }
  }
  createPost(auth, spaceId, threadId, req, requestKey) {
    this.authService.requireSpaceAccess(auth, spaceId, "contributor");
    if (req.artifact_ids && req.artifact_ids.length > 0) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        "\u9644\u4EF6\u5B58\u50A8\u5728 M1 \u5C1A\u672A\u5F00\u653E (scheduled for M2)\u3002",
        400
      );
    }
    if (req.title && Buffer.byteLength(req.title, "utf8") > 160) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        "\u6807\u9898\u957F\u5EA6\u8D85\u51FA\u4E0A\u9650 (160 \u5B57\u7B26/\u5B57\u8282)\u3002",
        400
      );
    }
    if (req.body && Buffer.byteLength(req.body, "utf8") > 65536) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        "\u6B63\u6587\u5927\u5C0F\u8D85\u51FA\u4E0A\u9650 (64KB)\u3002",
        422
      );
    }
    this.validateStructuredContent(req.kind, req.structured);
    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      `post.create:${threadId}`,
      requestKey,
      req,
      201,
      (tx) => {
        const thread = tx.findThreadById(threadId);
        if (!thread || thread.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, "\u4E3B\u9898\u4E0D\u5B58\u5728\u3002", 404);
        }
        if (thread.state === "archived") {
          throw new DetunedError(
            ErrorCode.FORBIDDEN,
            "\u4E3B\u9898\u5DF2\u5F52\u6863\uFF0C\u7981\u6B62\u53D1\u5E03\u65B0\u5E16\u5B50\u3002",
            403
          );
        }
        const now = this.clock.nowIso();
        const postId = this.idGen.generateId("pst");
        const body = req.body ?? "";
        const contentHash = this.hasher.sha256(
          `${req.title}
${req.summary}
${body}
${this.hasher.canonicalJson(req.structured ?? {})}`
        );
        const post = {
          id: postId,
          space_id: spaceId,
          thread_id: threadId,
          author_id: auth.actor.id,
          kind: req.kind,
          current_revision: 1,
          lifecycle: "active",
          created_at: now
        };
        const postRev = {
          post_id: postId,
          revision: 1,
          title: req.title,
          summary: req.summary,
          body,
          tags: req.tags ?? [],
          structured: req.structured ?? {},
          content_hash: contentHash,
          editor_id: auth.actor.id,
          created_at: now
        };
        tx.createPost(post, postRev);
        const relations = [];
        if (req.refs && req.refs.length > 0) {
          for (const ref of req.refs) {
            const targetPost = tx.findPostById(ref.target_ref.post_id);
            if (!targetPost || targetPost.space_id !== spaceId) {
              throw new DetunedError(
                ErrorCode.NOT_FOUND,
                `\u5F15\u7528\u7684\u76EE\u6807\u5E16\u5B50 ${ref.target_ref.post_id} \u4E0D\u5B58\u5728\u4E8E\u672C\u7A7A\u95F4\u3002`,
                404
              );
            }
            const targetRev = tx.getPostRevision(ref.target_ref.post_id, ref.target_ref.revision);
            if (!targetRev) {
              throw new DetunedError(
                ErrorCode.NOT_FOUND,
                `\u5F15\u7528\u7684\u76EE\u6807\u5E16\u5B50\u4FEE\u8BA2\u7248\u672C ${ref.target_ref.revision} \u4E0D\u5B58\u5728\u3002`,
                404
              );
            }
            const relId = this.idGen.generateId("rel");
            const rel = {
              id: relId,
              space_id: spaceId,
              source_post_id: postId,
              source_revision: 1,
              target_post_id: ref.target_ref.post_id,
              target_revision: ref.target_ref.revision,
              type: ref.type,
              state: ref.type === "challenges" ? "open" : "resolved",
              version: 1,
              creator_id: auth.actor.id,
              created_at: now
            };
            tx.createRelation(rel);
            relations.push(rel);
            tx.appendEvent(spaceId, {
              id: this.idGen.generateId("evt"),
              space_id: spaceId,
              type: "relation.created",
              object_id: relId,
              revision: 1,
              visibility: "public",
              actor_id: auth.actor.id,
              created_at: now
            });
          }
        }
        tx.appendEvent(spaceId, {
          id: this.idGen.generateId("evt"),
          space_id: spaceId,
          type: "post.created",
          object_id: postId,
          revision: 1,
          visibility: "public",
          actor_id: auth.actor.id,
          created_at: now
        });
        return { post, revision: postRev, relations };
      }
    ).data;
  }
  createRevision(auth, spaceId, postId, req, requestKey) {
    this.authService.requireSpaceAccess(auth, spaceId, "contributor");
    if (req.artifact_ids && req.artifact_ids.length > 0) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        "\u9644\u4EF6\u5B58\u50A8\u5728 M1 \u5C1A\u672A\u5F00\u653E (scheduled for M2)\u3002",
        400
      );
    }
    if (req.title && Buffer.byteLength(req.title, "utf8") > 160) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        "\u6807\u9898\u957F\u5EA6\u8D85\u51FA\u4E0A\u9650 (160 \u5B57\u7B26/\u5B57\u8282)\u3002",
        400
      );
    }
    if (req.body && Buffer.byteLength(req.body, "utf8") > 65536) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        "\u6B63\u6587\u5927\u5C0F\u8D85\u51FA\u4E0A\u9650 (64KB)\u3002",
        422
      );
    }
    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      `post.revision:${postId}`,
      requestKey,
      req,
      201,
      (tx) => {
        const post = tx.findPostById(postId);
        if (!post || post.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, "\u5E16\u5B50\u4E0D\u5B58\u5728\u3002", 404);
        }
        if (post.author_id !== auth.actor.id) {
          throw new DetunedError(
            ErrorCode.FORBIDDEN,
            "\u4EC5\u539F\u4F5C\u8005\u53EF\u4E3A\u6B64\u5E16\u5B50\u53D1\u5E03\u65B0\u4FEE\u8BA2\u3002",
            403
          );
        }
        if (post.lifecycle !== "active") {
          throw new DetunedError(
            ErrorCode.FORBIDDEN,
            "\u975E\u6D3B\u8DC3\u72B6\u6001\u7684\u5E16\u5B50\u4E0D\u53EF\u53D1\u5E03\u65B0\u4FEE\u8BA2\u3002",
            403
          );
        }
        if (post.current_revision !== req.expected_revision) {
          throw new DetunedError(
            ErrorCode.REVISION_CONFLICT,
            "\u8BE5\u5E16\u5B50\u5DF2\u6709\u65B0\u4FEE\u8BA2\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6\u540E\u63D0\u4EA4\u3002",
            409,
            false,
            { current_revision: post.current_revision }
          );
        }
        this.validateStructuredContent(post.kind, req.structured);
        const now = this.clock.nowIso();
        const nextRevision = post.current_revision + 1;
        const body = req.body ?? "";
        const contentHash = this.hasher.sha256(
          `${req.title}
${req.summary}
${body}
${this.hasher.canonicalJson(req.structured ?? {})}`
        );
        const updatedPost = {
          ...post,
          current_revision: nextRevision
        };
        const postRev = {
          post_id: postId,
          revision: nextRevision,
          title: req.title,
          summary: req.summary,
          body,
          tags: req.tags ?? [],
          structured: req.structured ?? {},
          content_hash: contentHash,
          editor_id: auth.actor.id,
          created_at: now
        };
        tx.createPostRevision(updatedPost, postRev);
        const relations = [];
        if (req.refs && req.refs.length > 0) {
          for (const ref of req.refs) {
            const targetPost = tx.findPostById(ref.target_ref.post_id);
            if (!targetPost || targetPost.space_id !== spaceId) {
              throw new DetunedError(
                ErrorCode.NOT_FOUND,
                `\u5F15\u7528\u7684\u76EE\u6807\u5E16\u5B50 ${ref.target_ref.post_id} \u4E0D\u5B58\u5728\u3002`,
                404
              );
            }
            const targetRev = tx.getPostRevision(ref.target_ref.post_id, ref.target_ref.revision);
            if (!targetRev) {
              throw new DetunedError(
                ErrorCode.NOT_FOUND,
                `\u5F15\u7528\u7684\u76EE\u6807\u5E16\u5B50\u4FEE\u8BA2\u7248\u672C ${ref.target_ref.revision} \u4E0D\u5B58\u5728\u3002`,
                404
              );
            }
            const relId = this.idGen.generateId("rel");
            const rel = {
              id: relId,
              space_id: spaceId,
              source_post_id: postId,
              source_revision: nextRevision,
              target_post_id: ref.target_ref.post_id,
              target_revision: ref.target_ref.revision,
              type: ref.type,
              state: ref.type === "challenges" ? "open" : "resolved",
              version: 1,
              creator_id: auth.actor.id,
              created_at: now
            };
            tx.createRelation(rel);
            relations.push(rel);
            tx.appendEvent(spaceId, {
              id: this.idGen.generateId("evt"),
              space_id: spaceId,
              type: "relation.created",
              object_id: relId,
              revision: 1,
              visibility: "public",
              actor_id: auth.actor.id,
              created_at: now
            });
          }
        }
        tx.appendEvent(spaceId, {
          id: this.idGen.generateId("evt"),
          space_id: spaceId,
          type: "post.revised",
          object_id: postId,
          revision: nextRevision,
          visibility: "public",
          actor_id: auth.actor.id,
          created_at: now
        });
        return { post: updatedPost, revision: postRev, relations };
      }
    ).data;
  }
  withdrawPost(auth, spaceId, postId, req, requestKey) {
    const spaceAuth = this.authService.requireSpaceAccess(auth, spaceId, "contributor");
    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      `post.withdraw:${postId}`,
      requestKey,
      req,
      200,
      (tx) => {
        const post = tx.findPostById(postId);
        if (!post || post.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, "\u5E16\u5B50\u4E0D\u5B58\u5728\u3002", 404);
        }
        const isAuthor = post.author_id === auth.actor.id;
        const isMaintainer = ["maintainer", "owner"].includes(spaceAuth.spaceRole);
        if (!isAuthor && !isMaintainer) {
          throw new DetunedError(
            ErrorCode.FORBIDDEN,
            "\u4EC5\u4F5C\u8005\u6216\u7A7A\u95F4\u7EF4\u62A4\u8005\u53EF\u4EE5\u64A4\u56DE\u5E16\u5B50\u3002",
            403
          );
        }
        if (post.current_revision !== req.expected_revision) {
          throw new DetunedError(
            ErrorCode.REVISION_CONFLICT,
            "\u5E16\u5B50\u4FEE\u8BA2\u7248\u672C\u4E0E\u8BF7\u6C42\u4E0D\u4E00\u81F4\u3002",
            409,
            false,
            { current_revision: post.current_revision }
          );
        }
        const updated = {
          ...post,
          lifecycle: "withdrawn"
        };
        tx.updatePost(updated);
        tx.appendEvent(spaceId, {
          id: this.idGen.generateId("evt"),
          space_id: spaceId,
          type: "post.withdrawn",
          object_id: postId,
          revision: post.current_revision,
          visibility: "public",
          actor_id: auth.actor.id,
          created_at: this.clock.nowIso()
        });
        return updated;
      }
    ).data;
  }
  getPost(auth, spaceId, postId, revision) {
    this.authService.requireSpaceAccess(auth, spaceId, "observer");
    const post = this.storage.findPostById(postId);
    if (!post || post.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.NOT_FOUND, "\u5E16\u5B50\u4E0D\u5B58\u5728\u3002", 404);
    }
    if (post.lifecycle === "redacted") {
      throw new DetunedError(ErrorCode.CONTENT_REDACTED, "\u8BE5\u5185\u5BB9\u5DF2\u88AB\u8131\u654F\u79FB\u9664\u3002", 410);
    }
    const revNum = revision ?? post.current_revision;
    const postRev = this.storage.getPostRevision(postId, revNum);
    if (!postRev) {
      throw new DetunedError(
        ErrorCode.NOT_FOUND,
        `\u5E16\u5B50\u4FEE\u8BA2\u7248\u672C ${revNum} \u4E0D\u5B58\u5728\u3002`,
        404
      );
    }
    return { post, revision: postRev };
  }
};

// legacy:packages/core/src/services/relation-service.ts
var RelationService = class {
  constructor(storage, idGen, clock, authService, idempotency) {
    this.storage = storage;
    this.idGen = idGen;
    this.clock = clock;
    this.authService = authService;
    this.idempotency = idempotency;
  }
  storage;
  idGen;
  clock;
  authService;
  idempotency;
  createRelation(auth, spaceId, req, requestKey) {
    const spaceAuth = this.authService.requireSpaceAccess(auth, spaceId, "contributor");
    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      "relation.create",
      requestKey,
      req,
      201,
      (tx) => {
        const sourcePost = tx.findPostById(req.source_ref.post_id);
        if (!sourcePost || sourcePost.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, "\u6E90\u5E16\u5B50\u4E0D\u5B58\u5728\u3002", 404);
        }
        const sourceRev = tx.getPostRevision(req.source_ref.post_id, req.source_ref.revision);
        if (!sourceRev) {
          throw new DetunedError(ErrorCode.NOT_FOUND, "\u6E90\u5E16\u5B50\u4FEE\u8BA2\u7248\u672C\u4E0D\u5B58\u5728\u3002", 404);
        }
        const targetPost = tx.findPostById(req.target_ref.post_id);
        if (!targetPost || targetPost.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, "\u76EE\u6807\u5E16\u5B50\u4E0D\u5B58\u5728\u3002", 404);
        }
        const targetRev = tx.getPostRevision(req.target_ref.post_id, req.target_ref.revision);
        if (!targetRev) {
          throw new DetunedError(ErrorCode.NOT_FOUND, "\u76EE\u6807\u5E16\u5B50\u4FEE\u8BA2\u7248\u672C\u4E0D\u5B58\u5728\u3002", 404);
        }
        const isSourceAuthor = sourcePost.author_id === auth.actor.id;
        const isMaintainer = ["maintainer", "owner"].includes(spaceAuth.spaceRole);
        if (!isSourceAuthor && !isMaintainer) {
          throw new DetunedError(
            ErrorCode.FORBIDDEN,
            "\u5FC5\u987B\u62E5\u6709\u6E90\u5E16\u5B50\u6216\u5177\u5907\u7EF4\u62A4\u8005\u6743\u9650\u624D\u80FD\u521B\u5EFA\u5173\u7CFB\u3002",
            403
          );
        }
        const existing = tx.findRelationByEndpoints(
          spaceId,
          req.source_ref.post_id,
          req.source_ref.revision,
          req.target_ref.post_id,
          req.target_ref.revision,
          req.type
        );
        if (existing) {
          return existing;
        }
        const now = this.clock.nowIso();
        const relId = this.idGen.generateId("rel");
        const relation = {
          id: relId,
          space_id: spaceId,
          source_post_id: req.source_ref.post_id,
          source_revision: req.source_ref.revision,
          target_post_id: req.target_ref.post_id,
          target_revision: req.target_ref.revision,
          type: req.type,
          state: req.type === "challenges" ? "open" : "resolved",
          version: 1,
          creator_id: auth.actor.id,
          created_at: now
        };
        tx.createRelation(relation);
        tx.appendEvent(spaceId, {
          id: this.idGen.generateId("evt"),
          space_id: spaceId,
          type: "relation.created",
          object_id: relId,
          revision: 1,
          visibility: "public",
          actor_id: auth.actor.id,
          created_at: now
        });
        return relation;
      }
    ).data;
  }
  resolveChallenge(auth, spaceId, relationId, req, requestKey) {
    const spaceAuth = this.authService.requireSpaceAccess(auth, spaceId, "contributor");
    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      "relation.resolve",
      requestKey,
      req,
      200,
      (tx) => {
        const relation = tx.findRelationById(relationId);
        if (!relation || relation.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, "\u5173\u7CFB\u4E0D\u5B58\u5728\u3002", 404);
        }
        if (relation.type !== "challenges") {
          throw new DetunedError(
            ErrorCode.VALIDATION_ERROR,
            "\u4EC5 challenges \u5F02\u8BAE\u5173\u7CFB\u53EF\u88AB resolve/reopen\u3002",
            422
          );
        }
        if (relation.state !== "open") {
          throw new DetunedError(
            ErrorCode.VALIDATION_ERROR,
            "\u8BE5\u5F02\u8BAE\u5DF2\u88AB\u89E3\u51B3\u3002",
            422
          );
        }
        if (relation.version !== req.expected_version) {
          throw new DetunedError(
            ErrorCode.REVISION_CONFLICT,
            "\u5173\u7CFB\u7248\u672C\u51B2\u7A81\uFF0C\u8BF7\u83B7\u53D6\u6700\u65B0\u72B6\u6001\u3002",
            409,
            false,
            { current_version: relation.version }
          );
        }
        const reasonPost = tx.findPostById(req.reason_ref.post_id);
        if (!reasonPost || reasonPost.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, "\u89E3\u51B3\u7406\u7531\u5E16\u5B50\u4E0D\u5B58\u5728\u3002", 404);
        }
        const reasonRev = tx.getPostRevision(req.reason_ref.post_id, req.reason_ref.revision);
        if (!reasonRev) {
          throw new DetunedError(ErrorCode.NOT_FOUND, "\u89E3\u51B3\u7406\u7531\u5E16\u5B50\u4FEE\u8BA2\u7248\u672C\u4E0D\u5B58\u5728\u3002", 404);
        }
        const isObjectionAuthor = relation.creator_id === auth.actor.id;
        const targetPost = tx.findPostById(relation.target_post_id);
        const isChallengedTargetAuthor = targetPost?.author_id === auth.actor.id;
        const isMaintainer = ["maintainer", "owner"].includes(spaceAuth.spaceRole);
        if (!isObjectionAuthor) {
          if (!isMaintainer || isChallengedTargetAuthor) {
            throw new DetunedError(
              ErrorCode.FORBIDDEN,
              "\u88AB\u6311\u6218\u6750\u6599\u4F5C\u8005\u4E0D\u80FD\u5355\u65B9\u9762\u5173\u95ED\u5F02\u8BAE\uFF1B\u9700\u8981\u539F\u5F02\u8BAE\u4F5C\u8005\u6216\u672A\u53C2\u4E0E\u8BE5\u6750\u6599\u7684\u7EF4\u62A4\u8005\u89E3\u51B3\u3002",
              403
            );
          }
        }
        const now = this.clock.nowIso();
        const nextVersion = relation.version + 1;
        const updatedRel = {
          ...relation,
          state: "resolved",
          version: nextVersion
        };
        tx.updateRelation(updatedRel);
        const resolution = {
          id: this.idGen.generateId("res"),
          relation_id: relationId,
          version: nextVersion,
          resolver_id: auth.actor.id,
          reason_ref: req.reason_ref,
          action: "resolve",
          created_at: now
        };
        tx.createRelationResolution(resolution);
        tx.appendEvent(spaceId, {
          id: this.idGen.generateId("evt"),
          space_id: spaceId,
          type: "relation.resolved",
          object_id: relationId,
          revision: nextVersion,
          visibility: "public",
          actor_id: auth.actor.id,
          created_at: now
        });
        return { relation: updatedRel, resolution };
      }
    ).data;
  }
  reopenChallenge(auth, spaceId, relationId, req, requestKey) {
    const spaceAuth = this.authService.requireSpaceAccess(auth, spaceId, "contributor");
    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      "relation.reopen",
      requestKey,
      req,
      200,
      (tx) => {
        const relation = tx.findRelationById(relationId);
        if (!relation || relation.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, "\u5173\u7CFB\u4E0D\u5B58\u5728\u3002", 404);
        }
        if (relation.type !== "challenges") {
          throw new DetunedError(
            ErrorCode.VALIDATION_ERROR,
            "\u4EC5 challenges \u5F02\u8BAE\u5173\u7CFB\u53EF\u88AB reopen\u3002",
            422
          );
        }
        if (relation.state !== "resolved") {
          throw new DetunedError(
            ErrorCode.VALIDATION_ERROR,
            "\u8BE5\u5F02\u8BAE\u5904\u4E8E\u5F00\u653E\u72B6\u6001\u3002",
            422
          );
        }
        if (relation.version !== req.expected_version) {
          throw new DetunedError(
            ErrorCode.REVISION_CONFLICT,
            "\u5173\u7CFB\u7248\u672C\u51B2\u7A81\uFF0C\u8BF7\u83B7\u53D6\u6700\u65B0\u72B6\u6001\u3002",
            409,
            false,
            { current_version: relation.version }
          );
        }
        const isObjectionAuthor = relation.creator_id === auth.actor.id;
        const isMaintainer = ["maintainer", "owner"].includes(spaceAuth.spaceRole);
        if (!isObjectionAuthor && !isMaintainer) {
          throw new DetunedError(
            ErrorCode.FORBIDDEN,
            "\u4EC5\u539F\u5F02\u8BAE\u4F5C\u8005\u6216\u7EF4\u62A4\u8005\u53EF\u4EE5\u91CD\u5F00\u5F02\u8BAE\u3002",
            403
          );
        }
        const now = this.clock.nowIso();
        const nextVersion = relation.version + 1;
        const updatedRel = {
          ...relation,
          state: "open",
          version: nextVersion
        };
        tx.updateRelation(updatedRel);
        const resolution = {
          id: this.idGen.generateId("res"),
          relation_id: relationId,
          version: nextVersion,
          resolver_id: auth.actor.id,
          reason_ref: req.reason_ref,
          action: "reopen",
          created_at: now
        };
        tx.createRelationResolution(resolution);
        tx.appendEvent(spaceId, {
          id: this.idGen.generateId("evt"),
          space_id: spaceId,
          type: "relation.reopened",
          object_id: relationId,
          revision: nextVersion,
          visibility: "public",
          actor_id: auth.actor.id,
          created_at: now
        });
        return { relation: updatedRel, resolution };
      }
    ).data;
  }
};

// legacy:packages/core/src/services/event-service.ts
var EventService = class {
  constructor(storage, idGen, clock, tokenSigner, authService, tokenSecret) {
    this.storage = storage;
    this.idGen = idGen;
    this.clock = clock;
    this.tokenSigner = tokenSigner;
    this.authService = authService;
    this.tokenSecret = tokenSecret;
  }
  storage;
  idGen;
  clock;
  tokenSigner;
  authService;
  tokenSecret;
  subscribe(auth, spaceId, req) {
    const spaceAuth = this.authService.requireSpaceAccess(auth, spaceId, "observer");
    const space = this.storage.findSpaceById(spaceId);
    let startSeq = 0;
    if (req.start === "now") {
      startSeq = this.storage.getLatestEventSeq(spaceId);
    } else if (req.start === "context_checkpoint" && req.checkpoint_token) {
      const verified = this.tokenSigner.verify(req.checkpoint_token, this.tokenSecret);
      if (!verified || verified["space_id"] !== spaceId || typeof verified["seq"] !== "number") {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "\u65E0\u6548\u6216\u8FC7\u671F\u7684 checkpoint_token\u3002",
          422
        );
      }
      startSeq = verified["seq"];
    }
    return this.storage.transaction((tx) => {
      function arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        const sortedA = [...a].sort();
        const sortedB = [...b].sort();
        return sortedA.every((v, i) => v === sortedB[i]);
      }
      const existingSubs = tx.listSubscriptionsByActorAndSpace(auth.actor.id, spaceId);
      const reqThreadIds = req.thread_ids ?? [];
      const reqEventTypes = req.event_types ?? [];
      let sub = existingSubs.find(
        (s) => arraysEqual(s.thread_ids, reqThreadIds) && arraysEqual(s.event_types, reqEventTypes)
      );
      if (!sub) {
        const subId = this.idGen.generateId("sub");
        sub = {
          id: subId,
          actor_id: auth.actor.id,
          space_id: spaceId,
          thread_ids: reqThreadIds,
          event_types: reqEventTypes,
          created_at: this.clock.nowIso()
        };
        tx.createSubscription(sub);
      }
      let consumer = tx.findConsumerByKey(sub.id, req.consumer_key);
      if (!consumer) {
        const consumerId = this.idGen.generateId("csr");
        consumer = {
          id: consumerId,
          subscription_id: sub.id,
          consumer_key: req.consumer_key,
          ack_seq: startSeq,
          version: 1,
          active_batch_id: null,
          acl_epoch: space.acl_epoch
        };
        tx.createConsumer(consumer);
      }
      return { subscription: sub, consumer };
    });
  }
  poll(auth, spaceId, consumerId, req) {
    this.authService.requireSpaceAccess(auth, spaceId, "observer");
    const space = this.storage.findSpaceById(spaceId);
    const consumer = this.storage.findConsumerById(consumerId);
    if (!consumer) {
      throw new DetunedError(ErrorCode.NOT_FOUND, "\u6D88\u8D39\u8005\u4E0D\u5B58\u5728\u3002", 404);
    }
    const sub = this.storage.findSubscriptionById(consumer.subscription_id);
    if (!sub || sub.actor_id !== auth.actor.id || sub.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.FORBIDDEN, "\u65E0\u6743\u8BBF\u95EE\u8BE5\u6D88\u8D39\u8005\u3002", 403);
    }
    if (consumer.acl_epoch < space.acl_epoch) {
      throw new DetunedError(
        ErrorCode.RESYNC_REQUIRED,
        "\u6210\u5458\u6743\u9650\u5DF2\u53D8\u66F4\uFF0C\u6D88\u8D39\u8005\u9700\u8981\u91CD\u65B0\u5EFA\u7ACB\u540C\u6B65\u6E38\u6807\u3002",
        409
      );
    }
    const limit = Math.min(Math.max(req.limit ?? 20, 1), 100);
    return this.storage.transaction((tx) => {
      if (consumer.active_batch_id) {
        const batch = tx.findDeliveryBatchById(consumer.active_batch_id);
        if (batch) {
          const events = [];
          for (const evId of batch.event_ids) {
            const ev = tx.findEventById(evId);
            if (ev) events.push(ev);
          }
          const nextCursor2 = this.tokenSigner.sign(
            {
              consumer_id: consumer.id,
              batch_id: batch.id,
              through_seq: batch.through_seq,
              exp: Math.floor(Date.now() / 1e3) + 86400
            },
            this.tokenSecret
          );
          return {
            batch_id: batch.id,
            events,
            next_cursor: nextCursor2,
            has_more: true
          };
        }
      }
      const rawEvents = tx.listEventsAfter(spaceId, consumer.ack_seq, 500);
      if (rawEvents.length === 0) {
        return {
          batch_id: null,
          events: [],
          next_cursor: null,
          has_more: false
        };
      }
      const matchedEvents = [];
      let throughSeq = consumer.ack_seq;
      for (const ev of rawEvents) {
        throughSeq = Math.max(throughSeq, ev.seq);
        if (sub.event_types.length > 0 && !sub.event_types.includes(ev.type)) {
          continue;
        }
        if (sub.thread_ids.length > 0) {
          if (ev.type.startsWith("thread.")) {
            if (!sub.thread_ids.includes(ev.object_id)) {
              continue;
            }
          } else if (ev.type.startsWith("post.")) {
            const post = tx.findPostById(ev.object_id);
            if (!post || !sub.thread_ids.includes(post.thread_id)) {
              continue;
            }
          } else {
            continue;
          }
        }
        matchedEvents.push(ev);
        if (matchedEvents.length >= limit) {
          break;
        }
      }
      const batchId = this.idGen.generateId("bat");
      const batchRecord = {
        id: batchId,
        consumer_id: consumer.id,
        from_seq: consumer.ack_seq,
        through_seq: throughSeq,
        event_ids: matchedEvents.map((e) => e.id),
        acked_at: null,
        created_at: this.clock.nowIso()
      };
      tx.createDeliveryBatch(batchRecord);
      tx.updateConsumerBatch(consumer.id, batchId, consumer.version + 1);
      const nextCursor = this.tokenSigner.sign(
        {
          consumer_id: consumer.id,
          batch_id: batchId,
          through_seq: throughSeq,
          exp: Math.floor(Date.now() / 1e3) + 86400
        },
        this.tokenSecret
      );
      const hasMore = throughSeq < tx.getLatestEventSeq(spaceId);
      return {
        batch_id: batchId,
        events: matchedEvents,
        next_cursor: nextCursor,
        has_more: hasMore
      };
    });
  }
  ack(auth, spaceId, consumerId, req) {
    this.authService.requireSpaceAccess(auth, spaceId, "observer");
    const consumer = this.storage.findConsumerById(consumerId);
    if (!consumer) {
      throw new DetunedError(ErrorCode.NOT_FOUND, "\u6D88\u8D39\u8005\u4E0D\u5B58\u5728\u3002", 404);
    }
    const sub = this.storage.findSubscriptionById(consumer.subscription_id);
    if (!sub || sub.actor_id !== auth.actor.id || sub.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.FORBIDDEN, "\u65E0\u6743\u8BBF\u95EE\u8BE5\u6D88\u8D39\u8005\u3002", 403);
    }
    const verified = this.tokenSigner.verify(req.next_cursor, this.tokenSecret);
    if (!verified || verified["consumer_id"] !== consumerId || verified["batch_id"] !== req.batch_id || typeof verified["through_seq"] !== "number") {
      throw new DetunedError(
        ErrorCode.ACK_INVALID,
        "\u65E0\u6548\u7684\u786E\u8BA4\u6E38\u6807\u6216\u6279\u6B21 ID\u3002",
        409
      );
    }
    const throughSeq = verified["through_seq"];
    return this.storage.transaction((tx) => {
      const batch = tx.findDeliveryBatchById(req.batch_id);
      if (!batch || batch.consumer_id !== consumer.id) {
        throw new DetunedError(ErrorCode.ACK_INVALID, "\u6279\u6B21\u4E0D\u5B58\u5728\u6216\u4E0D\u5C5E\u4E8E\u8BE5\u6D88\u8D39\u8005\u3002", 409);
      }
      if (batch.acked_at && consumer.ack_seq >= throughSeq) {
        return {
          confirmed: true,
          acknowledged_batch_id: req.batch_id
        };
      }
      if (consumer.active_batch_id !== req.batch_id) {
        throw new DetunedError(
          ErrorCode.ACK_INVALID,
          "\u5F53\u524D\u6D3B\u8DC3\u6279\u6B21\u4E0E\u786E\u8BA4\u6279\u6B21\u4E0D\u4E00\u81F4\u3002",
          409
        );
      }
      if (throughSeq !== batch.through_seq) {
        throw new DetunedError(
          ErrorCode.ACK_INVALID,
          "\u786E\u8BA4\u6E38\u6807\u4E2D\u7684\u5E8F\u5217\u53F7\u4E0E\u6279\u6B21\u5B9E\u9645\u6301\u4E45\u5E8F\u5217\u53F7\u4E0D\u5339\u914D\u3002",
          409
        );
      }
      const latestSeq = tx.getLatestEventSeq(spaceId);
      if (throughSeq > latestSeq) {
        throw new DetunedError(
          ErrorCode.ACK_INVALID,
          "\u786E\u8BA4\u6E38\u6807\u5E8F\u5217\u53F7\u8D85\u51FA\u5F53\u524D\u5DF2\u6301\u4E45\u4E8B\u4EF6\u6700\u5927\u5E8F\u5217\u53F7\u3002",
          409
        );
      }
      const now = this.clock.nowIso();
      tx.ackDeliveryBatch(req.batch_id, now);
      tx.updateConsumerAck(consumer.id, throughSeq, consumer.version + 1);
      tx.updateConsumerBatch(consumer.id, null, consumer.version + 2);
      return {
        confirmed: true,
        acknowledged_batch_id: req.batch_id
      };
    });
  }
  deactivateConsumer(auth, spaceId, consumerId) {
    this.authService.requireSpaceAccess(auth, spaceId, "observer");
    const consumer = this.storage.findConsumerById(consumerId);
    if (!consumer) {
      return;
    }
    const sub = this.storage.findSubscriptionById(consumer.subscription_id);
    if (!sub || sub.actor_id !== auth.actor.id) {
      throw new DetunedError(ErrorCode.FORBIDDEN, "\u65E0\u6743\u505C\u7528\u8BE5\u6D88\u8D39\u8005\u3002", 403);
    }
    this.storage.deactivateConsumer(consumerId);
  }
};

// legacy:packages/core/src/services/context-service.ts
var ContextService = class {
  constructor(storage, tokenSigner, authService, tokenSecret) {
    this.storage = storage;
    this.tokenSigner = tokenSigner;
    this.authService = authService;
    this.tokenSecret = tokenSecret;
  }
  storage;
  tokenSigner;
  authService;
  tokenSecret;
  getContext(auth, spaceId, query) {
    this.authService.requireSpaceAccess(auth, spaceId, "observer");
    const space = this.storage.findSpaceById(spaceId);
    if (!space) {
      throw new DetunedError(ErrorCode.NOT_FOUND, "\u7A7A\u95F4\u4E0D\u5B58\u5728\u3002", 404);
    }
    const spaceRev = this.storage.getSpaceRevision(spaceId, space.current_revision);
    if (!spaceRev) {
      throw new DetunedError(ErrorCode.NOT_FOUND, "\u7A7A\u95F4\u89C4\u5219\u4FEE\u8BA2\u4E0D\u5B58\u5728\u3002", 404);
    }
    const latestSeq = this.storage.getLatestEventSeq(spaceId);
    const checkpointToken = this.tokenSigner.sign(
      {
        space_id: spaceId,
        seq: latestSeq,
        exp: Math.floor(Date.now() / 1e3) + 86400
        // 24 hours
      },
      this.tokenSecret
    );
    const pinnedSummaries = [];
    for (const ref of spaceRev.pinned_refs) {
      const p = this.storage.findPostById(ref.post_id);
      if (p && p.space_id === spaceId && p.lifecycle === "active") {
        const rev = this.storage.getPostRevision(p.id, ref.revision);
        if (rev) {
          pinnedSummaries.push({
            ref: { post_id: p.id, revision: ref.revision },
            title: rev.title,
            summary: rev.summary,
            has_newer_revision: p.current_revision > ref.revision
          });
        }
      }
    }
    const openChallenges = this.storage.listOpenChallenges(spaceId);
    const blockingObjections = [];
    for (const rel of openChallenges.slice(0, 10)) {
      const srcRev = this.storage.getPostRevision(rel.source_post_id, rel.source_revision);
      blockingObjections.push({
        relation_id: rel.id,
        source_ref: { post_id: rel.source_post_id, revision: rel.source_revision },
        target_ref: { post_id: rel.target_post_id, revision: rel.target_revision },
        issue: srcRev?.structured?.issue ?? srcRev?.summary ?? "\u5B58\u5728\u672A\u89E3\u51B3\u5F02\u8BAE",
        impact: srcRev?.structured?.impact ?? "\u5F85\u590D\u67E5"
      });
    }
    const searchFailures = this.storage.searchPosts(spaceId, "", { kind: "failure" }, 5);
    const recentFailures = [];
    for (const item of searchFailures.items) {
      const post = this.storage.findPostById(item.post_id);
      if (post && post.lifecycle === "active") {
        const rev = this.storage.getPostRevision(post.id, post.current_revision);
        if (rev) {
          const struct = rev.structured;
          recentFailures.push({
            ref: { post_id: post.id, revision: post.current_revision },
            title: rev.title,
            category: struct?.category ?? "counterexample",
            attempt: struct?.attempt ?? rev.summary,
            tested_scope: struct?.tested_scope ?? "",
            evidence_state: struct?.evidence_state ?? "provided"
          });
        }
      }
    }
    const recentEvents = this.storage.listEventsAfter(
      spaceId,
      Math.max(0, latestSeq - 5),
      5
    );
    const recentActivity = recentEvents.map((e) => ({
      type: e.type,
      object_id: e.object_id,
      occurred_at: e.created_at
    }));
    const result = {
      space_id: space.id,
      slug: space.slug,
      objective: spaceRev.objective,
      rules: spaceRev.rules,
      policy_revision: space.policy_revision,
      pinned_summaries: pinnedSummaries,
      blocking_objections: blockingObjections,
      recent_failures: recentFailures,
      recent_activity: recentActivity,
      checkpoint_token: checkpointToken
    };
    const maxBytes = query.max_bytes ?? 12288;
    const jsonBytes = Buffer.byteLength(JSON.stringify(result), "utf8");
    const truncated = jsonBytes > maxBytes;
    if (truncated) {
      result.recent_activity = [];
      result.recent_failures = result.recent_failures.slice(0, 2);
    }
    return { data: result, truncated };
  }
};

// legacy:packages/core/src/services/search-service.ts
var SearchService = class {
  constructor(storage, authService) {
    this.storage = storage;
    this.authService = authService;
  }
  storage;
  authService;
  search(auth, spaceId, query) {
    this.authService.requireSpaceAccess(auth, spaceId, "observer");
    const q = query.q.trim();
    if (q.length === 0 || q.length > 256) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        "\u641C\u7D22\u67E5\u8BE2\u5B57\u7B26\u4E32\u957F\u5EA6\u987B\u5728 1 \u5230 256 \u5B57\u7B26\u4E4B\u95F4\u3002",
        400
      );
    }
    const filters = {
      kind: query.kind,
      tags: query.tags,
      thread_id: query.thread_id
    };
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    return this.storage.searchPosts(spaceId, q, filters, limit, query.cursor);
  }
  getView(auth, spaceId, name) {
    this.authService.requireSpaceAccess(auth, spaceId, "observer");
    if (name === "failures") {
      const result = this.storage.searchPosts(spaceId, "", { kind: "failure" }, 50);
      return { view: "failures", items: result.items };
    } else if (name === "findings") {
      const proposals = this.storage.searchPosts(spaceId, "", { kind: "proposal" }, 25);
      const claims = this.storage.searchPosts(spaceId, "", { kind: "claim" }, 25);
      return { view: "findings", items: [...proposals.items, ...claims.items] };
    } else if (name === "open-questions") {
      const questions = this.storage.searchPosts(spaceId, "", { kind: "question" }, 25);
      const openChallenges = this.storage.listOpenChallenges(spaceId);
      return {
        view: "open-questions",
        items: [
          ...questions.items,
          ...openChallenges.map((c) => ({
            type: "open_challenge",
            relation_id: c.id,
            source_ref: { post_id: c.source_post_id, revision: c.source_revision },
            target_ref: { post_id: c.target_post_id, revision: c.target_revision }
          }))
        ]
      };
    }
    throw new DetunedError(ErrorCode.NOT_FOUND, `\u672A\u77E5\u89C6\u56FE ${name}`, 404);
  }
};

// legacy:packages/server/src/routes/meta.ts
var metaRoutes = async (app) => {
  app.get("/capabilities", async (req) => {
    return {
      api_version: "1",
      request_id: req.id,
      data: {
        server_version: "0.1.0",
        api_version: "1",
        modules_enabled: ["core", "fts5", "sqlite-wal"],
        limits: {
          max_body_bytes: 65536,
          max_json_bytes: 262144,
          max_artifact_bytes: 26214400,
          max_poll_wait_ms: 25e3,
          max_search_query_chars: 256
        }
      }
    };
  });
  app.get("/me", async (req) => {
    const auth = req.auth;
    const storage = app.storage;
    const visibleSpaces = storage.listVisibleSpaces(
      auth.actor.id,
      100,
      void 0,
      auth.credential.allowed_space_ids
    );
    return {
      api_version: "1",
      request_id: req.id,
      data: {
        actor: auth.actor,
        capabilities: auth.credential.capabilities,
        allowed_space_ids: auth.credential.allowed_space_ids,
        visible_spaces: visibleSpaces.spaces.map((s) => ({
          id: s.id,
          slug: s.slug,
          role: storage.getMembership(s.id, auth.actor.id)?.role ?? "none"
        }))
      }
    };
  });
};

// legacy:packages/server/src/routes/spaces.ts
var spaceRoutes = async (app) => {
  const spaceService = app.spaceService;
  const contextService = app.contextService;
  const storage = app.storage;
  app.get("/spaces", async (req) => {
    const auth = req.auth;
    const query = req.query;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const result = storage.listVisibleSpaces(
      auth.actor.id,
      limit,
      query.cursor,
      auth.credential.allowed_space_ids
    );
    return {
      api_version: "1",
      request_id: req.id,
      data: result.spaces,
      meta: {
        truncated: false,
        next_cursor: result.next_cursor
      }
    };
  });
  app.post(
    "/spaces",
    { schema: { body: CreateSpaceRequestSchema } },
    async (req, reply) => {
      const auth = req.auth;
      const key = req.headers["idempotency-key"] ?? req.body?.request_key;
      if (!key || typeof key !== "string" || key.trim() === "") {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "\u7F3A\u5C11\u5FC5\u9700\u7684 Idempotency-Key \u8BF7\u6C42\u5934\u3002",
          400
        );
      }
      const body = req.body;
      const result = spaceService.createSpace(auth, body, key);
      reply.status(201);
      return {
        api_version: "1",
        request_id: req.id,
        data: result
      };
    }
  );
  app.patch(
    "/spaces/:space_id",
    { schema: { body: PatchSpaceRequestSchema } },
    async (req) => {
      const auth = req.auth;
      const { space_id } = req.params;
      const key = req.headers["idempotency-key"] ?? req.body?.request_key;
      if (!key || typeof key !== "string" || key.trim() === "") {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "\u7F3A\u5C11\u5FC5\u9700\u7684 Idempotency-Key \u8BF7\u6C42\u5934\u3002",
          400
        );
      }
      const body = req.body;
      const result = spaceService.patchSpace(auth, space_id, body, key);
      return {
        api_version: "1",
        request_id: req.id,
        data: result
      };
    }
  );
  app.post("/spaces/:space_id/sessions", async (req, reply) => {
    const auth = req.auth;
    const { space_id } = req.params;
    const body = req.body;
    const session = spaceService.createSession(auth, space_id, body);
    reply.status(201);
    return {
      api_version: "1",
      request_id: req.id,
      data: session
    };
  });
  app.get("/spaces/:space_id/context", async (req) => {
    const auth = req.auth;
    const { space_id } = req.params;
    const query = req.query;
    const maxBytes = query.max_bytes ? parseInt(query.max_bytes, 10) : 12288;
    const { data, truncated } = contextService.getContext(auth, space_id, {
      max_bytes: maxBytes,
      focus_thread_id: query.focus_thread_id
    });
    return {
      api_version: "1",
      request_id: req.id,
      data,
      meta: {
        truncated,
        next_cursor: null
      }
    };
  });
};

// legacy:packages/server/src/routes/threads.ts
var threadRoutes = async (app) => {
  const threadService = app.threadService;
  const authService = app.authService;
  const storage = app.storage;
  app.get("/spaces/:space_id/threads", async (req) => {
    const auth = req.auth;
    const { space_id } = req.params;
    authService.requireSpaceAccess(auth, space_id, "observer");
    const query = req.query;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const result = storage.listThreads(space_id, query.state, limit, query.cursor);
    return {
      api_version: "1",
      request_id: req.id,
      data: result.threads,
      meta: {
        truncated: false,
        next_cursor: result.next_cursor
      }
    };
  });
  app.post(
    "/spaces/:space_id/threads",
    { schema: { body: CreateThreadRequestSchema } },
    async (req, reply) => {
      const auth = req.auth;
      const { space_id } = req.params;
      const key = req.headers["idempotency-key"] ?? req.body?.request_key;
      if (!key || typeof key !== "string" || key.trim() === "") {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "\u7F3A\u5C11\u5FC5\u9700\u7684 Idempotency-Key \u8BF7\u6C42\u5934\u3002",
          400
        );
      }
      const body = req.body;
      const result = threadService.createThread(auth, space_id, body, key);
      reply.status(201);
      return {
        api_version: "1",
        request_id: req.id,
        data: result
      };
    }
  );
  app.get("/spaces/:space_id/threads/:id", async (req) => {
    const auth = req.auth;
    const { space_id, id } = req.params;
    authService.requireSpaceAccess(auth, space_id, "observer");
    const thread = storage.findThreadById(id);
    if (!thread || thread.space_id !== space_id) {
      throw new DetunedError(ErrorCode.NOT_FOUND, "\u4E3B\u9898\u4E0D\u5B58\u5728\u3002", 404);
    }
    const query = req.query;
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const postsResult = storage.listPostsInThread(id, limit, query.cursor);
    return {
      api_version: "1",
      request_id: req.id,
      data: {
        thread,
        posts: postsResult.posts
      },
      meta: {
        truncated: false,
        next_cursor: postsResult.next_cursor
      }
    };
  });
  app.patch(
    "/spaces/:space_id/threads/:id",
    { schema: { body: PatchThreadRequestSchema } },
    async (req) => {
      const auth = req.auth;
      const { space_id, id } = req.params;
      const key = req.headers["idempotency-key"] ?? req.body?.request_key;
      if (!key || typeof key !== "string" || key.trim() === "") {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "\u7F3A\u5C11\u5FC5\u9700\u7684 Idempotency-Key \u8BF7\u6C42\u5934\u3002",
          400
        );
      }
      const body = req.body;
      const updated = threadService.patchThread(auth, space_id, id, body, key);
      return {
        api_version: "1",
        request_id: req.id,
        data: updated
      };
    }
  );
};

// legacy:packages/server/src/routes/posts.ts
var postRoutes = async (app) => {
  const postService = app.postService;
  const authService = app.authService;
  const storage = app.storage;
  app.post(
    "/spaces/:space_id/threads/:id/posts",
    { schema: { body: CreatePostRequestSchema } },
    async (req, reply) => {
      const auth = req.auth;
      const { space_id, id } = req.params;
      const key = req.headers["idempotency-key"] ?? req.body?.request_key;
      if (!key || typeof key !== "string" || key.trim() === "") {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "\u7F3A\u5C11\u5FC5\u9700\u7684 Idempotency-Key \u8BF7\u6C42\u5934\u3002",
          400
        );
      }
      const body = req.body;
      const result = postService.createPost(auth, space_id, id, body, key);
      reply.status(201);
      return {
        api_version: "1",
        request_id: req.id,
        data: result
      };
    }
  );
  app.get("/spaces/:space_id/posts/:id", async (req) => {
    const auth = req.auth;
    const { space_id, id } = req.params;
    const query = req.query;
    const rev = query.revision ? parseInt(query.revision, 10) : void 0;
    const result = postService.getPost(auth, space_id, id, rev);
    return {
      api_version: "1",
      request_id: req.id,
      data: result
    };
  });
  app.get("/spaces/:space_id/posts/:id/revisions", async (req) => {
    const auth = req.auth;
    const { space_id, id } = req.params;
    authService.requireSpaceAccess(auth, space_id, "observer");
    const post = storage.findPostById(id);
    if (!post || post.space_id !== space_id) {
      throw new DetunedError(ErrorCode.NOT_FOUND, "\u5E16\u5B50\u4E0D\u5B58\u5728\u3002", 404);
    }
    const query = req.query;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const result = storage.listPostRevisions(id, limit, query.cursor);
    return {
      api_version: "1",
      request_id: req.id,
      data: result.revisions,
      meta: {
        truncated: false,
        next_cursor: result.next_cursor
      }
    };
  });
  app.post(
    "/spaces/:space_id/posts/:id/revisions",
    { schema: { body: CreatePostRevisionRequestSchema } },
    async (req, reply) => {
      const auth = req.auth;
      const { space_id, id } = req.params;
      const key = req.headers["idempotency-key"] ?? req.body?.request_key;
      if (!key || typeof key !== "string" || key.trim() === "") {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "\u7F3A\u5C11\u5FC5\u9700\u7684 Idempotency-Key \u8BF7\u6C42\u5934\u3002",
          400
        );
      }
      const body = req.body;
      const result = postService.createRevision(auth, space_id, id, body, key);
      reply.status(201);
      return {
        api_version: "1",
        request_id: req.id,
        data: result
      };
    }
  );
  app.post(
    "/spaces/:space_id/posts/:id/withdraw",
    { schema: { body: WithdrawPostRequestSchema } },
    async (req) => {
      const auth = req.auth;
      const { space_id, id } = req.params;
      const key = req.headers["idempotency-key"] ?? req.body?.request_key;
      if (!key || typeof key !== "string" || key.trim() === "") {
        throw new DetunedError(
          ErrorCode.VALIDATION_ERROR,
          "\u7F3A\u5C11\u5FC5\u9700\u7684 Idempotency-Key \u8BF7\u6C42\u5934\u3002",
          400
        );
      }
      const body = req.body;
      const post = postService.withdrawPost(auth, space_id, id, body, key);
      return {
        api_version: "1",
        request_id: req.id,
        data: post
      };
    }
  );
};

// legacy:packages/server/src/routes/relations.ts
var relationRoutes = async (app) => {
  const relationService = app.relationService;
  app.post("/spaces/:space_id/relations", async (req, reply) => {
    const auth = req.auth;
    const { space_id } = req.params;
    const key = req.headers["idempotency-key"] ?? req.body?.request_key;
    if (!key || typeof key !== "string" || key.trim() === "") {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        "\u7F3A\u5C11\u5FC5\u9700\u7684 Idempotency-Key \u8BF7\u6C42\u5934\u3002",
        400
      );
    }
    const body = req.body;
    const relation = relationService.createRelation(auth, space_id, body, key);
    reply.status(201);
    return {
      api_version: "1",
      request_id: req.id,
      data: relation
    };
  });
  app.post("/spaces/:space_id/relations/:id/resolve", async (req) => {
    const auth = req.auth;
    const { space_id, id } = req.params;
    const key = req.headers["idempotency-key"] ?? req.body?.request_key;
    if (!key || typeof key !== "string" || key.trim() === "") {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        "\u7F3A\u5C11\u5FC5\u9700\u7684 Idempotency-Key \u8BF7\u6C42\u5934\u3002",
        400
      );
    }
    const body = req.body;
    const result = relationService.resolveChallenge(auth, space_id, id, body, key);
    return {
      api_version: "1",
      request_id: req.id,
      data: result
    };
  });
  app.post("/spaces/:space_id/relations/:id/reopen", async (req) => {
    const auth = req.auth;
    const { space_id, id } = req.params;
    const key = req.headers["idempotency-key"] ?? req.body?.request_key;
    if (!key || typeof key !== "string" || key.trim() === "") {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        "\u7F3A\u5C11\u5FC5\u9700\u7684 Idempotency-Key \u8BF7\u6C42\u5934\u3002",
        400
      );
    }
    const body = req.body;
    const result = relationService.reopenChallenge(auth, space_id, id, body, key);
    return {
      api_version: "1",
      request_id: req.id,
      data: result
    };
  });
};

// legacy:packages/server/src/routes/events.ts
var eventRoutes = async (app) => {
  const eventService = app.eventService;
  app.post("/spaces/:space_id/subscriptions", async (req, reply) => {
    const auth = req.auth;
    const { space_id } = req.params;
    const body = req.body;
    const result = eventService.subscribe(auth, space_id, body);
    reply.status(201);
    return {
      api_version: "1",
      request_id: req.id,
      data: result
    };
  });
  app.post("/spaces/:space_id/consumers/:id/poll", async (req) => {
    const auth = req.auth;
    const { space_id, id } = req.params;
    const body = req.body ?? {};
    const result = eventService.poll(auth, space_id, id, body);
    return {
      api_version: "1",
      request_id: req.id,
      data: result
    };
  });
  app.post("/spaces/:space_id/consumers/:id/ack", async (req) => {
    const auth = req.auth;
    const { space_id, id } = req.params;
    const body = req.body;
    const result = eventService.ack(auth, space_id, id, body);
    return {
      api_version: "1",
      request_id: req.id,
      data: result
    };
  });
  app.delete("/spaces/:space_id/consumers/:id", async (req) => {
    const auth = req.auth;
    const { space_id, id } = req.params;
    eventService.deactivateConsumer(auth, space_id, id);
    return {
      api_version: "1",
      request_id: req.id,
      data: { deactivated: true }
    };
  });
};

// legacy:packages/server/src/routes/search.ts
var searchRoutes = async (app) => {
  const searchService = app.searchService;
  app.get("/spaces/:space_id/search", async (req) => {
    const auth = req.auth;
    const { space_id } = req.params;
    const query = req.query;
    if (!query.q) {
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, "\u7F3A\u5C11\u641C\u7D22\u67E5\u8BE2\u53C2\u6570 q\u3002", 400);
    }
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const tags = query.tags ? query.tags.split(",") : void 0;
    const result = searchService.search(auth, space_id, {
      q: query.q,
      kind: query.kind,
      tags,
      thread_id: query.thread_id,
      limit,
      cursor: query.cursor
    });
    return {
      api_version: "1",
      request_id: req.id,
      data: result.items,
      meta: {
        truncated: false,
        next_cursor: result.next_cursor
      }
    };
  });
  app.get("/spaces/:space_id/views/:name", async (req) => {
    const auth = req.auth;
    const { space_id, name } = req.params;
    const result = searchService.getView(auth, space_id, name);
    return {
      api_version: "1",
      request_id: req.id,
      data: result.items
    };
  });
};

// legacy:packages/server/src/routes/admin.ts
import { randomBytes, createHash as createHash2 } from "node:crypto";
var adminRoutes = async (app) => {
  const authService = app.authService;
  const storage = app.storage;
  const idGen = app.idGen;
  const clock = app.clock;
  app.post("/admin/actors", async (req, reply) => {
    const auth = req.auth;
    authService.requireInstanceAdmin(auth);
    const body = req.body;
    if (!body.kind || !body.display_name) {
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, "\u7F3A\u5C11 kind \u6216 display_name\u3002", 400);
    }
    const actorId = idGen.generateId("act");
    const now = clock.nowIso();
    const actor = {
      id: actorId,
      kind: body.kind,
      display_name: body.display_name,
      created_at: now,
      disabled_at: null
    };
    storage.createActor(actor);
    reply.status(201);
    return {
      api_version: "1",
      request_id: req.id,
      data: actor
    };
  });
  app.post("/admin/credentials", async (req, reply) => {
    const auth = req.auth;
    authService.requireInstanceAdmin(auth);
    const body = req.body;
    if (!body.actor_id) {
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, "\u7F3A\u5C11 actor_id\u3002", 400);
    }
    const actor = storage.findActorById(body.actor_id);
    if (!actor) {
      throw new DetunedError(ErrorCode.NOT_FOUND, "Actor \u4E0D\u5B58\u5728\u3002", 404);
    }
    const rawToken = `detuned_tok_${randomBytes(24).toString("hex")}`;
    const tokenHash = createHash2("sha256").update(rawToken).digest("hex");
    const credId = idGen.generateId("crd");
    const now = clock.nowIso();
    const credential = {
      id: credId,
      actor_id: body.actor_id,
      token_hash: tokenHash,
      allowed_space_ids: body.allowed_space_ids ?? ["*"],
      capabilities: body.capabilities ?? ["read", "write"],
      expires_at: body.expires_at ?? null,
      revoked_at: null,
      created_at: now
    };
    storage.createCredential(credential);
    reply.status(201);
    return {
      api_version: "1",
      request_id: req.id,
      data: {
        credential_id: credId,
        actor_id: body.actor_id,
        token: rawToken
        // Returned only once at creation!
      }
    };
  });
  const validRoles = ["observer", "contributor", "maintainer", "owner"];
  app.post("/spaces/:space_id/memberships", async (req, reply) => {
    const auth = req.auth;
    const { space_id } = req.params;
    authService.requireSpaceAccess(auth, space_id, "owner");
    const body = req.body;
    if (!body.actor_id || !body.role || !validRoles.includes(body.role)) {
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, "\u7F3A\u5C11 actor_id \u6216 role \u975E\u6CD5\u3002", 400);
    }
    const membership = {
      space_id,
      actor_id: body.actor_id,
      role: body.role,
      active: true,
      reviewer_eligible: body.reviewer_eligible ?? true,
      independence_group: body.independence_group ?? null
    };
    storage.upsertMembership(membership);
    reply.status(201);
    return {
      api_version: "1",
      request_id: req.id,
      data: membership
    };
  });
  app.patch("/spaces/:space_id/memberships/:actor_id", async (req) => {
    const auth = req.auth;
    const { space_id, actor_id } = req.params;
    authService.requireSpaceAccess(auth, space_id, "owner");
    const existing = storage.getMembership(space_id, actor_id);
    if (!existing) {
      throw new DetunedError(ErrorCode.NOT_FOUND, "\u6210\u5458\u5173\u7CFB\u4E0D\u5B58\u5728\u3002", 404);
    }
    const body = req.body;
    if (body.role && !validRoles.includes(body.role)) {
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, "\u975E\u6CD5\u7684 role\u3002", 400);
    }
    const updated = {
      space_id,
      actor_id,
      role: body.role ?? existing.role,
      active: body.active !== void 0 ? body.active : existing.active,
      reviewer_eligible: body.reviewer_eligible !== void 0 ? body.reviewer_eligible : existing.reviewer_eligible,
      independence_group: body.independence_group !== void 0 ? body.independence_group : existing.independence_group
    };
    storage.upsertMembership(updated);
    return {
      api_version: "1",
      request_id: req.id,
      data: updated
    };
  });
  app.delete("/spaces/:space_id/memberships/:actor_id", async (req) => {
    const auth = req.auth;
    const { space_id, actor_id } = req.params;
    authService.requireSpaceAccess(auth, space_id, "owner");
    const existing = storage.getMembership(space_id, actor_id);
    if (!existing) {
      throw new DetunedError(ErrorCode.NOT_FOUND, "\u6210\u5458\u5173\u7CFB\u4E0D\u5B58\u5728\u3002", 404);
    }
    storage.upsertMembership({
      ...existing,
      active: false
    });
    return {
      api_version: "1",
      request_id: req.id,
      data: { deactivated: true }
    };
  });
  app.post("/admin/credentials/:id/revoke", async (req) => {
    const auth = req.auth;
    authService.requireInstanceAdmin(auth);
    const { id } = req.params;
    const cred = storage.findCredentialById(id);
    if (!cred) {
      throw new DetunedError(ErrorCode.NOT_FOUND, "\u51ED\u636E\u4E0D\u5B58\u5728\u3002", 404);
    }
    storage.revokeCredential(id, clock.nowIso());
    return {
      api_version: "1",
      request_id: req.id,
      data: { revoked: true }
    };
  });
  app.post("/spaces/:space_id/redactions", async (req, reply) => {
    const auth = req.auth;
    const { space_id } = req.params;
    authService.requireSpaceAccess(auth, space_id, "owner");
    const key = req.headers["idempotency-key"] ?? req.body?.request_key;
    if (!key || typeof key !== "string" || key.trim() === "") {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        "\u7F3A\u5C11\u5FC5\u9700\u7684 Idempotency-Key \u8BF7\u6C42\u5934\u3002",
        400
      );
    }
    const body = req.body;
    if (!body.target_type || !body.target_id || !body.reason) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        "\u7F3A\u5C11 target_type, target_id \u6216 reason\u3002",
        400
      );
    }
    if (body.target_type === "post") {
      const post = storage.findPostById(body.target_id);
      if (!post || post.space_id !== space_id) {
        throw new DetunedError(ErrorCode.NOT_FOUND, "\u76EE\u6807\u5E16\u5B50\u4E0D\u5B58\u5728\u6216\u4E0D\u5C5E\u4E8E\u8BE5\u7A7A\u95F4\u3002", 404);
      }
    } else if (body.target_type === "artifact") {
      const artifact = storage.findArtifactById(body.target_id);
      if (!artifact || artifact.space_id !== space_id) {
        throw new DetunedError(ErrorCode.NOT_FOUND, "\u76EE\u6807\u9644\u4EF6\u4E0D\u5B58\u5728\u6216\u4E0D\u5C5E\u4E8E\u8BE5\u7A7A\u95F4\u3002", 404);
      }
    } else {
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, "\u975E\u6CD5\u7684 target_type\u3002", 400);
    }
    const redactionId = idGen.generateId("red");
    const now = clock.nowIso();
    storage.createRedaction({
      id: redactionId,
      space_id,
      target_type: body.target_type,
      target_id: body.target_id,
      affected_revisions: [1],
      operator_id: auth.actor.id,
      reason: body.reason,
      created_at: now
    });
    reply.status(201);
    return {
      api_version: "1",
      request_id: req.id,
      data: { redaction_id: redactionId }
    };
  });
};

// legacy:packages/server/src/app.ts
function buildApp(options) {
  const clock = options.clock ?? new SystemClock();
  const idGen = options.idGen ?? new CryptoIdGenerator();
  const hasher = options.hasher ?? new CryptoHasher();
  const tokenSigner = options.tokenSigner ?? new HmacTokenSigner();
  const tokenSecret = options.tokenSecret ?? "detuned-dev-secret-key-min-32-bytes-long!";
  const authService = new AuthService(options.storage, hasher, clock);
  const idempotency = new IdempotencyService(options.storage, hasher, clock);
  const spaceService = new SpaceService(options.storage, idGen, clock, authService, idempotency);
  const threadService = new ThreadService(options.storage, idGen, clock, hasher, authService, idempotency);
  const postService = new PostService(options.storage, idGen, clock, hasher, authService, idempotency);
  const relationService = new RelationService(options.storage, idGen, clock, authService, idempotency);
  const eventService = new EventService(options.storage, idGen, clock, tokenSigner, authService, tokenSecret);
  const contextService = new ContextService(options.storage, tokenSigner, authService, tokenSecret);
  const searchService = new SearchService(options.storage, authService);
  const app = Fastify({
    logger: false,
    ajv: {
      customOptions: {
        removeAdditional: false,
        useDefaults: true,
        coerceTypes: false,
        allErrors: true
      }
    }
  });
  app.storage = options.storage;
  app.clock = clock;
  app.idGen = idGen;
  app.hasher = hasher;
  app.tokenSigner = tokenSigner;
  app.tokenSecret = tokenSecret;
  app.authService = authService;
  app.spaceService = spaceService;
  app.threadService = threadService;
  app.postService = postService;
  app.relationService = relationService;
  app.eventService = eventService;
  app.contextService = contextService;
  app.searchService = searchService;
  app.register(cors);
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof DetunedError) {
      reply.status(error.statusCode).send({
        api_version: "1",
        request_id: req.id,
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          details: error.details
        }
      });
      return;
    }
    const anyErr = error;
    if (anyErr?.validation) {
      reply.status(400).send({
        api_version: "1",
        request_id: req.id,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: anyErr.message ?? "\u8BF7\u6C42\u9A8C\u8BC1\u9519\u8BEF\u3002",
          retryable: false,
          details: { issues: anyErr.validation }
        }
      });
      return;
    }
    reply.status(500).send({
      api_version: "1",
      request_id: req.id,
      error: {
        code: ErrorCode.TEMPORARILY_UNAVAILABLE,
        message: "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF\u3002",
        retryable: true
      }
    });
  });
  app.addHook("preHandler", async (req) => {
    if (req.url.endsWith("/capabilities")) {
      return;
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new DetunedError(
        ErrorCode.UNAUTHENTICATED,
        "\u7F3A\u5C11\u6216\u65E0\u6548\u7684 Authorization Bearer Token\u3002",
        401
      );
    }
    const token = authHeader.substring(7);
    const auth = authService.authenticateToken(token);
    req.auth = auth;
  });
  app.register(
    async (v1) => {
      v1.register(metaRoutes);
      v1.register(spaceRoutes);
      v1.register(threadRoutes);
      v1.register(postRoutes);
      v1.register(relationRoutes);
      v1.register(eventRoutes);
      v1.register(searchRoutes);
      v1.register(adminRoutes);
    },
    { prefix: "/api/v1" }
  );
  return app;
}

// legacy:packages/storage-sqlite/src/sqlite-storage.ts
var SqliteStorage = class {
  constructor(db) {
    this.db = db;
    this.initPragmas();
  }
  db;
  inTransaction = false;
  initPragmas() {
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = FULL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
  }
  transaction(fn) {
    if (this.inTransaction) {
      return fn(this);
    }
    const run = this.db.transaction(() => {
      this.inTransaction = true;
      try {
        return fn(this);
      } finally {
        this.inTransaction = false;
      }
    });
    return run.immediate();
  }
  // Actors
  findActorById(id) {
    const row = this.db.prepare("SELECT * FROM actors WHERE id = ?").get(id);
    if (!row) return null;
    return {
      id: row.id,
      kind: row.kind,
      display_name: row.display_name,
      created_at: row.created_at,
      disabled_at: row.disabled_at ?? null
    };
  }
  createActor(actor) {
    this.db.prepare(
      "INSERT INTO actors (id, kind, display_name, created_at, disabled_at) VALUES (?, ?, ?, ?, ?)"
    ).run(actor.id, actor.kind, actor.display_name, actor.created_at, actor.disabled_at ?? null);
  }
  updateActor(actor) {
    this.db.prepare(
      "UPDATE actors SET kind = ?, display_name = ?, disabled_at = ? WHERE id = ?"
    ).run(actor.kind, actor.display_name, actor.disabled_at ?? null, actor.id);
  }
  // Credentials
  findCredentialByTokenHash(tokenHash) {
    const row = this.db.prepare("SELECT * FROM credentials WHERE token_hash = ?").get(tokenHash);
    if (!row) return null;
    return {
      id: row.id,
      actor_id: row.actor_id,
      token_hash: row.token_hash,
      allowed_space_ids: JSON.parse(row.allowed_space_ids),
      capabilities: JSON.parse(row.capabilities),
      expires_at: row.expires_at ?? null,
      revoked_at: row.revoked_at ?? null,
      created_at: row.created_at
    };
  }
  findCredentialById(id) {
    const row = this.db.prepare("SELECT * FROM credentials WHERE id = ?").get(id);
    if (!row) return null;
    return {
      id: row.id,
      actor_id: row.actor_id,
      token_hash: row.token_hash,
      allowed_space_ids: JSON.parse(row.allowed_space_ids),
      capabilities: JSON.parse(row.capabilities),
      expires_at: row.expires_at ?? null,
      revoked_at: row.revoked_at ?? null,
      created_at: row.created_at
    };
  }
  createCredential(cred) {
    this.db.prepare(
      `INSERT INTO credentials (
          id, actor_id, token_hash, allowed_space_ids, capabilities, expires_at, revoked_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      cred.id,
      cred.actor_id,
      cred.token_hash,
      JSON.stringify(cred.allowed_space_ids),
      JSON.stringify(cred.capabilities),
      cred.expires_at ?? null,
      cred.revoked_at ?? null,
      cred.created_at
    );
  }
  revokeCredential(id, revokedAt) {
    this.db.prepare("UPDATE credentials SET revoked_at = ? WHERE id = ?").run(revokedAt, id);
  }
  // Spaces & Memberships
  findSpaceById(id) {
    const row = this.db.prepare("SELECT * FROM spaces WHERE id = ?").get(id);
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      current_revision: row.current_revision,
      policy_revision: row.policy_revision,
      acl_epoch: row.acl_epoch,
      created_at: row.created_at
    };
  }
  findSpaceBySlug(slug) {
    const row = this.db.prepare("SELECT * FROM spaces WHERE slug = ?").get(slug);
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      current_revision: row.current_revision,
      policy_revision: row.policy_revision,
      acl_epoch: row.acl_epoch,
      created_at: row.created_at
    };
  }
  createSpace(space, revision) {
    this.db.prepare(
      `INSERT INTO spaces (
          id, slug, current_revision, policy_revision, acl_epoch, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      space.id,
      space.slug,
      space.current_revision,
      space.policy_revision,
      space.acl_epoch,
      space.created_at
    );
    this.db.prepare(
      `INSERT INTO space_revisions (
          space_id, revision, objective, rules, review_policy, check_profiles, pinned_refs, editor_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      revision.space_id,
      revision.revision,
      revision.objective,
      JSON.stringify(revision.rules),
      JSON.stringify(revision.review_policy),
      JSON.stringify(revision.check_profiles),
      JSON.stringify(revision.pinned_refs),
      revision.editor_id,
      revision.created_at
    );
  }
  updateSpace(space, revision) {
    this.db.prepare(
      `UPDATE spaces SET
          slug = ?, current_revision = ?, policy_revision = ?, acl_epoch = ?
        WHERE id = ?`
    ).run(
      space.slug,
      space.current_revision,
      space.policy_revision,
      space.acl_epoch,
      space.id
    );
    this.db.prepare(
      `INSERT INTO space_revisions (
          space_id, revision, objective, rules, review_policy, check_profiles, pinned_refs, editor_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      revision.space_id,
      revision.revision,
      revision.objective,
      JSON.stringify(revision.rules),
      JSON.stringify(revision.review_policy),
      JSON.stringify(revision.check_profiles),
      JSON.stringify(revision.pinned_refs),
      revision.editor_id,
      revision.created_at
    );
  }
  getSpaceRevision(spaceId, revision) {
    const row = this.db.prepare("SELECT * FROM space_revisions WHERE space_id = ? AND revision = ?").get(spaceId, revision);
    if (!row) return null;
    return {
      space_id: row.space_id,
      revision: row.revision,
      objective: row.objective,
      rules: JSON.parse(row.rules),
      review_policy: JSON.parse(row.review_policy),
      check_profiles: JSON.parse(row.check_profiles),
      pinned_refs: JSON.parse(row.pinned_refs),
      editor_id: row.editor_id,
      created_at: row.created_at
    };
  }
  listVisibleSpaces(actorId, limit, cursor, allowedSpaceIds) {
    let sql = `
      SELECT s.* FROM spaces s
      JOIN memberships m ON s.id = m.space_id
      WHERE m.actor_id = ? AND m.active = 1
    `;
    const params = [actorId];
    if (allowedSpaceIds && allowedSpaceIds.length > 0 && !allowedSpaceIds.includes("*")) {
      sql += ` AND s.id IN (${allowedSpaceIds.map(() => "?").join(", ")})`;
      params.push(...allowedSpaceIds);
    }
    if (cursor) {
      sql += " AND s.id > ?";
      params.push(cursor);
    }
    sql += " ORDER BY s.id ASC LIMIT ?";
    params.push(limit + 1);
    const rows = this.db.prepare(sql).all(...params);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    const spaces = items.map((r) => ({
      id: r.id,
      slug: r.slug,
      current_revision: r.current_revision,
      policy_revision: r.policy_revision,
      acl_epoch: r.acl_epoch,
      created_at: r.created_at
    }));
    return { spaces, next_cursor: nextCursor };
  }
  getMembership(spaceId, actorId) {
    const row = this.db.prepare("SELECT * FROM memberships WHERE space_id = ? AND actor_id = ?").get(spaceId, actorId);
    if (!row) return null;
    return {
      space_id: row.space_id,
      actor_id: row.actor_id,
      role: row.role,
      active: row.active === 1,
      reviewer_eligible: row.reviewer_eligible === 1,
      independence_group: row.independence_group ?? null
    };
  }
  upsertMembership(membership) {
    this.db.prepare(
      `INSERT INTO memberships (
          space_id, actor_id, role, active, reviewer_eligible, independence_group
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(space_id, actor_id) DO UPDATE SET
          role = excluded.role,
          active = excluded.active,
          reviewer_eligible = excluded.reviewer_eligible,
          independence_group = excluded.independence_group`
    ).run(
      membership.space_id,
      membership.actor_id,
      membership.role,
      membership.active ? 1 : 0,
      membership.reviewer_eligible ? 1 : 0,
      membership.independence_group ?? null
    );
    this.db.prepare("UPDATE spaces SET acl_epoch = acl_epoch + 1 WHERE id = ?").run(membership.space_id);
  }
  listMemberships(spaceId) {
    const rows = this.db.prepare("SELECT * FROM memberships WHERE space_id = ? AND active = 1").all(spaceId);
    return rows.map((r) => ({
      space_id: r.space_id,
      actor_id: r.actor_id,
      role: r.role,
      active: r.active === 1,
      reviewer_eligible: r.reviewer_eligible === 1,
      independence_group: r.independence_group ?? null
    }));
  }
  // Sessions
  createSession(session) {
    this.db.prepare(
      `INSERT INTO sessions (
          id, actor_id, space_id, client_name, client_version, harness_session_id, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      session.id,
      session.actor_id,
      session.space_id,
      session.client_name,
      session.client_version,
      session.harness_session_id ?? null,
      JSON.stringify(session.metadata),
      session.created_at
    );
  }
  findSessionById(id) {
    const row = this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
    if (!row) return null;
    return {
      id: row.id,
      actor_id: row.actor_id,
      space_id: row.space_id,
      client_name: row.client_name,
      client_version: row.client_version,
      harness_session_id: row.harness_session_id ?? null,
      metadata: JSON.parse(row.metadata),
      created_at: row.created_at
    };
  }
  // Threads
  createThread(thread) {
    this.db.prepare(
      `INSERT INTO threads (
          id, space_id, title, version, state, creator_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      thread.id,
      thread.space_id,
      thread.title,
      thread.version,
      thread.state,
      thread.creator_id,
      thread.created_at,
      thread.updated_at
    );
  }
  updateThread(thread) {
    this.db.prepare(
      `UPDATE threads SET
          title = ?, version = ?, state = ?, updated_at = ?
        WHERE id = ?`
    ).run(thread.title, thread.version, thread.state, thread.updated_at, thread.id);
  }
  findThreadById(id) {
    const row = this.db.prepare("SELECT * FROM threads WHERE id = ?").get(id);
    if (!row) return null;
    return {
      id: row.id,
      space_id: row.space_id,
      title: row.title,
      version: row.version,
      state: row.state,
      creator_id: row.creator_id,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
  listThreads(spaceId, state, limit = 20, cursor) {
    let sql = "SELECT * FROM threads WHERE space_id = ?";
    const params = [spaceId];
    if (state) {
      sql += " AND state = ?";
      params.push(state);
    }
    if (cursor) {
      sql += " AND id < ?";
      params.push(cursor);
    }
    sql += " ORDER BY id DESC LIMIT ?";
    params.push(limit + 1);
    const rows = this.db.prepare(sql).all(...params);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    const threads = items.map((r) => ({
      id: r.id,
      space_id: r.space_id,
      title: r.title,
      version: r.version,
      state: r.state,
      creator_id: r.creator_id,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));
    return { threads, next_cursor: nextCursor };
  }
  // Posts & Revisions
  createPost(post, revision) {
    this.db.prepare(
      `INSERT INTO posts (
          id, space_id, thread_id, author_id, kind, current_revision, lifecycle, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      post.id,
      post.space_id,
      post.thread_id,
      post.author_id,
      post.kind,
      post.current_revision,
      post.lifecycle,
      post.created_at
    );
    this.db.prepare(
      `INSERT INTO post_revisions (
          post_id, revision, title, summary, body, tags, structured, content_hash, editor_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      revision.post_id,
      revision.revision,
      revision.title,
      revision.summary,
      revision.body,
      JSON.stringify(revision.tags),
      JSON.stringify(revision.structured),
      revision.content_hash,
      revision.editor_id,
      revision.created_at
    );
    this.db.prepare(
      `INSERT INTO post_fts (post_id, space_id, title, summary, body, tags)
         VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      post.id,
      post.space_id,
      revision.title,
      revision.summary,
      revision.body,
      revision.tags.join(" ")
    );
  }
  createPostRevision(post, revision) {
    this.db.prepare("UPDATE posts SET current_revision = ?, lifecycle = ? WHERE id = ?").run(post.current_revision, post.lifecycle, post.id);
    this.db.prepare(
      `INSERT INTO post_revisions (
          post_id, revision, title, summary, body, tags, structured, content_hash, editor_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      revision.post_id,
      revision.revision,
      revision.title,
      revision.summary,
      revision.body,
      JSON.stringify(revision.tags),
      JSON.stringify(revision.structured),
      revision.content_hash,
      revision.editor_id,
      revision.created_at
    );
    this.db.prepare("DELETE FROM post_fts WHERE post_id = ?").run(post.id);
    this.db.prepare(
      `INSERT INTO post_fts (post_id, space_id, title, summary, body, tags)
         VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      post.id,
      post.space_id,
      revision.title,
      revision.summary,
      revision.body,
      revision.tags.join(" ")
    );
  }
  updatePost(post) {
    this.db.prepare("UPDATE posts SET current_revision = ?, lifecycle = ? WHERE id = ?").run(post.current_revision, post.lifecycle, post.id);
    if (post.lifecycle === "redacted") {
      this.db.prepare("DELETE FROM post_fts WHERE post_id = ?").run(post.id);
    }
  }
  findPostById(id) {
    const row = this.db.prepare("SELECT * FROM posts WHERE id = ?").get(id);
    if (!row) return null;
    return {
      id: row.id,
      space_id: row.space_id,
      thread_id: row.thread_id,
      author_id: row.author_id,
      kind: row.kind,
      current_revision: row.current_revision,
      lifecycle: row.lifecycle,
      created_at: row.created_at
    };
  }
  getPostRevision(postId, revision) {
    const row = this.db.prepare("SELECT * FROM post_revisions WHERE post_id = ? AND revision = ?").get(postId, revision);
    if (!row) return null;
    return {
      post_id: row.post_id,
      revision: row.revision,
      title: row.title,
      summary: row.summary,
      body: row.body,
      tags: JSON.parse(row.tags),
      structured: JSON.parse(row.structured),
      content_hash: row.content_hash,
      editor_id: row.editor_id,
      created_at: row.created_at
    };
  }
  listPostRevisions(postId, limit = 20, cursor) {
    const post = this.findPostById(postId);
    const isRedacted = post?.lifecycle === "redacted";
    let sql = "SELECT * FROM post_revisions WHERE post_id = ?";
    const params = [postId];
    if (cursor) {
      sql += " AND revision < ?";
      params.push(parseInt(cursor, 10));
    }
    sql += " ORDER BY revision DESC LIMIT ?";
    params.push(limit + 1);
    const rows = this.db.prepare(sql).all(...params);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? String(items[items.length - 1].revision) : null;
    const revisions = items.map((r) => ({
      post_id: r.post_id,
      revision: r.revision,
      title: isRedacted ? "[REDACTED]" : r.title,
      summary: isRedacted ? "[REDACTED]" : r.summary,
      body: isRedacted ? "[REDACTED]" : r.body,
      tags: isRedacted ? [] : JSON.parse(r.tags),
      structured: isRedacted ? {} : JSON.parse(r.structured),
      content_hash: isRedacted ? "redacted" : r.content_hash,
      editor_id: r.editor_id,
      created_at: r.created_at
    }));
    return { revisions, next_cursor: nextCursor };
  }
  listPostsInThread(threadId, limit = 50, cursor) {
    let sql = "SELECT * FROM posts WHERE thread_id = ?";
    const params = [threadId];
    if (cursor) {
      sql += " AND id > ?";
      params.push(cursor);
    }
    sql += " ORDER BY id ASC LIMIT ?";
    params.push(limit + 1);
    const rows = this.db.prepare(sql).all(...params);
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    const posts = items.map((r) => ({
      id: r.id,
      space_id: r.space_id,
      thread_id: r.thread_id,
      author_id: r.author_id,
      kind: r.kind,
      current_revision: r.current_revision,
      lifecycle: r.lifecycle,
      created_at: r.created_at
    }));
    return { posts, next_cursor: nextCursor };
  }
  // Relations & Resolutions
  createRelation(relation) {
    this.db.prepare(
      `INSERT INTO relations (
          id, space_id, source_post_id, source_revision, target_post_id, target_revision,
          type, state, version, creator_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      relation.id,
      relation.space_id,
      relation.source_post_id,
      relation.source_revision,
      relation.target_post_id,
      relation.target_revision,
      relation.type,
      relation.state,
      relation.version,
      relation.creator_id,
      relation.created_at
    );
  }
  updateRelation(relation) {
    this.db.prepare("UPDATE relations SET state = ?, version = ? WHERE id = ?").run(relation.state, relation.version, relation.id);
  }
  findRelationById(id) {
    const row = this.db.prepare("SELECT * FROM relations WHERE id = ?").get(id);
    if (!row) return null;
    return {
      id: row.id,
      space_id: row.space_id,
      source_post_id: row.source_post_id,
      source_revision: row.source_revision,
      target_post_id: row.target_post_id,
      target_revision: row.target_revision,
      type: row.type,
      state: row.state,
      version: row.version,
      creator_id: row.creator_id,
      created_at: row.created_at
    };
  }
  findRelationByEndpoints(spaceId, sourcePostId, sourceRevision, targetPostId, targetRevision, type) {
    const row = this.db.prepare(
      `SELECT * FROM relations WHERE
          space_id = ? AND source_post_id = ? AND source_revision = ?
          AND target_post_id = ? AND target_revision = ? AND type = ?`
    ).get(spaceId, sourcePostId, sourceRevision, targetPostId, targetRevision, type);
    if (!row) return null;
    return {
      id: row.id,
      space_id: row.space_id,
      source_post_id: row.source_post_id,
      source_revision: row.source_revision,
      target_post_id: row.target_post_id,
      target_revision: row.target_revision,
      type: row.type,
      state: row.state,
      version: row.version,
      creator_id: row.creator_id,
      created_at: row.created_at
    };
  }
  listOpenChallenges(spaceId, targetPostId, targetRevision) {
    let sql = "SELECT * FROM relations WHERE space_id = ? AND type = 'challenges' AND state = 'open'";
    const params = [spaceId];
    if (targetPostId) {
      sql += " AND target_post_id = ?";
      params.push(targetPostId);
    }
    if (targetRevision !== void 0) {
      sql += " AND target_revision = ?";
      params.push(targetRevision);
    }
    const rows = this.db.prepare(sql).all(...params);
    return rows.map((r) => ({
      id: r.id,
      space_id: r.space_id,
      source_post_id: r.source_post_id,
      source_revision: r.source_revision,
      target_post_id: r.target_post_id,
      target_revision: r.target_revision,
      type: r.type,
      state: r.state,
      version: r.version,
      creator_id: r.creator_id,
      created_at: r.created_at
    }));
  }
  createRelationResolution(resolution) {
    this.db.prepare(
      `INSERT INTO relation_resolutions (
          id, relation_id, version, resolver_id, reason_ref, action, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      resolution.id,
      resolution.relation_id,
      resolution.version,
      resolution.resolver_id,
      JSON.stringify(resolution.reason_ref),
      resolution.action,
      resolution.created_at
    );
  }
  // Artifacts
  createArtifact(artifact) {
    this.db.prepare(
      `INSERT INTO artifacts (
          id, space_id, owner_id, visibility, review_assignment_id, check_run_id,
          sha256, bytes, mime, storage_key, state, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      artifact.id,
      artifact.space_id,
      artifact.owner_id,
      artifact.visibility,
      artifact.review_assignment_id ?? null,
      artifact.check_run_id ?? null,
      artifact.sha256,
      artifact.bytes,
      artifact.mime,
      artifact.storage_key,
      artifact.state,
      artifact.created_at
    );
  }
  updateArtifactState(id, state) {
    this.db.prepare("UPDATE artifacts SET state = ? WHERE id = ?").run(state, id);
  }
  findArtifactById(id) {
    const row = this.db.prepare("SELECT * FROM artifacts WHERE id = ?").get(id);
    if (!row) return null;
    return {
      id: row.id,
      space_id: row.space_id,
      owner_id: row.owner_id,
      visibility: row.visibility,
      review_assignment_id: row.review_assignment_id ?? null,
      check_run_id: row.check_run_id ?? null,
      sha256: row.sha256,
      bytes: row.bytes,
      mime: row.mime,
      storage_key: row.storage_key,
      state: row.state,
      created_at: row.created_at
    };
  }
  // Events
  appendEvent(spaceId, event) {
    const maxRow = this.db.prepare("SELECT COALESCE(MAX(seq), 0) AS max_seq FROM events WHERE space_id = ?").get(spaceId);
    const nextSeq = (maxRow?.max_seq ?? 0) + 1;
    this.db.prepare(
      `INSERT INTO events (
          id, space_id, seq, type, object_id, revision, visibility, actor_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      event.id,
      spaceId,
      nextSeq,
      event.type,
      event.object_id,
      event.revision ?? null,
      event.visibility,
      event.actor_id,
      event.created_at
    );
    return {
      ...event,
      seq: nextSeq
    };
  }
  getLatestEventSeq(spaceId) {
    const row = this.db.prepare("SELECT COALESCE(MAX(seq), 0) AS max_seq FROM events WHERE space_id = ?").get(spaceId);
    return row?.max_seq ?? 0;
  }
  listEventsAfter(spaceId, afterSeq, limit) {
    const rows = this.db.prepare(
      "SELECT * FROM events WHERE space_id = ? AND seq > ? ORDER BY seq ASC LIMIT ?"
    ).all(spaceId, afterSeq, limit);
    return rows.map((r) => ({
      id: r.id,
      space_id: r.space_id,
      seq: r.seq,
      type: r.type,
      object_id: r.object_id,
      revision: r.revision ?? null,
      visibility: r.visibility,
      actor_id: r.actor_id,
      created_at: r.created_at
    }));
  }
  findEventById(id) {
    const row = this.db.prepare("SELECT * FROM events WHERE id = ?").get(id);
    if (!row) return null;
    return {
      id: row.id,
      space_id: row.space_id,
      seq: row.seq,
      type: row.type,
      object_id: row.object_id,
      revision: row.revision ?? null,
      visibility: row.visibility,
      actor_id: row.actor_id,
      created_at: row.created_at
    };
  }
  // Idempotency
  getIdempotencyRecord(actorId, spaceId, operation, key) {
    const row = this.db.prepare(
      "SELECT * FROM idempotency_records WHERE actor_id = ? AND space_id = ? AND operation = ? AND key = ?"
    ).get(actorId, spaceId, operation, key);
    if (!row) return null;
    return {
      actor_id: row.actor_id,
      space_id: row.space_id,
      operation: row.operation,
      key: row.key,
      request_hash: row.request_hash,
      result_ref: row.result_ref,
      http_status: row.http_status,
      created_at: row.created_at
    };
  }
  createIdempotencyRecord(record) {
    this.db.prepare(
      `INSERT INTO idempotency_records (
          actor_id, space_id, operation, key, request_hash, result_ref, http_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      record.actor_id,
      record.space_id,
      record.operation,
      record.key,
      record.request_hash,
      record.result_ref,
      record.http_status,
      record.created_at
    );
  }
  // Subscriptions & Consumers
  createSubscription(sub) {
    this.db.prepare(
      `INSERT INTO subscriptions (
          id, actor_id, space_id, thread_ids, event_types, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      sub.id,
      sub.actor_id,
      sub.space_id,
      JSON.stringify(sub.thread_ids),
      JSON.stringify(sub.event_types),
      sub.created_at
    );
  }
  findSubscriptionById(id) {
    const row = this.db.prepare("SELECT * FROM subscriptions WHERE id = ?").get(id);
    if (!row) return null;
    return {
      id: row.id,
      actor_id: row.actor_id,
      space_id: row.space_id,
      thread_ids: JSON.parse(row.thread_ids),
      event_types: JSON.parse(row.event_types),
      created_at: row.created_at
    };
  }
  findSubscriptionByActorAndSpace(actorId, spaceId) {
    const row = this.db.prepare("SELECT * FROM subscriptions WHERE actor_id = ? AND space_id = ?").get(actorId, spaceId);
    if (!row) return null;
    return {
      id: row.id,
      actor_id: row.actor_id,
      space_id: row.space_id,
      thread_ids: JSON.parse(row.thread_ids),
      event_types: JSON.parse(row.event_types),
      created_at: row.created_at
    };
  }
  listSubscriptionsByActorAndSpace(actorId, spaceId) {
    const rows = this.db.prepare("SELECT * FROM subscriptions WHERE actor_id = ? AND space_id = ?").all(actorId, spaceId);
    return rows.map((row) => ({
      id: row.id,
      actor_id: row.actor_id,
      space_id: row.space_id,
      thread_ids: JSON.parse(row.thread_ids),
      event_types: JSON.parse(row.event_types),
      created_at: row.created_at
    }));
  }
  createConsumer(consumer) {
    this.db.prepare(
      `INSERT INTO consumers (
          id, subscription_id, consumer_key, ack_seq, version, active_batch_id, acl_epoch
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      consumer.id,
      consumer.subscription_id,
      consumer.consumer_key,
      consumer.ack_seq,
      consumer.version,
      consumer.active_batch_id ?? null,
      consumer.acl_epoch
    );
  }
  findConsumerById(id) {
    const row = this.db.prepare("SELECT * FROM consumers WHERE id = ?").get(id);
    if (!row) return null;
    return {
      id: row.id,
      subscription_id: row.subscription_id,
      consumer_key: row.consumer_key,
      ack_seq: row.ack_seq,
      version: row.version,
      active_batch_id: row.active_batch_id ?? null,
      acl_epoch: row.acl_epoch
    };
  }
  findConsumerByKey(subscriptionId, consumerKey) {
    const row = this.db.prepare("SELECT * FROM consumers WHERE subscription_id = ? AND consumer_key = ?").get(subscriptionId, consumerKey);
    if (!row) return null;
    return {
      id: row.id,
      subscription_id: row.subscription_id,
      consumer_key: row.consumer_key,
      ack_seq: row.ack_seq,
      version: row.version,
      active_batch_id: row.active_batch_id ?? null,
      acl_epoch: row.acl_epoch
    };
  }
  updateConsumerAck(id, ackSeq, version) {
    this.db.prepare("UPDATE consumers SET ack_seq = ?, version = ? WHERE id = ?").run(ackSeq, version, id);
  }
  updateConsumerBatch(id, activeBatchId, version) {
    this.db.prepare("UPDATE consumers SET active_batch_id = ?, version = ? WHERE id = ?").run(activeBatchId ?? null, version, id);
  }
  deactivateConsumer(id) {
    this.db.prepare("DELETE FROM consumers WHERE id = ?").run(id);
  }
  // Delivery Batches
  createDeliveryBatch(batch) {
    this.db.prepare(
      `INSERT INTO delivery_batches (
          id, consumer_id, from_seq, through_seq, event_ids, acked_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      batch.id,
      batch.consumer_id,
      batch.from_seq,
      batch.through_seq,
      JSON.stringify(batch.event_ids),
      batch.acked_at ?? null,
      batch.created_at
    );
  }
  findDeliveryBatchById(id) {
    const row = this.db.prepare("SELECT * FROM delivery_batches WHERE id = ?").get(id);
    if (!row) return null;
    return {
      id: row.id,
      consumer_id: row.consumer_id,
      from_seq: row.from_seq,
      through_seq: row.through_seq,
      event_ids: JSON.parse(row.event_ids),
      acked_at: row.acked_at ?? null,
      created_at: row.created_at
    };
  }
  ackDeliveryBatch(id, ackedAt) {
    this.db.prepare("UPDATE delivery_batches SET acked_at = ? WHERE id = ?").run(ackedAt, id);
  }
  // Search & Views
  searchPosts(spaceId, q, filters, limit = 20, cursor) {
    const trimmed = q.trim();
    let rows = [];
    if (trimmed.length >= 3) {
      const sanitized = `"${trimmed.replace(/"/g, '""')}"`;
      let sql = `
        SELECT p.id as post_id, p.thread_id, p.kind, p.current_revision,
               r.title, r.summary, r.tags, r.created_at,
               snippet(post_fts, 2, '<b>', '</b>', '...', 16) as snippet
        FROM post_fts f
        JOIN posts p ON f.post_id = p.id
        JOIN post_revisions r ON p.id = r.post_id AND p.current_revision = r.revision
        WHERE f.space_id = ? AND post_fts MATCH ? AND p.lifecycle = 'active'
      `;
      const params = [spaceId, sanitized];
      if (filters?.kind) {
        sql += " AND p.kind = ?";
        params.push(filters.kind);
      }
      if (filters?.thread_id) {
        sql += " AND p.thread_id = ?";
        params.push(filters.thread_id);
      }
      if (cursor) {
        sql += " AND p.id < ?";
        params.push(cursor);
      }
      sql += " ORDER BY p.id DESC LIMIT ?";
      params.push(limit + 1);
      rows = this.db.prepare(sql).all(...params);
    } else {
      let escapeLike = function(str) {
        return str.replace(/([%_\\])/g, "\\$1");
      };
      const escaped = escapeLike(trimmed);
      let sql = `
        SELECT p.id as post_id, p.thread_id, p.kind, p.current_revision,
               r.title, r.summary, r.tags, r.created_at,
               r.summary as snippet
        FROM posts p
        JOIN post_revisions r ON p.id = r.post_id AND p.current_revision = r.revision
        WHERE p.space_id = ? AND p.lifecycle = 'active'
      `;
      const params = [spaceId];
      if (trimmed.length > 0) {
        sql += " AND (r.title LIKE ? ESCAPE '\\' OR r.summary LIKE ? ESCAPE '\\' OR r.body LIKE ? ESCAPE '\\')";
        params.push(`%${escaped}%`, `%${escaped}%`, `%${escaped}%`);
      }
      if (filters?.kind) {
        sql += " AND p.kind = ?";
        params.push(filters.kind);
      }
      if (filters?.thread_id) {
        sql += " AND p.thread_id = ?";
        params.push(filters.thread_id);
      }
      if (cursor) {
        sql += " AND p.id < ?";
        params.push(cursor);
      }
      sql += " ORDER BY p.id DESC LIMIT ?";
      params.push(limit + 1);
      rows = this.db.prepare(sql).all(...params);
    }
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].post_id : null;
    const formatted = items.map((r) => ({
      post_id: r.post_id,
      revision: r.current_revision,
      thread_id: r.thread_id,
      kind: r.kind,
      title: r.title,
      summary: r.summary,
      tags: typeof r.tags === "string" ? JSON.parse(r.tags) : r.tags,
      snippet: r.snippet ?? r.summary,
      created_at: r.created_at
    }));
    return { items: formatted, next_cursor: nextCursor };
  }
  // Redactions
  createRedaction(redaction) {
    if (redaction.target_type === "post") {
      const post = this.findPostById(redaction.target_id);
      if (!post || post.space_id !== redaction.space_id) {
        throw new Error("NOT_FOUND: \u76EE\u6807\u5E16\u5B50\u4E0D\u5B58\u5728\u6216\u4E0D\u5C5E\u4E8E\u8BE5\u7A7A\u95F4\u3002");
      }
      this.db.prepare("UPDATE posts SET lifecycle = 'redacted' WHERE id = ? AND space_id = ?").run(redaction.target_id, redaction.space_id);
      this.db.prepare(
        "UPDATE post_revisions SET title = '[REDACTED]', summary = '[REDACTED]', body = '[REDACTED]', structured = '{}' WHERE post_id = ?"
      ).run(redaction.target_id);
      this.db.prepare("DELETE FROM post_fts WHERE post_id = ?").run(redaction.target_id);
      const idemRows = this.db.prepare("SELECT actor_id, space_id, operation, key, result_ref FROM idempotency_records WHERE space_id = ?").all(redaction.space_id);
      for (const row of idemRows) {
        if (row.result_ref && row.result_ref.includes(redaction.target_id)) {
          try {
            const parsed = JSON.parse(row.result_ref);
            if (parsed.post && parsed.post.id === redaction.target_id) {
              parsed.post.lifecycle = "redacted";
              if (parsed.revision) {
                parsed.revision.title = "[REDACTED]";
                parsed.revision.summary = "[REDACTED]";
                parsed.revision.body = "[REDACTED]";
                parsed.revision.structured = {};
              }
              this.db.prepare("UPDATE idempotency_records SET result_ref = ? WHERE actor_id = ? AND space_id = ? AND operation = ? AND key = ?").run(JSON.stringify(parsed), row.actor_id, row.space_id, row.operation, row.key);
            }
          } catch {
          }
        }
      }
    } else if (redaction.target_type === "artifact") {
      const artifact = this.findArtifactById(redaction.target_id);
      if (!artifact || artifact.space_id !== redaction.space_id) {
        throw new Error("NOT_FOUND: \u76EE\u6807\u9644\u4EF6\u4E0D\u5B58\u5728\u6216\u4E0D\u5C5E\u4E8E\u8BE5\u7A7A\u95F4\u3002");
      }
      this.db.prepare("UPDATE artifacts SET state = 'redacted' WHERE id = ? AND space_id = ?").run(redaction.target_id, redaction.space_id);
    }
    this.db.prepare(
      `INSERT INTO redactions (
          id, space_id, target_type, target_id, affected_revisions, operator_id, reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      redaction.id,
      redaction.space_id,
      redaction.target_type,
      redaction.target_id,
      JSON.stringify(redaction.affected_revisions),
      redaction.operator_id,
      redaction.reason,
      redaction.created_at
    );
  }
};

// legacy:packages/storage-sqlite/src/schema.ts
var SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  disabled_at TEXT
);

CREATE TABLE IF NOT EXISTS credentials (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  token_hash TEXT NOT NULL UNIQUE,
  allowed_space_ids TEXT NOT NULL,
  capabilities TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  current_revision INTEGER NOT NULL DEFAULT 1,
  policy_revision INTEGER NOT NULL DEFAULT 1,
  acl_epoch INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS space_revisions (
  space_id TEXT NOT NULL REFERENCES spaces(id),
  revision INTEGER NOT NULL,
  objective TEXT NOT NULL,
  rules TEXT NOT NULL,
  review_policy TEXT NOT NULL,
  check_profiles TEXT NOT NULL,
  pinned_refs TEXT NOT NULL,
  editor_id TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (space_id, revision)
);

CREATE TABLE IF NOT EXISTS memberships (
  space_id TEXT NOT NULL REFERENCES spaces(id),
  actor_id TEXT NOT NULL REFERENCES actors(id),
  role TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  reviewer_eligible INTEGER NOT NULL DEFAULT 1,
  independence_group TEXT,
  PRIMARY KEY (space_id, actor_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  space_id TEXT NOT NULL REFERENCES spaces(id),
  client_name TEXT NOT NULL,
  client_version TEXT NOT NULL,
  harness_session_id TEXT,
  metadata TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  title TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL DEFAULT 'open',
  creator_id TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  thread_id TEXT NOT NULL REFERENCES threads(id),
  author_id TEXT NOT NULL REFERENCES actors(id),
  kind TEXT NOT NULL,
  current_revision INTEGER NOT NULL DEFAULT 1,
  lifecycle TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_revisions (
  post_id TEXT NOT NULL REFERENCES posts(id),
  revision INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT NOT NULL,
  structured TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  editor_id TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, revision)
);

CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  source_post_id TEXT NOT NULL REFERENCES posts(id),
  source_revision INTEGER NOT NULL,
  target_post_id TEXT NOT NULL REFERENCES posts(id),
  target_revision INTEGER NOT NULL,
  type TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'open',
  version INTEGER NOT NULL DEFAULT 1,
  creator_id TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL,
  UNIQUE (space_id, source_post_id, source_revision, target_post_id, target_revision, type)
);

CREATE TABLE IF NOT EXISTS relation_resolutions (
  id TEXT PRIMARY KEY,
  relation_id TEXT NOT NULL REFERENCES relations(id),
  version INTEGER NOT NULL,
  resolver_id TEXT NOT NULL REFERENCES actors(id),
  reason_ref TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  owner_id TEXT NOT NULL REFERENCES actors(id),
  visibility TEXT NOT NULL DEFAULT 'space',
  review_assignment_id TEXT,
  check_run_id TEXT,
  sha256 TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  mime TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'ready',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS revision_artifacts (
  post_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  artifact_id TEXT NOT NULL REFERENCES artifacts(id),
  purpose TEXT NOT NULL DEFAULT 'evidence',
  PRIMARY KEY (post_id, revision, artifact_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  space_id TEXT NOT NULL REFERENCES spaces(id),
  thread_ids TEXT NOT NULL,
  event_types TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consumers (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  consumer_key TEXT NOT NULL,
  ack_seq INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  active_batch_id TEXT,
  acl_epoch INTEGER NOT NULL DEFAULT 1,
  UNIQUE (subscription_id, consumer_key)
);

CREATE TABLE IF NOT EXISTS delivery_batches (
  id TEXT PRIMARY KEY,
  consumer_id TEXT NOT NULL REFERENCES consumers(id),
  from_seq INTEGER NOT NULL,
  through_seq INTEGER NOT NULL,
  event_ids TEXT NOT NULL,
  acked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  revision INTEGER,
  visibility TEXT NOT NULL DEFAULT 'public',
  actor_id TEXT NOT NULL REFERENCES actors(id),
  created_at TEXT NOT NULL,
  UNIQUE (space_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_events_space_seq ON events(space_id, seq);

CREATE TABLE IF NOT EXISTS idempotency_records (
  actor_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  result_ref TEXT NOT NULL,
  http_status INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (actor_id, space_id, operation, key)
);

CREATE TABLE IF NOT EXISTS redactions (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  affected_revisions TEXT NOT NULL,
  operator_id TEXT NOT NULL REFERENCES actors(id),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS post_fts USING fts5(
  post_id UNINDEXED,
  space_id UNINDEXED,
  title,
  summary,
  body,
  tags,
  tokenize="trigram"
);
`;

// legacy:packages/storage-sqlite/src/bootstrap.ts
import { randomBytes as randomBytes2, createHash as createHash3 } from "node:crypto";
function bootstrapDatabase(db, adminDisplayName = "Administrator") {
  db.exec(SCHEMA_SQL);
  db.prepare("INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
    1,
    (/* @__PURE__ */ new Date()).toISOString()
  );
  const storage = new SqliteStorage(db);
  const existingAdmin = db.prepare("SELECT * FROM actors WHERE kind = 'human' LIMIT 1").get();
  if (existingAdmin) {
    return {
      isNewInstance: false,
      adminToken: null,
      adminActorId: existingAdmin.id
    };
  }
  const adminActorId = `act_admin_${randomBytes2(6).toString("hex")}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  storage.createActor({
    id: adminActorId,
    kind: "human",
    display_name: adminDisplayName,
    created_at: now,
    disabled_at: null
  });
  const rawToken = `detuned_adm_${randomBytes2(24).toString("hex")}`;
  const tokenHash = createHash3("sha256").update(rawToken).digest("hex");
  storage.createCredential({
    id: `cred_admin_${randomBytes2(6).toString("hex")}`,
    actor_id: adminActorId,
    token_hash: tokenHash,
    allowed_space_ids: ["*"],
    capabilities: ["read", "write", "admin"],
    expires_at: null,
    revoked_at: null,
    created_at: now
  });
  return {
    isNewInstance: true,
    adminToken: rawToken,
    adminActorId
  };
}

// legacy:packages/storage-sqlite/src/lock.ts
import fs from "node:fs";
import path from "node:path";

// tests/fixtures/runtime-fa1b35c/entry.ts
function buildLegacyApp(options) {
  if (typeof options.tokenSecret !== "string" || Buffer.byteLength(options.tokenSecret) < 32) throw new Error("An explicit private test tokenSecret of at least 32 bytes is required.");
  return buildApp(options);
}
export {
  SCHEMA_SQL,
  SqliteStorage,
  bootstrapDatabase,
  buildLegacyApp
};
