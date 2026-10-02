import {
  Relation,
  RelationType,
  RelationResolution,
  CreateRelationRequest,
  ResolveRelationRequest,
  ReopenRelationRequest,
  DetunedError,
  ErrorCode,
} from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { IdGeneratorPort } from '../ports/id-generator.js';
import { ClockPort } from '../ports/clock.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
import { IdempotencyService } from './idempotency-service.js';

const VALID_RELATION_TYPES: readonly RelationType[] = [
  'cites',
  'supports',
  'challenges',
  'supersedes',
  'reproduces',
  'addresses',
];

export class RelationService {
  constructor(
    private readonly storage: StoragePort,
    private readonly idGen: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly authService: AuthService,
    private readonly idempotency: IdempotencyService
  ) {}

  createRelation(
    auth: AuthenticatedContext,
    spaceId: string,
    req: CreateRelationRequest,
    requestKey: string
  ): Relation {
    if (!req.type || !VALID_RELATION_TYPES.includes(req.type)) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        `非法的关系类型: ${req.type}`,
        400
      );
    }

    const spaceAuth = this.authService.requireSpaceAccess(auth, spaceId, 'contributor');

    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      'relation.create',
      requestKey,
      req,
      201,
      (tx) => {
        // Validate source post & revision
        const sourcePost = tx.findPostById(req.source_ref.post_id);
        if (!sourcePost || sourcePost.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '源帖子不存在。', 404);
        }
        const sourceRev = tx.getPostRevision(req.source_ref.post_id, req.source_ref.revision);
        if (!sourceRev) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '源帖子修订版本不存在。', 404);
        }

        // Validate target post & revision
        const targetPost = tx.findPostById(req.target_ref.post_id);
        if (!targetPost || targetPost.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '目标帖子不存在。', 404);
        }
        const targetRev = tx.getPostRevision(req.target_ref.post_id, req.target_ref.revision);
        if (!targetRev) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '目标帖子修订版本不存在。', 404);
        }

        // Permission: source owner or maintainer
        const isSourceAuthor = sourcePost.author_id === auth.actor.id;
        const isMaintainer = ['maintainer', 'owner'].includes(spaceAuth.spaceRole);
        if (!isSourceAuthor && !isMaintainer) {
          throw new DetunedError(
            ErrorCode.FORBIDDEN,
            '必须拥有源帖子或具备维护者权限才能创建关系。',
            403
          );
        }

        // Endpoint uniqueness
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
        const relId = this.idGen.generateId('rel');
        const relation: Relation = {
          id: relId,
          space_id: spaceId,
          source_post_id: req.source_ref.post_id,
          source_revision: req.source_ref.revision,
          target_post_id: req.target_ref.post_id,
          target_revision: req.target_ref.revision,
          type: req.type,
          state: req.type === 'challenges' ? 'open' : 'resolved',
          version: 1,
          creator_id: auth.actor.id,
          created_at: now,
        };

        tx.createRelation(relation);

        tx.appendEvent(spaceId, {
          id: this.idGen.generateId('evt'),
          space_id: spaceId,
          type: 'relation.created',
          object_id: relId,
          revision: 1,
          visibility: 'public',
          actor_id: auth.actor.id,
          created_at: now,
        });

        return relation;
      }
    ).data;
  }

  resolveChallenge(
    auth: AuthenticatedContext,
    spaceId: string,
    relationId: string,
    req: ResolveRelationRequest,
    requestKey: string
  ): { relation: Relation; resolution: RelationResolution } {
    const spaceAuth = this.authService.requireSpaceAccess(auth, spaceId, 'contributor');

    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      `relation.resolve:${relationId}`,
      requestKey,
      req,
      200,
      (tx) => {
        const relation = tx.findRelationById(relationId);
        if (!relation || relation.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '关系不存在。', 404);
        }

        if (relation.type !== 'challenges') {
          throw new DetunedError(
            ErrorCode.VALIDATION_ERROR,
            '仅 challenges 异议关系可被 resolve/reopen。',
            422
          );
        }

        if (relation.state !== 'open') {
          throw new DetunedError(
            ErrorCode.VALIDATION_ERROR,
            '该异议已被解决。',
            422
          );
        }

        if (relation.version !== req.expected_version) {
          throw new DetunedError(
            ErrorCode.REVISION_CONFLICT,
            '关系版本冲突，请获取最新状态。',
            409,
            false,
            { current_version: relation.version }
          );
        }

        // Verify reason_ref exists
        const reasonPost = tx.findPostById(req.reason_ref.post_id);
        if (!reasonPost || reasonPost.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '解决理由帖子不存在。', 404);
        }
        const reasonRev = tx.getPostRevision(req.reason_ref.post_id, req.reason_ref.revision);
        if (!reasonRev) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '解决理由帖子修订版本不存在。', 404);
        }

        // Authorization check:
        // Original objection author OR non-involved maintainer
        const isObjectionAuthor = relation.creator_id === auth.actor.id;
        const targetPost = tx.findPostById(relation.target_post_id);
        const isChallengedTargetAuthor = targetPost?.author_id === auth.actor.id;
        const isMaintainer = ['maintainer', 'owner'].includes(spaceAuth.spaceRole);

        if (!isObjectionAuthor) {
          if (!isMaintainer || isChallengedTargetAuthor) {
            throw new DetunedError(
              ErrorCode.FORBIDDEN,
              '被挑战材料作者不能单方面关闭异议；需要原异议作者或未参与该材料的维护者解决。',
              403
            );
          }
        }

        const now = this.clock.nowIso();
        const nextVersion = relation.version + 1;

        const updatedRel: Relation = {
          ...relation,
          state: 'resolved',
          version: nextVersion,
        };
        tx.updateRelation(updatedRel);

        const resolution: RelationResolution = {
          id: this.idGen.generateId('res'),
          relation_id: relationId,
          version: nextVersion,
          resolver_id: auth.actor.id,
          reason_ref: req.reason_ref,
          action: 'resolve',
          created_at: now,
        };
        tx.createRelationResolution(resolution);

        tx.appendEvent(spaceId, {
          id: this.idGen.generateId('evt'),
          space_id: spaceId,
          type: 'relation.resolved',
          object_id: relationId,
          revision: nextVersion,
          visibility: 'public',
          actor_id: auth.actor.id,
          created_at: now,
        });

        return { relation: updatedRel, resolution };
      }
    ).data;
  }

  reopenChallenge(
    auth: AuthenticatedContext,
    spaceId: string,
    relationId: string,
    req: ReopenRelationRequest,
    requestKey: string
  ): { relation: Relation; resolution: RelationResolution } {
    const spaceAuth = this.authService.requireSpaceAccess(auth, spaceId, 'contributor');

    return this.idempotency.executeIdempotent(
      auth.actor.id,
      spaceId,
      `relation.reopen:${relationId}`,
      requestKey,
      req,
      200,
      (tx) => {
        const relation = tx.findRelationById(relationId);
        if (!relation || relation.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '关系不存在。', 404);
        }

        if (relation.type !== 'challenges') {
          throw new DetunedError(
            ErrorCode.VALIDATION_ERROR,
            '仅 challenges 异议关系可被 reopen。',
            422
          );
        }

        if (relation.state !== 'resolved') {
          throw new DetunedError(
            ErrorCode.VALIDATION_ERROR,
            '该异议处于开放状态。',
            422
          );
        }

        if (relation.version !== req.expected_version) {
          throw new DetunedError(
            ErrorCode.REVISION_CONFLICT,
            '关系版本冲突，请获取最新状态。',
            409,
            false,
            { current_version: relation.version }
          );
        }

        const isObjectionAuthor = relation.creator_id === auth.actor.id;
        const isMaintainer = ['maintainer', 'owner'].includes(spaceAuth.spaceRole);
        if (!isObjectionAuthor && !isMaintainer) {
          throw new DetunedError(
            ErrorCode.FORBIDDEN,
            '仅原异议作者或维护者可以重开异议。',
            403
          );
        }

        const now = this.clock.nowIso();
        const nextVersion = relation.version + 1;

        const updatedRel: Relation = {
          ...relation,
          state: 'open',
          version: nextVersion,
        };
        tx.updateRelation(updatedRel);

        const resolution: RelationResolution = {
          id: this.idGen.generateId('res'),
          relation_id: relationId,
          version: nextVersion,
          resolver_id: auth.actor.id,
          reason_ref: req.reason_ref,
          action: 'reopen',
          created_at: now,
        };
        tx.createRelationResolution(resolution);

        tx.appendEvent(spaceId, {
          id: this.idGen.generateId('evt'),
          space_id: spaceId,
          type: 'relation.reopened',
          object_id: relationId,
          revision: nextVersion,
          visibility: 'public',
          actor_id: auth.actor.id,
          created_at: now,
        });

        return { relation: updatedRel, resolution };
      }
    ).data;
  }
}
