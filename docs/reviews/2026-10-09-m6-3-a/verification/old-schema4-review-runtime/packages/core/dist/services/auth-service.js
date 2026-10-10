import { DetunedError, ErrorCode, } from '@detuned/protocol';
import { WriteRateLimiter } from './write-rate-limiter.js';
export class AuthService {
    storage;
    hasher;
    clock;
    writeRateLimiter;
    constructor(storage, hasher, clock, writeRateLimiter = new WriteRateLimiter(clock)) {
        this.storage = storage;
        this.hasher = hasher;
        this.clock = clock;
        this.writeRateLimiter = writeRateLimiter;
    }
    authenticateToken(rawToken) {
        if (!rawToken || typeof rawToken !== 'string') {
            throw new DetunedError(ErrorCode.UNAUTHENTICATED, '缺少或无效的 Authorization Token。', 401);
        }
        const tokenHash = this.hasher.sha256(rawToken.trim());
        const cred = this.storage.findCredentialByTokenHash(tokenHash);
        if (!cred) {
            throw new DetunedError(ErrorCode.UNAUTHENTICATED, '凭据不存在或已失效。', 401);
        }
        const nowIso = this.clock.nowIso();
        if (cred.revoked_at) {
            throw new DetunedError(ErrorCode.UNAUTHENTICATED, '凭据已被撤销。', 401);
        }
        if (cred.expires_at && cred.expires_at < nowIso) {
            throw new DetunedError(ErrorCode.UNAUTHENTICATED, '凭据已过期。', 401);
        }
        const actor = this.storage.findActorById(cred.actor_id);
        if (!actor || actor.disabled_at) {
            throw new DetunedError(ErrorCode.UNAUTHENTICATED, '身份不存在或已被禁用。', 401);
        }
        return { actor, credential: cred };
    }
    /** Reload persisted identity and credential before an asynchronous operation commits. */
    refreshContext(auth) {
        const credential = this.storage.findCredentialById(auth.credential.id);
        const actor = this.storage.findActorById(auth.actor.id);
        if (!credential || credential.actor_id !== auth.actor.id || !actor || actor.disabled_at || credential.revoked_at ||
            (credential.expires_at && credential.expires_at < this.clock.nowIso())) {
            throw new DetunedError(ErrorCode.UNAUTHENTICATED, '身份或凭据已失效。', 401);
        }
        return { actor, credential };
    }
    getMe(auth) {
        const current = this.refreshContext(auth);
        const visible = this.storage.listVisibleSpaces(current.actor.id, 100, undefined, current.credential.allowed_space_ids);
        return { actor: current.actor, capabilities: current.credential.capabilities, allowed_space_ids: current.credential.allowed_space_ids,
            visible_spaces: visible.spaces.map(space => ({ id: space.id, slug: space.slug, role: this.storage.getMembership(space.id, current.actor.id)?.role ?? 'none' })) };
    }
    requireInstanceAdmin(auth) {
        if (!auth.credential.capabilities.includes('admin')) {
            throw new DetunedError(ErrorCode.FORBIDDEN, '需要实例管理员权限。', 403);
        }
    }
    requireSpaceAccess(auth, spaceId, minimumRole = 'observer', operation) {
        // 1. Verify space exists
        const space = this.storage.findSpaceById(spaceId);
        if (!space) {
            throw new DetunedError(ErrorCode.NOT_FOUND, '空间不存在或无权访问。', 404);
        }
        // 2. Verify credential allows this space
        const allowed = auth.credential.allowed_space_ids.includes('*') ||
            auth.credential.allowed_space_ids.includes(spaceId);
        if (!allowed) {
            // Do not leak existence to unauthorized caller
            throw new DetunedError(ErrorCode.NOT_FOUND, '空间不存在或无权访问。', 404);
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
            throw new DetunedError(ErrorCode.NOT_FOUND, '空间不存在或无权访问。', 404);
        }
        // 4. Verify role hierarchy
        const roleLevels = {
            observer: 1,
            contributor: 2,
            maintainer: 3,
            owner: 4,
        };
        if (roleLevels[membership.role] < roleLevels[minimumRole]) {
            throw new DetunedError(ErrorCode.FORBIDDEN, `该操作需要 ${minimumRole} 或更高角色权限。`, 403);
        }
        // 5. Verify credential capabilities (read requires read/admin, write requires write/admin)
        const caps = auth.credential.capabilities;
        if (!caps || caps.length === 0) {
            throw new DetunedError(ErrorCode.FORBIDDEN, '凭据没有任何 capability 权限。', 403);
        }
        const hasRead = caps.includes('read') || caps.includes('admin');
        if (!hasRead) {
            throw new DetunedError(ErrorCode.FORBIDDEN, '凭据缺少 read 读取能力。', 403);
        }
        if ((operation ?? (minimumRole === 'observer' ? 'read' : 'write')) === 'write') {
            const hasWrite = caps.includes('write') || caps.includes('admin');
            if (!hasWrite) {
                throw new DetunedError(ErrorCode.FORBIDDEN, '凭据缺少 write 写入能力。', 403);
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
//# sourceMappingURL=auth-service.js.map