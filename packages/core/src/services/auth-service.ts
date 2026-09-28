import {
  Actor,
  Credential,
  Membership,
  SpaceRole,
  DetunedError,
  ErrorCode,
} from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { HasherPort } from '../ports/hasher.js';
import { ClockPort } from '../ports/clock.js';

export interface AuthenticatedContext {
  actor: Actor;
  credential: Credential;
}

export interface SpaceAuthContext extends AuthenticatedContext {
  membership: Membership;
  spaceRole: SpaceRole;
}

export class AuthService {
  constructor(
    private readonly storage: StoragePort,
    private readonly hasher: HasherPort,
    private readonly clock: ClockPort
  ) {}

  authenticateToken(rawToken: string): AuthenticatedContext {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new DetunedError(
        ErrorCode.UNAUTHENTICATED,
        '缺少或无效的 Authorization Token。',
        401
      );
    }

    const tokenHash = this.hasher.sha256(rawToken.trim());
    const cred = this.storage.findCredentialByTokenHash(tokenHash);
    if (!cred) {
      throw new DetunedError(
        ErrorCode.UNAUTHENTICATED,
        '凭据不存在或已失效。',
        401
      );
    }

    const nowIso = this.clock.nowIso();
    if (cred.revoked_at) {
      throw new DetunedError(
        ErrorCode.UNAUTHENTICATED,
        '凭据已被撤销。',
        401
      );
    }
    if (cred.expires_at && cred.expires_at < nowIso) {
      throw new DetunedError(
        ErrorCode.UNAUTHENTICATED,
        '凭据已过期。',
        401
      );
    }

    const actor = this.storage.findActorById(cred.actor_id);
    if (!actor || actor.disabled_at) {
      throw new DetunedError(
        ErrorCode.UNAUTHENTICATED,
        '身份不存在或已被禁用。',
        401
      );
    }

    return { actor, credential: cred };
  }

  requireInstanceAdmin(auth: AuthenticatedContext): void {
    if (!auth.credential.capabilities.includes('admin')) {
      throw new DetunedError(
        ErrorCode.FORBIDDEN,
        '需要实例管理员权限。',
        403
      );
    }
  }

  requireSpaceAccess(
    auth: AuthenticatedContext,
    spaceId: string,
    minimumRole: SpaceRole = 'observer'
  ): SpaceAuthContext {
    // 1. Verify space exists
    const space = this.storage.findSpaceById(spaceId);
    if (!space) {
      throw new DetunedError(
        ErrorCode.NOT_FOUND,
        '空间不存在或无权访问。',
        404
      );
    }

    // 2. Verify credential allows this space
    const allowed =
      auth.credential.allowed_space_ids.includes('*') ||
      auth.credential.allowed_space_ids.includes(spaceId);

    if (!allowed) {
      // Do not leak existence to unauthorized caller
      throw new DetunedError(
        ErrorCode.NOT_FOUND,
        '空间不存在或无权访问。',
        404
      );
    }

    // 3. Verify membership
    let membership = this.storage.getMembership(spaceId, auth.actor.id);
    // If instance admin, grant virtual owner membership if none exists
    if (!membership && auth.credential.capabilities.includes('admin')) {
      membership = {
        space_id: spaceId,
        actor_id: auth.actor.id,
        role: 'owner',
        active: true,
        reviewer_eligible: true,
        independence_group: null,
      };
    }

    if (!membership || !membership.active) {
      throw new DetunedError(
        ErrorCode.NOT_FOUND,
        '空间不存在或无权访问。',
        404
      );
    }

    // 4. Verify role hierarchy
    const roleLevels: Record<SpaceRole, number> = {
      observer: 1,
      contributor: 2,
      maintainer: 3,
      owner: 4,
    };

    if (roleLevels[membership.role] < roleLevels[minimumRole]) {
      throw new DetunedError(
        ErrorCode.FORBIDDEN,
        `该操作需要 ${minimumRole} 或更高角色权限。`,
        403
      );
    }

    // 5. Verify credential capabilities (read requires read/admin, write requires write/admin)
    const caps = auth.credential.capabilities;
    if (!caps || caps.length === 0) {
      throw new DetunedError(
        ErrorCode.FORBIDDEN,
        '凭据没有任何 capability 权限。',
        403
      );
    }

    const hasRead = caps.includes('read') || caps.includes('admin');
    if (!hasRead) {
      throw new DetunedError(
        ErrorCode.FORBIDDEN,
        '凭据缺少 read 读取能力。',
        403
      );
    }

    if (minimumRole !== 'observer') {
      const hasWrite = caps.includes('write') || caps.includes('admin');
      if (!hasWrite) {
        throw new DetunedError(
          ErrorCode.FORBIDDEN,
          '凭据缺少 write 写入能力。',
          403
        );
      }
    }

    return {
      actor: auth.actor,
      credential: auth.credential,
      membership,
      spaceRole: membership.role,
    };
  }
}
