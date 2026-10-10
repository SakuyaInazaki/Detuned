import { markReviewRequestsStale } from './review-lifecycle.js';
import {
  Space,
  SpaceRevision,
  Session,
  CreateSpaceRequest,
  PatchSpaceRequest,
  CreateSessionRequest,
  DetunedError,
  ErrorCode,
  ReviewPolicy,
} from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { IdGeneratorPort } from '../ports/id-generator.js';
import { ClockPort } from '../ports/clock.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
import { IdempotencyService } from './idempotency-service.js';
import { WriteRateLimiter } from './write-rate-limiter.js';

const DEFAULT_REVIEW_POLICY: ReviewPolicy = {
  enabled: true,
  required_reviewers: 2,
  exclude_contributors: true,
  distinct_actors: true,
  distinct_independence_groups: false,
  seal_until_all_submitted: true,
  invalidate_on_revision: true,
  required_checks: ['reproduce'],
  allow_open_objections: false,
};

export class SpaceService {
  constructor(
    private readonly storage: StoragePort,
    private readonly idGen: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly authService: AuthService,
    private readonly idempotency: IdempotencyService,
    private readonly writeRateLimiter: WriteRateLimiter = authService.writeRateLimiter
  ) {}

  createSpace(
    auth: AuthenticatedContext,
    req: CreateSpaceRequest,
    requestKey: string
  ): { space: Space; revision: SpaceRevision } {
    this.authService.requireInstanceAdmin(auth);

    return this.idempotency.executeIdempotent(
      auth.actor.id,
      'instance',
      'space.create',
      requestKey,
      req,
      201,
      (tx) => {
        const existing = tx.findSpaceBySlug(req.slug);
        if (existing) {
          throw new DetunedError(
            ErrorCode.IDEMPOTENCY_CONFLICT,
            `空间标识 slug '${req.slug}' 已被使用。`,
            409
          );
        }

        const now = this.clock.nowIso();
        const spaceId = this.idGen.generateId('spc');
        const space: Space = {
          id: spaceId,
          slug: req.slug,
          current_revision: 1,
          policy_revision: 1,
          acl_epoch: 1,
          created_at: now,
        };

        const revision: SpaceRevision = {
          space_id: spaceId,
          revision: 1,
          objective: req.objective,
          rules: req.rules,
          review_policy: req.review_policy ?? DEFAULT_REVIEW_POLICY,
          check_profiles: req.check_profiles ?? {},
          pinned_refs: [],
          editor_id: auth.actor.id,
          created_at: now,
        };

        tx.createSpace(space, revision);

        // Add creator as owner
        tx.upsertMembership({
          space_id: spaceId,
          actor_id: auth.actor.id,
          role: 'owner',
          active: true,
          reviewer_eligible: true,
          independence_group: null,
        });

        // Append event
        tx.appendEvent(spaceId, {
          id: this.idGen.generateId('evt'),
          space_id: spaceId,
          type: 'space.revised',
          object_id: spaceId,
          revision: 1,
          visibility: 'public',
          actor_id: auth.actor.id,
          created_at: now,
        });

        const createdSpace = tx.findSpaceById(spaceId) ?? space;
        return { space: createdSpace, revision };
      }
    ).data;
  }

  patchSpace(
    auth: AuthenticatedContext,
    spaceId: string,
    req: PatchSpaceRequest,
    requestKey: string
  ): { space: Space; revision: SpaceRevision } {
    this.authService.requireSpaceAccess(auth, spaceId, 'maintainer');

    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      'space.patch',
      requestKey,
      req,
      200,
      (tx) => {
        const space = tx.findSpaceById(spaceId);
        if (!space) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '空间不存在。', 404);
        }

        if (space.current_revision !== req.expected_revision) {
          throw new DetunedError(
            ErrorCode.REVISION_CONFLICT,
            '空间规则已有更新，请获取最新版本后重试。',
            409,
            false,
            { current_revision: space.current_revision }
          );
        }

        const currentRev = tx.getSpaceRevision(spaceId, space.current_revision);
        if (!currentRev) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '空间修订历史不存在。', 404);
        }

        const now = this.clock.nowIso();
        const nextRevision = space.current_revision + 1;

        // Policy change check
        const policyChanged =
          req.objective !== undefined ||
          req.rules !== undefined ||
          req.review_policy !== undefined ||
          req.check_profiles !== undefined;

        const nextPolicyRevision = policyChanged ? nextRevision : space.policy_revision;

        const updatedSpace: Space = {
          ...space,
          current_revision: nextRevision,
          policy_revision: nextPolicyRevision,
        };

        const newRevision: SpaceRevision = {
          space_id: spaceId,
          revision: nextRevision,
          objective: req.objective ?? currentRev.objective,
          rules: req.rules ?? currentRev.rules,
          review_policy: req.review_policy ?? currentRev.review_policy,
          check_profiles: req.check_profiles ?? currentRev.check_profiles,
          pinned_refs: req.pinned_refs ?? currentRev.pinned_refs,
          editor_id: auth.actor.id,
          created_at: now,
        };

        tx.updateSpace(updatedSpace, newRevision);
        if (policyChanged) markReviewRequestsStale(tx,spaceId,{kind:'policy',objectId:spaceId,actorId:auth.actor.id,changedAt:now});

        tx.appendEvent(spaceId, {
          id: this.idGen.generateId('evt'),
          space_id: spaceId,
          type: 'space.revised',
          object_id: spaceId,
          revision: nextRevision,
          visibility: 'public',
          actor_id: auth.actor.id,
          created_at: now,
        });

        return { space: updatedSpace, revision: newRevision };
      }
    ).data;
  }

  createSession(
    auth: AuthenticatedContext,
    spaceId: string,
    req: CreateSessionRequest
  ): Session {
    this.authService.requireSpaceAccess(auth, spaceId, 'observer');
    this.writeRateLimiter.admit(auth.actor.id);

    const session: Session = {
      id: this.idGen.generateId('ses'),
      actor_id: auth.actor.id,
      space_id: spaceId,
      client_name: req.client_name,
      client_version: req.client_version,
      harness_session_id: req.harness_session_id ?? null,
      metadata: req.metadata ?? {},
      created_at: this.clock.nowIso(),
    };

    this.storage.createSession(session);
    return session;
  }
}
