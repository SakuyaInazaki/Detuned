import { DetunedError, ErrorCode, Space, SpaceRevision, Thread, Post, PostRevision, Relation, RelationResolution } from '@detuned/protocol';
import { StoragePort, IdempotencyRecord } from '../ports/storage.js';
import { HasherPort } from '../ports/hasher.js';
import { ClockPort } from '../ports/clock.js';
import { isDeepStrictEqual as equal } from 'node:util';

export type NestedRelationRef = {
  id: string;
  version: number;
  state: 'open' | 'resolved';
};

export type IdempotencyResultRef =
  | {
      v: 1;
      kind: 'space';
      space_id: string;
      revision: number;
    }
  | {
      v: 1;
      kind: 'thread.create';
      thread_id: string;
      thread_version: number;
      initial_post_id?: string;
      initial_post_revision?: number;
      relation_ids?: string[];
      relations?: NestedRelationRef[];
    }
  | {
      v: 1;
      kind: 'thread.patch';
      thread_id: string;
      thread_version: number;
    }
  | {
      v: 1;
      kind: 'post';
      post_id: string;
      revision: number;
      relation_ids?: string[];
      relations?: NestedRelationRef[];
    }
  | {
      v: 1;
      kind: 'post.withdraw';
      post_id: string;
    }
  | {
      v: 1;
      kind: 'relation.create';
      relation_id: string;
      relation_version: number;
      relation_state: 'open' | 'resolved';
    }
  | {
      v: 1;
      kind: 'relation.resolve' | 'relation.reopen';
      relation_id: string;
      relation_version: number;
      relation_state: 'open' | 'resolved';
      resolution_id: string;
    }
  | {
      v: 1;
      kind: 'admin.redaction';
      redaction_id: string;
    }
  | {
      v: 1;
      kind: 'unreplayable';
      op: string;
      reason: string;
    };

export type OperationFamily =
  | 'space.create'
  | 'space.patch'
  | 'thread.create'
  | 'thread.patch'
  | 'post.create'
  | 'post.revision'
  | 'post.withdraw'
  | 'relation.create'
  | 'relation.resolve'
  | 'relation.reopen'
  | 'admin.redaction';

export interface ParsedOperation {
  family: OperationFamily;
  expectedKind: IdempotencyResultRef['kind'];
  targetId?: string;
}

export function parseOperation(operation: string): ParsedOperation {
  if (typeof operation !== 'string' || !operation.trim()) {
    throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '操作标识为空或无效。', 422);
  }

  if (operation === 'space.create') {
    return { family: 'space.create', expectedKind: 'space' };
  }
  if (operation === 'space.patch') {
    return { family: 'space.patch', expectedKind: 'space' };
  }
  if (operation.startsWith('space.patch:')) {
    const targetId = operation.slice('space.patch:'.length).trim();
    if (!targetId) throw new DetunedError(ErrorCode.RESYNC_REQUIRED, 'space.patch 缺少目标 ID。', 422);
    return { family: 'space.patch', expectedKind: 'space', targetId };
  }
  if (operation === 'thread.create') {
    return { family: 'thread.create', expectedKind: 'thread.create' };
  }
  if (operation.startsWith('thread.patch:')) {
    const targetId = operation.slice('thread.patch:'.length).trim();
    if (!targetId) throw new DetunedError(ErrorCode.RESYNC_REQUIRED, 'thread.patch 缺少目标 ID。', 422);
    return { family: 'thread.patch', expectedKind: 'thread.patch', targetId };
  }
  if (operation.startsWith('post.create:')) {
    const targetId = operation.slice('post.create:'.length).trim();
    if (!targetId) throw new DetunedError(ErrorCode.RESYNC_REQUIRED, 'post.create 缺少目标 thread_id。', 422);
    return { family: 'post.create', expectedKind: 'post', targetId };
  }
  if (operation.startsWith('post.revision:')) {
    const targetId = operation.slice('post.revision:'.length).trim();
    if (!targetId) throw new DetunedError(ErrorCode.RESYNC_REQUIRED, 'post.revision 缺少目标 post_id。', 422);
    return { family: 'post.revision', expectedKind: 'post', targetId };
  }
  if (operation.startsWith('post.withdraw:')) {
    const targetId = operation.slice('post.withdraw:'.length).trim();
    if (!targetId) throw new DetunedError(ErrorCode.RESYNC_REQUIRED, 'post.withdraw 缺少目标 post_id。', 422);
    return { family: 'post.withdraw', expectedKind: 'post.withdraw', targetId };
  }
  if (operation === 'relation.create') {
    return { family: 'relation.create', expectedKind: 'relation.create' };
  }
  if (operation.startsWith('relation.resolve:')) {
    const targetId = operation.slice('relation.resolve:'.length).trim();
    if (!targetId) throw new DetunedError(ErrorCode.RESYNC_REQUIRED, 'relation.resolve 缺少目标 relation_id。', 422);
    return { family: 'relation.resolve', expectedKind: 'relation.resolve', targetId };
  }
  if (operation.startsWith('relation.reopen:')) {
    const targetId = operation.slice('relation.reopen:'.length).trim();
    if (!targetId) throw new DetunedError(ErrorCode.RESYNC_REQUIRED, 'relation.reopen 缺少目标 relation_id。', 422);
    return { family: 'relation.reopen', expectedKind: 'relation.reopen', targetId };
  }
  if (operation === 'admin.redaction') {
    return { family: 'admin.redaction', expectedKind: 'admin.redaction' };
  }
  if (operation.startsWith('admin.redaction:')) {
    const targetId = operation.slice('admin.redaction:'.length).trim();
    return { family: 'admin.redaction', expectedKind: 'admin.redaction', targetId };
  }

  throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `未注册的写操作类型或格式不合法: ${operation}`, 422);
}

export function getExpectedKindForOperation(operation: string): string | null {
  try {
    return parseOperation(operation).expectedKind;
  } catch {
    return null;
  }
}

export function hasForbiddenContent(val: unknown, depth = 0): boolean {
  if (depth > 10 || !val || typeof val !== 'object') return false;
  if (Array.isArray(val)) {
    return val.some((item) => hasForbiddenContent(item, depth + 1));
  }
  const obj = val as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (key === 'body' || key === 'summary' || key === 'tags') {
      return true;
    }
    if (hasForbiddenContent(obj[key], depth + 1)) {
      return true;
    }
  }
  return false;
}

export const REGISTERED_UNREPLAYABLE_REASONS = [
  'historical_relation_version_unrecoverable',
  'historical_thread_version_unrecoverable',
] as const;
export type RegisteredUnreplayableReason = (typeof REGISTERED_UNREPLAYABLE_REASONS)[number];

export const allowedKeysByKind: Record<string, string[]> = {
  space: ['v', 'kind', 'space_id', 'revision'],
  'thread.create': ['v', 'kind', 'thread_id', 'thread_version', 'initial_post_id', 'initial_post_revision', 'relation_ids', 'relations'],
  'thread.patch': ['v', 'kind', 'thread_id', 'thread_version'],
  post: ['v', 'kind', 'post_id', 'revision', 'relation_ids', 'relations'],
  'post.withdraw': ['v', 'kind', 'post_id'],
  'relation.create': ['v', 'kind', 'relation_id', 'relation_version', 'relation_state'],
  'relation.resolve': ['v', 'kind', 'relation_id', 'relation_version', 'relation_state', 'resolution_id'],
  'relation.reopen': ['v', 'kind', 'relation_id', 'relation_version', 'relation_state', 'resolution_id'],
  'admin.redaction': ['v', 'kind', 'redaction_id'],
  unreplayable: ['v', 'kind', 'op', 'reason'],
};

export function parseAndValidateLegacyRevision(
  value: unknown,
  fieldName: string
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 不合法 (null)。`, 422);
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 不合法 (必须为正整数)。`, 422);
    }
    return value;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const revObj = value as Record<string, any>;
    if ('revision' in revObj) {
      const inner = revObj.revision;
      if (typeof inner !== 'number' || !Number.isSafeInteger(inner) || inner < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName}.revision 不合法。`, 422);
      }
      return inner;
    }
    throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 缺少 revision 字段。`, 422);
  }
  throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 不合法。`, 422);
}

export function resolveLegacyRevision(
  topRevVal: unknown,
  nestedRevVal: unknown,
  entityName: string
): number | undefined {
  const topRev = parseAndValidateLegacyRevision(topRevVal, `${entityName} 顶层修订版本`);
  const nestedRev = parseAndValidateLegacyRevision(nestedRevVal, `${entityName} 修订版本`);

  if (topRev !== undefined && nestedRev !== undefined) {
    if (topRev !== nestedRev) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${entityName} 修订版本别名冲突 (${topRev} vs ${nestedRev})。`, 422);
    }
    return topRev;
  }
  return topRev ?? nestedRev;
}

export function parseAndValidateVersion(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 不合法。`, 422);
  }
  return value;
}

export function parseAndValidateState(value: unknown, fieldName: string): 'open' | 'resolved' | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== 'open' && value !== 'resolved') {
    throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 不合法。`, 422);
  }
  return value;
}

export function validateLegacyRelationIds(value: unknown, fieldName: string): string[] {
  if (value === null || !Array.isArray(value)) {
    throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 必须为数组。`, 422);
  }
  const seen = new Set<string>();
  for (const id of value) {
    if (typeof id !== 'string' || !id.trim()) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 包含无效 ID。`, 422);
    }
    if (seen.has(id)) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 包含重复 ID: ${id}。`, 422);
    }
    seen.add(id);
  }
  return value;
}

export interface NormalizedLegacyRelation {
  id: string;
  version?: number;
  state?: 'open' | 'resolved';
}

export function validateLegacyRelations(value: unknown, fieldName: string): NormalizedLegacyRelation[] {
  if (value === null || !Array.isArray(value)) {
    throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 必须为数组。`, 422);
  }
  const seen = new Set<string>();
  const normalized: NormalizedLegacyRelation[] = [];
  for (const r of value) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 元素非对象。`, 422);
    }
    if (typeof r.id !== 'string' || !r.id.trim()) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 元素缺少 id。`, 422);
    }
    if (seen.has(r.id)) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 包含重复 ID: ${r.id}。`, 422);
    }
    seen.add(r.id);

    let state: 'open' | 'resolved' | undefined;
    const hasState = 'state' in r && r.state !== undefined;
    const hasRelState = 'relation_state' in r && r.relation_state !== undefined;
    if (hasState) {
      if (r.state !== 'open' && r.state !== 'resolved') {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 包含非法 state。`, 422);
      }
      state = r.state;
    }
    if (hasRelState) {
      if (r.relation_state !== 'open' && r.relation_state !== 'resolved') {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 包含非法 relation_state。`, 422);
      }
      if (state !== undefined && state !== r.relation_state) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} state 与 relation_state 冲突。`, 422);
      }
      state = r.relation_state;
    }

    let version: number | undefined;
    const hasVersion = 'version' in r && r.version !== undefined;
    const hasRelVersion = 'relation_version' in r && r.relation_version !== undefined;
    if (hasVersion) {
      if (typeof r.version !== 'number' || !Number.isSafeInteger(r.version) || r.version < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 包含非法 version。`, 422);
      }
      version = r.version;
    }
    if (hasRelVersion) {
      if (typeof r.relation_version !== 'number' || !Number.isSafeInteger(r.relation_version) || r.relation_version < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 包含非法 relation_version。`, 422);
      }
      if (version !== undefined && version !== r.relation_version) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} version 与 relation_version 冲突。`, 422);
      }
      version = r.relation_version;
    }

    normalized.push({
      id: r.id,
      version,
      state,
    });
  }
  return normalized;
}

export function resolveArrayAlias<T>(
  topVal: unknown,
  nestedVal: unknown,
  fieldName: string,
  validator: (val: unknown, name: string) => T[]
): { provided: boolean; value?: T[] } {
  const topProvided = topVal !== undefined;
  const nestedProvided = nestedVal !== undefined;
  if (!topProvided && !nestedProvided) {
    return { provided: false };
  }
  const topValidated = topProvided ? validator(topVal, `顶层 ${fieldName}`) : undefined;
  const nestedValidated = nestedProvided ? validator(nestedVal, `嵌套 ${fieldName}`) : undefined;
  if (topProvided && nestedProvided) {
    if (!equal(topValidated, nestedValidated)) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${fieldName} 别名冲突。`, 422);
    }
    return { provided: true, value: topValidated };
  }
  return { provided: true, value: topValidated ?? nestedValidated };
}

export interface ProcessLegacyRelationsResult {
  kind: 'resolved' | 'unreplayable' | 'omitted';
  relation_ids?: string[];
  relations?: NestedRelationRef[];
  unreplayableRef?: IdempotencyResultRef;
}

export function processLegacyRelations(
  storage: StoragePort,
  spaceId: string | undefined,
  postId: string,
  revisionNum: number,
  operation: string,
  relIdsRes: { provided: boolean; value?: string[] },
  relsRes: { provided: boolean; value?: NormalizedLegacyRelation[] }
): ProcessLegacyRelationsResult {
  if (relIdsRes.provided && relsRes.provided) {
    const ids = relIdsRes.value!;
    const rels = relsRes.value!;
    if (ids.length !== rels.length) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '嵌套 relation_ids 与 relations 长度不一致。', 422);
    }
    for (let i = 0; i < ids.length; i++) {
      if (ids[i] !== rels[i]?.id) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '嵌套 relation_ids 与 relations 顺序或内容不一致。', 422);
      }
    }
  }

  validateNestedRelationsKnownFacts(
    storage,
    spaceId,
    postId,
    revisionNum,
    relIdsRes.value,
    relsRes.value
  );

  if (relsRes.provided) {
    const rels = relsRes.value!;
    if (rels.length === 0) {
      return { kind: 'resolved', relation_ids: [], relations: [] };
    }
    const allHaveVersionAndState = rels.every(
      (r) => r.version !== undefined && r.state !== undefined
    );
    if (allHaveVersionAndState) {
      return {
        kind: 'resolved',
        relation_ids: rels.map((r) => r.id),
        relations: rels.map((r) => ({
          id: r.id,
          version: r.version!,
          state: r.state!,
        })),
      };
    } else {
      return {
        kind: 'unreplayable',
        unreplayableRef: {
          v: 1,
          kind: 'unreplayable',
          op: operation,
          reason: 'historical_relation_version_unrecoverable',
        },
      };
    }
  } else if (relIdsRes.provided) {
    if (relIdsRes.value!.length === 0) {
      return { kind: 'resolved', relation_ids: [], relations: [] };
    }
    return {
      kind: 'unreplayable',
      unreplayableRef: {
        v: 1,
        kind: 'unreplayable',
        op: operation,
        reason: 'historical_relation_version_unrecoverable',
      },
    };
  } else if (operation.startsWith('post.create')) {
    return { kind: 'resolved', relation_ids: [], relations: [] };
  } else {
    return { kind: 'omitted' };
  }
}

export function validateNestedRelationsFormat(obj: any, label: string): void {
  if (obj.relation_ids !== undefined) {
    if (!Array.isArray(obj.relation_ids)) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${label}引用 relation_ids 必须为数组。`, 422);
    }
    const seenIds = new Set<string>();
    for (const id of obj.relation_ids) {
      if (typeof id !== 'string' || !id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${label}引用 relation_ids 包含无效 ID。`, 422);
      }
      if (seenIds.has(id)) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${label}引用 relation_ids 包含重复 ID: ${id}。`, 422);
      }
      seenIds.add(id);
    }
  }

  if (obj.relations !== undefined) {
    if (!Array.isArray(obj.relations)) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${label}引用 relations 必须为数组。`, 422);
    }
    const seenIds = new Set<string>();
    for (const r of obj.relations) {
      if (!r || typeof r !== 'object' || Array.isArray(r)) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${label}引用 relations 元素必须为对象。`, 422);
      }
      for (const k of Object.keys(r)) {
        if (k !== 'id' && k !== 'version' && k !== 'state') {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${label}引用 relations 元素包含未允许字段: ${k}。`, 422);
        }
      }
      if (typeof r.id !== 'string' || !r.id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${label}引用 relations 元素缺少 id。`, 422);
      }
      if (typeof r.version !== 'number' || !Number.isSafeInteger(r.version) || r.version < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${label}引用 relations 元素版本不合法。`, 422);
      }
      if (r.state !== 'open' && r.state !== 'resolved') {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${label}引用 relations 元素状态不合法。`, 422);
      }
      if (seenIds.has(r.id)) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${label}引用 relations 包含重复 ID: ${r.id}。`, 422);
      }
      seenIds.add(r.id);
    }
  }

  if (obj.relation_ids !== undefined && obj.relations !== undefined) {
    if (obj.relation_ids.length !== obj.relations.length) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${label}引用 relation_ids 与 relations 长度不一致。`, 422);
    }
    for (let i = 0; i < obj.relation_ids.length; i++) {
      if (obj.relation_ids[i] !== obj.relations[i].id) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `${label}引用 relation_ids 与 relations 顺序或内容不一致。`, 422);
      }
    }
  }
}

export function validateNestedRelationsKnownFacts(
  storage: StoragePort,
  spaceId: string | undefined,
  sourcePostId: string,
  sourceRevision: number,
  relationIds?: string[],
  relations?: Array<{ id: string; version?: number; state?: string } | any>
): void {
  const idsToCheck: string[] = [];
  if (Array.isArray(relationIds)) {
    idsToCheck.push(...relationIds);
  }
  if (Array.isArray(relations)) {
    for (const r of relations) {
      if (r && typeof r === 'object' && typeof r.id === 'string' && !idsToCheck.includes(r.id)) {
        idsToCheck.push(r.id);
      }
    }
  }

  for (const relId of idsToCheck) {
    const rel = storage.findRelationById(relId);
    if (!rel) {
      throw new DetunedError(ErrorCode.NOT_FOUND, `原关联关系已不存在: ${relId}`, 404);
    }
    if (spaceId && spaceId !== 'instance' && rel.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `关联关系所属空间不匹配: ${relId}`, 422);
    }
    if (rel.source_post_id !== sourcePostId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `关联关系源帖子与当前帖子不一致: ${relId}`, 422);
    }
    if (rel.source_revision !== sourceRevision) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `关联关系源帖子修订版本与当前帖子不一致: ${relId}`, 422);
    }
    const targetPost = storage.findPostById(rel.target_post_id);
    if (!targetPost || (spaceId && spaceId !== 'instance' && targetPost.space_id !== spaceId)) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `关联关系目标帖子不存在或跨空间: ${relId}`, 422);
    }
    const targetRev = storage.getPostRevision(rel.target_post_id, rel.target_revision);
    if (!targetRev) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `关联关系目标帖子历史修订不存在: ${relId}`, 422);
    }
  }

  if (Array.isArray(relations)) {
    for (const r of relations) {
      if (!r || typeof r !== 'object') continue;
      const relId = r.id;
      if (typeof relId !== 'string') continue;
      const rel = storage.findRelationById(relId);
      if (!rel) continue;

      const v = r.version !== undefined ? r.version : r.relation_version;
      const s = r.state !== undefined ? r.state : r.relation_state;

      if (v !== undefined) {
        if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 1) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `嵌套关系版本非法: ${relId}。`, 422);
        }
        if (v > rel.version) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `嵌套关系版本超过当前存储版本: ${relId}。`, 422);
        }
      }

      if (v !== undefined && s !== undefined) {
        if (v === 1) {
          const expectedInitialState = rel.type === 'challenges' ? 'open' : 'resolved';
          if (s !== expectedInitialState) {
            throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `嵌套关系历史初始状态与类型不匹配: ${relId}。`, 422);
          }
        } else {
          const resolution = storage.findRelationResolutionByVersion(rel.id, v);
          if (!resolution) {
            throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `嵌套关系历史决议记录不存在，历史状态不可证实: ${relId}。`, 422);
          }
          const expectedState = resolution.action === 'resolve' ? 'resolved' : 'open';
          if (s !== expectedState) {
            throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `嵌套关系历史状态与决议动作不匹配: ${relId}。`, 422);
          }
        }
      }
    }
  }
}

export function validateStoredResultRefPrecheck(
  storage: StoragePort,
  operation: string,
  spaceId: string,
  parsed: any
): void {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用必须为对象。', 422);
  }
  if (parsed.v !== 1) {
    throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用版本必须为 1。', 422);
  }

  const parsedOp = parseOperation(operation);

  if (parsed.kind === 'unreplayable') {
    if (parsed.op && parsed.op !== operation && parsed.op !== parsedOp.family) {
      throw new DetunedError(
        ErrorCode.RESYNC_REQUIRED,
        `不可重放引用的 op (${parsed.op}) 与当前操作 (${operation}) 不匹配。`,
        422
      );
    }
    if (parsed.op && parsed.op.includes(':') && parsed.op !== operation) {
      throw new DetunedError(
        ErrorCode.RESYNC_REQUIRED,
        `不可重放引用的目标 ID 与当前操作目标不匹配 (ref.op=${parsed.op}, op=${operation})。`,
        422
      );
    }
    if (!REGISTERED_UNREPLAYABLE_REASONS.includes(parsed.reason as any)) {
      throw new DetunedError(
        ErrorCode.RESYNC_REQUIRED,
        `不可重放引用的 reason (${parsed.reason}) 未注册。`,
        422
      );
    }
    return;
  }

  if (parsed.kind !== parsedOp.expectedKind) {
    throw new DetunedError(
      ErrorCode.RESYNC_REQUIRED,
      `幂等引用类型不匹配: 操作 ${operation} 期望 kind=${parsedOp.expectedKind}，实际为 kind=${parsed.kind}。`,
      422
    );
  }

  // Target ID binding check
  if (parsedOp.targetId) {
    if (parsed.kind === 'thread.patch' && parsed.thread_id !== parsedOp.targetId) {
      throw new DetunedError(
        ErrorCode.RESYNC_REQUIRED,
        `已存在的 v1 幂等引用目标与操作不匹配 (op=${operation}): 期望 thread_id=${parsedOp.targetId}, 实际 thread_id=${parsed.thread_id}`,
        422
      );
    }
    if (parsed.kind === 'post' && parsedOp.family === 'post.revision' && parsed.post_id !== parsedOp.targetId) {
      throw new DetunedError(
        ErrorCode.RESYNC_REQUIRED,
        `已存在的 v1 幂等引用目标与操作不匹配 (op=${operation}): 期望 post_id=${parsedOp.targetId}, 实际 post_id=${parsed.post_id}`,
        422
      );
    }
    if (parsed.kind === 'post.withdraw' && parsed.post_id !== parsedOp.targetId) {
      throw new DetunedError(
        ErrorCode.RESYNC_REQUIRED,
        `已存在的 v1 幂等引用目标与操作不匹配 (op=${operation}): 期望 post_id=${parsedOp.targetId}, 实际 post_id=${parsed.post_id}`,
        422
      );
    }
    if (
      (parsed.kind === 'relation.resolve' || parsed.kind === 'relation.reopen') &&
      parsed.relation_id !== parsedOp.targetId
    ) {
      throw new DetunedError(
        ErrorCode.RESYNC_REQUIRED,
        `已存在的 v1 幂等引用目标与操作不匹配 (op=${operation}): 期望 relation_id=${parsedOp.targetId}, 实际 relation_id=${parsed.relation_id}`,
        422
      );
    }
    if (parsed.kind === 'space' && parsed.space_id !== parsedOp.targetId) {
      throw new DetunedError(
        ErrorCode.RESYNC_REQUIRED,
        `已存在的 v1 幂等引用目标与操作不匹配 (op=${operation}): 期望 space_id=${parsedOp.targetId}, 实际 space_id=${parsed.space_id}`,
        422
      );
    }
  }

  // Allowed keys whitelist check
  const allowed = allowedKeysByKind[parsed.kind];
  if (allowed) {
    for (const k of Object.keys(parsed)) {
      if (!allowed.includes(k)) {
        throw new DetunedError(
          ErrorCode.RESYNC_REQUIRED,
          `已存在的 v1 幂等引用包含未知的额外字段: ${k} (op=${operation})`,
          422
        );
      }
    }
  }

  // Required field checks per kind & entity existence
  switch (parsed.kind) {
    case 'space': {
      if (typeof parsed.space_id !== 'string' || !parsed.space_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '空间引用缺少 space_id。', 422);
      }
      if (typeof parsed.revision !== 'number' || !Number.isSafeInteger(parsed.revision) || parsed.revision < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '空间引用 revision 不合法。', 422);
      }
      const sp = storage.findSpaceById(parsed.space_id);
      if (!sp) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原空间不存在。', 404);
      }
      break;
    }
    case 'thread.create': {
      if (typeof parsed.thread_id !== 'string' || !parsed.thread_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题创建引用缺少 thread_id。', 422);
      }
      if (typeof parsed.thread_version !== 'number' || !Number.isSafeInteger(parsed.thread_version) || parsed.thread_version < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题创建引用缺少 thread_version 或版本不合法。', 422);
      }
      const hasInitId = parsed.initial_post_id !== undefined;
      const hasInitRev = parsed.initial_post_revision !== undefined;
      if (hasInitId !== hasInitRev) {
        throw new DetunedError(
          ErrorCode.RESYNC_REQUIRED,
          '主题创建引用 initial_post_id 与 initial_post_revision 必须同时存在或同时缺省。',
          422
        );
      }
      if (hasInitId) {
        if (typeof parsed.initial_post_id !== 'string' || !parsed.initial_post_id.trim()) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题创建引用 initial_post_id 不合法。', 422);
        }
        if (typeof parsed.initial_post_revision !== 'number' || !Number.isSafeInteger(parsed.initial_post_revision) || parsed.initial_post_revision < 1) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题创建引用 initial_post_revision 不合法。', 422);
        }
      } else {
        if (parsed.relation_ids !== undefined || parsed.relations !== undefined) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题创建引用缺省 initial_post 时不允许悬空关系集合。', 422);
        }
      }
      validateNestedRelationsFormat(parsed, '主题创建');

      const thread = storage.findThreadById(parsed.thread_id);
      if (!thread) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原主题已不存在。', 404);
      }
      if (spaceId && spaceId !== 'instance' && thread.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题所属空间不匹配。', 422);
      }
      if (hasInitId) {
        const ip = storage.findPostById(parsed.initial_post_id);
        if (!ip) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '原初始帖子已不存在。', 404);
        }
        if (spaceId && spaceId !== 'instance' && ip.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '初始帖子所属空间不匹配。', 422);
        }
        if (ip.thread_id !== thread.id) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '初始帖子所属主题不匹配。', 422);
        }
        const ipRev = storage.getPostRevision(parsed.initial_post_id, parsed.initial_post_revision);
        if (!ipRev) {
          throw new DetunedError(ErrorCode.NOT_FOUND, `原初始帖子修订已不存在 (post_id=${parsed.initial_post_id}, rev=${parsed.initial_post_revision})。`, 404);
        }
        validateNestedRelationsKnownFacts(storage, spaceId, parsed.initial_post_id, parsed.initial_post_revision, parsed.relation_ids, parsed.relations);
      }
      break;
    }
    case 'thread.patch': {
      if (typeof parsed.thread_id !== 'string' || !parsed.thread_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题修改引用缺少 thread_id。', 422);
      }
      if (typeof parsed.thread_version !== 'number' || !Number.isSafeInteger(parsed.thread_version) || parsed.thread_version < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题修改引用缺少 thread_version 或版本不合法。', 422);
      }
      const thread = storage.findThreadById(parsed.thread_id);
      if (!thread) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原主题已不存在。', 404);
      }
      if (spaceId && spaceId !== 'instance' && thread.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题所属空间不匹配。', 422);
      }
      break;
    }
    case 'post': {
      if (typeof parsed.post_id !== 'string' || !parsed.post_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子引用缺少 post_id。', 422);
      }
      if (typeof parsed.revision !== 'number' || !Number.isSafeInteger(parsed.revision) || parsed.revision < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子引用缺少 revision 或 revision 不合法。', 422);
      }
      validateNestedRelationsFormat(parsed, '帖子');

      const post = storage.findPostById(parsed.post_id);
      if (!post) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原帖子已不存在。', 404);
      }
      if (spaceId && spaceId !== 'instance' && post.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子所属空间不匹配。', 422);
      }
      if (parsedOp.family === 'post.create' && parsedOp.targetId && post.thread_id !== parsedOp.targetId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子所属主题与操作目标不匹配。', 422);
      }
      if (parsedOp.family === 'post.revision' && parsedOp.targetId && post.id !== parsedOp.targetId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子目标不匹配。', 422);
      }
      if (parsed.thread_id && parsed.thread_id !== post.thread_id) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子所属主题与输入不匹配。', 422);
      }
      const postRev = storage.getPostRevision(parsed.post_id, parsed.revision);
      if (!postRev) {
        throw new DetunedError(ErrorCode.NOT_FOUND, `原帖子修订已不存在 (post_id=${parsed.post_id}, rev=${parsed.revision})。`, 404);
      }
      validateNestedRelationsKnownFacts(storage, spaceId, parsed.post_id, parsed.revision, parsed.relation_ids, parsed.relations);
      break;
    }
    case 'post.withdraw': {
      if (typeof parsed.post_id !== 'string' || !parsed.post_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子撤回引用缺少 post_id。', 422);
      }
      const post = storage.findPostById(parsed.post_id);
      if (!post) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原帖子已不存在。', 404);
      }
      if (spaceId && spaceId !== 'instance' && post.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子所属空间不匹配。', 422);
      }
      break;
    }
    case 'relation.create': {
      if (typeof parsed.relation_id !== 'string' || !parsed.relation_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系创建引用缺少 relation_id。', 422);
      }
      if (parsed.relation_version !== undefined && (typeof parsed.relation_version !== 'number' || !Number.isSafeInteger(parsed.relation_version) || parsed.relation_version < 1)) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系创建引用 relation_version 不合法。', 422);
      }
      if (parsed.relation_state !== undefined && parsed.relation_state !== 'open' && parsed.relation_state !== 'resolved') {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系创建引用 relation_state 不合法。', 422);
      }
      const rel = storage.findRelationById(parsed.relation_id);
      if (!rel) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原关联关系已不存在。', 404);
      }
      if (spaceId && spaceId !== 'instance' && rel.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关联关系所属空间不匹配。', 422);
      }
      const sourcePost = storage.findPostById(rel.source_post_id);
      if (!sourcePost || (spaceId && spaceId !== 'instance' && sourcePost.space_id !== spaceId)) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关联关系源帖子不存在或跨空间。', 422);
      }
      const sourceRev = storage.getPostRevision(rel.source_post_id, rel.source_revision);
      if (!sourceRev) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关联关系源帖子历史修订不存在。', 422);
      }
      const targetPost = storage.findPostById(rel.target_post_id);
      if (!targetPost || (spaceId && spaceId !== 'instance' && targetPost.space_id !== spaceId)) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关联关系目标帖子不存在或跨空间。', 422);
      }
      const targetRev = storage.getPostRevision(rel.target_post_id, rel.target_revision);
      if (!targetRev) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关联关系目标帖子历史修订不存在。', 422);
      }
      if (parsed.relation_version !== undefined && parsed.relation_version > rel.version) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `关联关系版本超过当前存储版本: ${rel.id}。`, 422);
      }
      if (parsed.relation_version !== undefined && parsed.relation_state !== undefined) {
        if (parsed.relation_version === 1) {
          const expectedInitialState = rel.type === 'challenges' ? 'open' : 'resolved';
          if (parsed.relation_state !== expectedInitialState) {
            throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `关联关系历史初始状态与类型不匹配: ${rel.id}。`, 422);
          }
        } else {
          const resolution = storage.findRelationResolutionByVersion(rel.id, parsed.relation_version);
          if (!resolution) {
            throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `关联关系历史决议记录不存在，历史状态不可证实: ${rel.id}。`, 422);
          }
          const expectedState = resolution.action === 'resolve' ? 'resolved' : 'open';
          if (parsed.relation_state !== expectedState) {
            throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `关联关系历史状态与决议动作不匹配: ${rel.id}。`, 422);
          }
        }
      }
      break;
    }
    case 'relation.resolve':
    case 'relation.reopen': {
      if (typeof parsed.relation_id !== 'string' || !parsed.relation_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议引用缺少 relation_id。', 422);
      }
      if (typeof parsed.resolution_id !== 'string' || !parsed.resolution_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议引用缺少 resolution_id。', 422);
      }
      if (parsed.relation_version !== undefined && (typeof parsed.relation_version !== 'number' || !Number.isSafeInteger(parsed.relation_version) || parsed.relation_version < 1)) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议引用 relation_version 不合法。', 422);
      }
      if (parsed.relation_state !== undefined && parsed.relation_state !== 'open' && parsed.relation_state !== 'resolved') {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议引用 relation_state 不合法。', 422);
      }
      const rel = storage.findRelationById(parsed.relation_id);
      if (!rel) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原关联关系已不存在。', 404);
      }
      if (spaceId && spaceId !== 'instance' && rel.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关联关系所属空间不匹配。', 422);
      }
      const res = storage.findRelationResolutionById(parsed.resolution_id);
      if (!res) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原关联决议已不存在。', 404);
      }
      if (res.relation_id !== rel.id) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关联决议与目标关系不匹配。', 422);
      }
      break;
    }
    case 'admin.redaction': {
      if (typeof parsed.redaction_id !== 'string' || !parsed.redaction_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '脱敏引用缺少 redaction_id。', 422);
      }
      break;
    }
  }
}

export function validateResultRef(operation: string, raw: unknown): IdempotencyResultRef {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new DetunedError(
      ErrorCode.RESYNC_REQUIRED,
      '幂等引用格式损坏，非对象数据。',
      422
    );
  }

  // Deep check for forbidden cached content fields
  if (hasForbiddenContent(raw)) {
    throw new DetunedError(
      ErrorCode.RESYNC_REQUIRED,
      '幂等引用包含非法的正文或摘要缓存。',
      422
    );
  }

  const parsedOp = parseOperation(operation);
  const obj = raw as Record<string, any>;

  // Version must be explicitly 1
  if (obj.v !== 1) {
    throw new DetunedError(
      ErrorCode.RESYNC_REQUIRED,
      `不受支持的幂等引用版本 (v${obj.v ?? 'unknown'})。`,
      422
    );
  }

  const validKinds = [
    'space',
    'thread.create',
    'thread.patch',
    'post',
    'post.withdraw',
    'relation.create',
    'relation.resolve',
    'relation.reopen',
    'admin.redaction',
    'unreplayable',
  ];
  if (!validKinds.includes(obj.kind)) {
    throw new DetunedError(
      ErrorCode.RESYNC_REQUIRED,
      `未知或不受支持的幂等引用 kind: ${obj.kind}。`,
      422
    );
  }

  if (obj.kind === 'unreplayable') {
    const unreplayableAllowed = allowedKeysByKind.unreplayable ?? ['v', 'kind', 'op', 'reason'];
    for (const key of Object.keys(obj)) {
      if (!unreplayableAllowed.includes(key)) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `不可重放引用包含未知的额外字段: ${key}`, 422);
      }
    }
    if (!obj.op || typeof obj.op !== 'string' || !obj.reason || typeof obj.reason !== 'string') {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '不可重放引用缺少 op 或 reason。', 422);
    }
    const isOpMatch = obj.op === operation || (obj.op === parsedOp.family && !parsedOp.targetId);
    if (!isOpMatch) {
      if (obj.op === parsedOp.family) {
        // legacy compatibility when targetId is present: accept legacy family-only marker
      } else {
        throw new DetunedError(
          ErrorCode.RESYNC_REQUIRED,
          `不可重放引用的 op (${obj.op}) 与当前操作 (${operation}) 不匹配。`,
          422
        );
      }
    }
    if (obj.op.includes(':') && obj.op !== operation) {
      throw new DetunedError(
        ErrorCode.RESYNC_REQUIRED,
        `不可重放引用的目标 ID 与当前操作目标不匹配 (ref.op=${obj.op}, op=${operation})。`,
        422
      );
    }
    if (!REGISTERED_UNREPLAYABLE_REASONS.includes(obj.reason as any)) {
      throw new DetunedError(
        ErrorCode.RESYNC_REQUIRED,
        `不可重放引用的 reason (${obj.reason}) 未注册。`,
        422
      );
    }
    return obj as IdempotencyResultRef;
  }

  // Operation-kind binding check
  if (obj.kind !== parsedOp.expectedKind) {
    throw new DetunedError(
      ErrorCode.RESYNC_REQUIRED,
      `幂等引用类型不匹配: 操作 ${operation} 期望 kind=${parsedOp.expectedKind}，实际为 kind=${obj.kind}。`,
      422
    );
  }

  // Extra keys check
  const allowed = allowedKeysByKind[obj.kind];
  if (allowed) {
    for (const key of Object.keys(obj)) {
      if (!allowed.includes(key)) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `幂等引用包含未知的额外字段: ${key}`, 422);
      }
    }
  }

  // Required field checks per kind
  switch (obj.kind) {
    case 'space': {
      if (typeof obj.space_id !== 'string' || !obj.space_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '空间引用缺少 space_id。', 422);
      }
      if (typeof obj.revision !== 'number' || !Number.isSafeInteger(obj.revision) || obj.revision < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '空间引用 revision 不合法。', 422);
      }
      return obj as IdempotencyResultRef;
    }
    case 'thread.create': {
      if (typeof obj.thread_id !== 'string' || !obj.thread_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题创建引用缺少 thread_id。', 422);
      }
      if (typeof obj.thread_version !== 'number' || !Number.isSafeInteger(obj.thread_version) || obj.thread_version < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题创建引用缺少 thread_version 或版本不合法。', 422);
      }
      const hasInitId = obj.initial_post_id !== undefined;
      const hasInitRev = obj.initial_post_revision !== undefined;
      if (hasInitId !== hasInitRev) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题创建引用 initial_post_id 与 initial_post_revision 必须同时存在或同时缺省。', 422);
      }
      if (hasInitId) {
        if (typeof obj.initial_post_id !== 'string' || !obj.initial_post_id.trim()) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题创建引用 initial_post_id 不合法。', 422);
        }
        if (typeof obj.initial_post_revision !== 'number' || !Number.isSafeInteger(obj.initial_post_revision) || obj.initial_post_revision < 1) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题创建引用 initial_post_revision 不合法。', 422);
        }
      } else {
        if (obj.relation_ids !== undefined || obj.relations !== undefined) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题创建引用缺省 initial_post 时不允许悬空关系集合。', 422);
        }
      }
      validateNestedRelationsFormat(obj, '主题创建');
      return obj as IdempotencyResultRef;
    }
    case 'thread.patch': {
      if (typeof obj.thread_id !== 'string' || !obj.thread_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题修改引用缺少 thread_id。', 422);
      }
      if (typeof obj.thread_version !== 'number' || !Number.isSafeInteger(obj.thread_version) || obj.thread_version < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题修改引用缺少 thread_version 或版本不合法。', 422);
      }
      return obj as IdempotencyResultRef;
    }
    case 'post': {
      if (typeof obj.post_id !== 'string' || !obj.post_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子引用缺少 post_id。', 422);
      }
      if (typeof obj.revision !== 'number' || !Number.isSafeInteger(obj.revision) || obj.revision < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子引用 revision 不合法。', 422);
      }
      validateNestedRelationsFormat(obj, '帖子');
      return obj as IdempotencyResultRef;
    }
    case 'post.withdraw': {
      if (typeof obj.post_id !== 'string' || !obj.post_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子撤回引用缺少 post_id。', 422);
      }
      return obj as IdempotencyResultRef;
    }
    case 'relation.create': {
      if (typeof obj.relation_id !== 'string' || !obj.relation_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系创建引用缺少 relation_id。', 422);
      }
      if (typeof obj.relation_version !== 'number' || !Number.isSafeInteger(obj.relation_version) || obj.relation_version < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系创建引用缺少 relation_version 或版本不合法。', 422);
      }
      if (obj.relation_state !== 'open' && obj.relation_state !== 'resolved') {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系创建引用 relation_state 不合法。', 422);
      }
      return obj as IdempotencyResultRef;
    }
    case 'relation.resolve':
    case 'relation.reopen': {
      if (typeof obj.relation_id !== 'string' || !obj.relation_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议引用缺少 relation_id。', 422);
      }
      if (typeof obj.relation_version !== 'number' || !Number.isSafeInteger(obj.relation_version) || obj.relation_version < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议引用缺少 relation_version 或版本不合法。', 422);
      }
      if (obj.relation_state !== 'open' && obj.relation_state !== 'resolved') {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议引用 relation_state 不合法。', 422);
      }
      if (typeof obj.resolution_id !== 'string' || !obj.resolution_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议引用缺少 resolution_id。', 422);
      }
      if (obj.kind === 'relation.resolve' && obj.relation_state !== 'resolved') {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, 'relation.resolve 引用状态必须为 resolved。', 422);
      }
      if (obj.kind === 'relation.reopen' && obj.relation_state !== 'open') {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, 'relation.reopen 引用状态必须为 open。', 422);
      }
      return obj as IdempotencyResultRef;
    }
    case 'admin.redaction': {
      if (typeof obj.redaction_id !== 'string' || !obj.redaction_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '脱敏引用缺少 redaction_id。', 422);
      }
      return obj as IdempotencyResultRef;
    }
    default:
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '未知的引用类型。', 422);
  }
}

function validateSemanticsForNestedRelations(
  tx: StoragePort,
  spaceId: string,
  relations?: NestedRelationRef[],
  relationIds?: string[],
  expectedPostId?: string,
  expectedPostRevision?: number
): void {
  if (relationIds && relationIds.length > 0 && (!relations || relations.length === 0)) {
    throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '缺少嵌套关系的快照信息。', 422);
  }
  if (relations && relations.length > 0) {
    for (const r of relations) {
      const rel = tx.findRelationById(r.id);
      if (!rel) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `引用的嵌套关系不存在: ${r.id}。`, 422);
      }
      if (spaceId && spaceId !== 'instance' && rel.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `引用的嵌套关系跨空间: ${r.id}。`, 422);
      }
      if (expectedPostId && rel.source_post_id !== expectedPostId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `嵌套关系所属源帖子与当前帖子不一致: ${r.id}。`, 422);
      }
      if (expectedPostRevision !== undefined && rel.source_revision !== expectedPostRevision) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `嵌套关系所属源帖子修订版本与当前帖子不一致: ${r.id}。`, 422);
      }
      const targetPost = tx.findPostById(rel.target_post_id);
      if (!targetPost || (spaceId && spaceId !== 'instance' && targetPost.space_id !== spaceId)) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `嵌套关系的目标帖子不存在或跨空间: ${r.id}。`, 422);
      }
      const targetRev = tx.getPostRevision(rel.target_post_id, rel.target_revision);
      if (!targetRev) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `嵌套关系的目标帖子历史修订版本不存在: ${r.id}。`, 422);
      }
      if (r.version > rel.version) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `嵌套关系版本超过当前存储版本: ${r.id}。`, 422);
      }
      if (r.version === 1) {
        const expectedInitialState = rel.type === 'challenges' ? 'open' : 'resolved';
        if (r.state !== expectedInitialState) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `嵌套关系历史初始状态与类型不匹配: ${r.id}。`, 422);
        }
      } else {
        const resolution = tx.findRelationResolutionByVersion(rel.id, r.version);
        if (!resolution) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `嵌套关系历史决议记录不存在，历史状态不可证实: ${r.id}。`, 422);
        }
        const expectedState = resolution.action === 'resolve' ? 'resolved' : 'open';
        if (r.state !== expectedState) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `嵌套关系历史状态与决议动作不匹配: ${r.id}。`, 422);
        }
      }
    }
  }
}

export function validateResultRefSemantics(
  tx: StoragePort,
  operation: string,
  spaceId: string,
  ref: IdempotencyResultRef | any
): void {
  if (ref.kind === 'unreplayable') {
    return;
  }

  const parsedOp = parseOperation(operation);

  switch (ref.kind) {
    case 'space': {
      if (parsedOp.family === 'space.create') {
        if (spaceId && spaceId !== 'instance') {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '空间创建幂等引用作用域与目标不一致。', 422);
        }
      } else {
        if (spaceId && spaceId !== 'instance' && ref.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用空间与目标空间不一致。', 422);
        }
      }
      if (parsedOp.targetId && ref.space_id !== parsedOp.targetId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用目标与当前操作目标不一致。', 422);
      }
      const space = tx.findSpaceById(ref.space_id);
      if (!space) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的空间不存在。', 422);
      }
      const revision = tx.getSpaceRevision(ref.space_id, ref.revision);
      if (!revision) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的空间修订版本不存在。', 422);
      }
      break;
    }
    case 'thread.create': {
      const thread = tx.findThreadById(ref.thread_id);
      if (!thread) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的主题不存在。', 422);
      }
      if (spaceId && spaceId !== 'instance' && thread.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用主题与目标空间不一致。', 422);
      }
      const snap = tx.getThreadVersion(ref.thread_id, ref.thread_version);
      if (!snap) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的主题历史版本不存在。', 422);
      }
      if (ref.initial_post_id) {
        const post = tx.findPostById(ref.initial_post_id);
        if (!post) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的初始帖子不存在。', 422);
        }
        if (spaceId && spaceId !== 'instance' && post.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用初始帖子与目标空间不一致。', 422);
        }
        if (post.thread_id !== ref.thread_id) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的初始帖子不属于该主题。', 422);
        }
        const revision = tx.getPostRevision(ref.initial_post_id, ref.initial_post_revision ?? 1);
        if (!revision) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的初始帖子历史修订版本不存在。', 422);
        }
        validateSemanticsForNestedRelations(tx, spaceId, ref.relations, ref.relation_ids, ref.initial_post_id, ref.initial_post_revision ?? 1);
      }
      break;
    }
    case 'thread.patch': {
      if (parsedOp.targetId && ref.thread_id !== parsedOp.targetId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用目标与当前操作目标不一致。', 422);
      }
      const thread = tx.findThreadById(ref.thread_id);
      if (!thread) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的主题不存在。', 422);
      }
      if (spaceId && spaceId !== 'instance' && thread.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用主题与目标空间不一致。', 422);
      }
      const snap = tx.getThreadVersion(ref.thread_id, ref.thread_version);
      if (!snap) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的主题历史版本不存在。', 422);
      }
      break;
    }
    case 'post': {
      if (parsedOp.family === 'post.create' && parsedOp.targetId) {
        const post = tx.findPostById(ref.post_id);
        if (!post) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的帖子不存在。', 422);
        }
        if (post.thread_id !== parsedOp.targetId) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用帖子不属于目标主题。', 422);
        }
      }
      if (parsedOp.family === 'post.revision' && parsedOp.targetId) {
        if (ref.post_id !== parsedOp.targetId) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用目标与当前操作目标不一致。', 422);
        }
      }
      const post = tx.findPostById(ref.post_id);
      if (!post) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的帖子不存在。', 422);
      }
      if (spaceId && spaceId !== 'instance' && post.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用帖子与目标空间不一致。', 422);
      }
      const revision = tx.getPostRevision(ref.post_id, ref.revision);
      if (!revision) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的帖子历史修订版本不存在。', 422);
      }
      validateSemanticsForNestedRelations(tx, spaceId, ref.relations, ref.relation_ids, ref.post_id, ref.revision);
      break;
    }
    case 'post.withdraw': {
      if (parsedOp.targetId && ref.post_id !== parsedOp.targetId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用目标与当前操作目标不一致。', 422);
      }
      const post = tx.findPostById(ref.post_id);
      if (!post) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的帖子不存在。', 422);
      }
      if (spaceId && spaceId !== 'instance' && post.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用帖子与目标空间不一致。', 422);
      }
      break;
    }
    case 'relation.create': {
      const relation = tx.findRelationById(ref.relation_id);
      if (!relation) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的关系不存在。', 422);
      }
      if (spaceId && spaceId !== 'instance' && relation.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用关系与目标空间不一致。', 422);
      }
      if (relation.version < ref.relation_version) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的关系版本不匹配。', 422);
      }
      break;
    }
    case 'relation.resolve':
    case 'relation.reopen': {
      if (parsedOp.targetId && ref.relation_id !== parsedOp.targetId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用目标与当前操作目标不一致。', 422);
      }
      const relation = tx.findRelationById(ref.relation_id);
      if (!relation) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的关系不存在。', 422);
      }
      if (spaceId && spaceId !== 'instance' && relation.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用关系与目标空间不一致。', 422);
      }
      const resolution = tx.findRelationResolutionById(ref.resolution_id);
      if (!resolution) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '引用的关系决议记录不存在。', 422);
      }
      if (resolution.relation_id !== relation.id) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议记录与目标关系不一致。', 422);
      }
      if (resolution.version !== ref.relation_version) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议版本与引用关系版本不匹配。', 422);
      }
      const expectedAction = ref.kind === 'relation.resolve' ? 'resolve' : 'reopen';
      if (resolution.action !== expectedAction) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议动作与引用类型不匹配。', 422);
      }
      break;
    }
    case 'admin.redaction': {
      if (!ref.redaction_id || typeof ref.redaction_id !== 'string') {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '脱敏引用缺少 redaction_id。', 422);
      }
      break;
    }
    default:
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '未知的引用类型。', 422);
  }
}

export function extractResultRef(operation: string, result: any): string {
  if (!result || typeof result !== 'object') {
    throw new DetunedError(
      ErrorCode.VALIDATION_ERROR,
      `操作 ${operation} 的返回值非法，无法生成幂等引用。`,
      400
    );
  }

  const parsedOp = parseOperation(operation);
  let ref: IdempotencyResultRef;

  switch (parsedOp.family) {
    case 'space.create':
    case 'space.patch': {
      if (
        !result.space ||
        typeof result.space !== 'object' ||
        typeof result.space.id !== 'string' ||
        !result.space.id.trim() ||
        result.revision === undefined ||
        result.revision === null
      ) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '空间操作返回形态不正确。', 400);
      }
      const revNum = typeof result.revision === 'number' ? result.revision : result.revision?.revision;
      if (typeof revNum !== 'number' || !Number.isSafeInteger(revNum) || revNum < 1) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '空间操作修订版本不合法。', 400);
      }
      ref = {
        v: 1,
        kind: 'space',
        space_id: result.space.id,
        revision: revNum,
      };
      break;
    }
    case 'thread.create': {
      if (
        !result.thread ||
        typeof result.thread !== 'object' ||
        typeof result.thread.id !== 'string' ||
        !result.thread.id.trim()
      ) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '主题创建操作返回形态不正确。', 400);
      }
      const tv = result.thread.version;
      if (typeof tv !== 'number' || !Number.isSafeInteger(tv) || tv < 1) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '主题创建版本不合法。', 400);
      }
      const tRef: any = {
        v: 1,
        kind: 'thread.create',
        thread_id: result.thread.id,
        thread_version: tv,
      };

      if ('initial_post' in result && result.initial_post !== undefined) {
        if (!result.initial_post || typeof result.initial_post !== 'object' || Array.isArray(result.initial_post)) {
          throw new DetunedError(ErrorCode.VALIDATION_ERROR, '初始帖子形态不正确。', 400);
        }
        if (
          !result.initial_post.post ||
          typeof result.initial_post.post !== 'object' ||
          Array.isArray(result.initial_post.post) ||
          typeof result.initial_post.post.id !== 'string' ||
          !result.initial_post.post.id.trim()
        ) {
          throw new DetunedError(ErrorCode.VALIDATION_ERROR, '初始帖子 post_id 不合法。', 400);
        }
        tRef.initial_post_id = result.initial_post.post.id;
        const ipRev =
          result.initial_post.revision?.revision ??
          (typeof result.initial_post.revision === 'number' ? result.initial_post.revision : undefined);
        if (typeof ipRev !== 'number' || !Number.isSafeInteger(ipRev) || ipRev < 1) {
          throw new DetunedError(ErrorCode.VALIDATION_ERROR, '初始帖子修订版本不合法。', 400);
        }
        tRef.initial_post_revision = ipRev;

        if ('relations' in result.initial_post && result.initial_post.relations !== undefined) {
          if (!Array.isArray(result.initial_post.relations)) {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '初始帖子 relations 必须为数组。', 400);
          }
          tRef.relation_ids = result.initial_post.relations.map((r: any) => {
            if (!r || typeof r.id !== 'string' || !r.id.trim()) {
              throw new DetunedError(ErrorCode.VALIDATION_ERROR, '嵌套关系缺少合法 ID。', 400);
            }
            return r.id;
          });
          if (result.initial_post.relations.length > 0) {
            tRef.relations = result.initial_post.relations.map((r: any) => {
              if (!r || typeof r !== 'object' || Array.isArray(r)) {
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, '嵌套关系元素非对象。', 400);
              }
              if (typeof r.version !== 'number' || !Number.isSafeInteger(r.version) || r.version < 1) {
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, '嵌套关系版本不合法。', 400);
              }
              if (r.state !== 'open' && r.state !== 'resolved') {
                throw new DetunedError(ErrorCode.VALIDATION_ERROR, '嵌套关系状态不合法。', 400);
              }
              return {
                id: r.id,
                version: r.version,
                state: r.state,
              };
            });
          }
        }
      }

      ref = tRef;
      break;
    }
    case 'thread.patch': {
      const threadId = result.id ?? result.thread?.id;
      const version = result.version ?? result.thread?.version;
      if (
        !threadId ||
        typeof threadId !== 'string' ||
        !threadId.trim() ||
        typeof version !== 'number' ||
        !Number.isSafeInteger(version) ||
        version < 1
      ) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '主题修改操作返回形态不正确。', 400);
      }
      ref = {
        v: 1,
        kind: 'thread.patch',
        thread_id: threadId,
        thread_version: version,
      };
      break;
    }
    case 'post.create':
    case 'post.revision': {
      if (
        !result.post ||
        typeof result.post !== 'object' ||
        typeof result.post.id !== 'string' ||
        !result.post.id.trim() ||
        result.revision === undefined ||
        result.revision === null
      ) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '帖子写操作返回形态不正确。', 400);
      }
      const revNum = typeof result.revision === 'number' ? result.revision : result.revision?.revision;
      if (typeof revNum !== 'number' || !Number.isSafeInteger(revNum) || revNum < 1) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '帖子修订版本不合法。', 400);
      }
      const pRef: any = {
        v: 1,
        kind: 'post',
        post_id: result.post.id,
        revision: revNum,
      };
      if ('relations' in result && result.relations !== undefined) {
        if (!Array.isArray(result.relations)) {
          throw new DetunedError(ErrorCode.VALIDATION_ERROR, '帖子 relations 必须为数组。', 400);
        }
        pRef.relation_ids = result.relations.map((r: any) => {
          if (!r || typeof r.id !== 'string' || !r.id.trim()) {
            throw new DetunedError(ErrorCode.VALIDATION_ERROR, '嵌套关系缺少合法 ID。', 400);
          }
          return r.id;
        });
        if (result.relations.length > 0) {
          pRef.relations = result.relations.map((r: any) => {
            if (!r || typeof r !== 'object' || Array.isArray(r)) {
              throw new DetunedError(ErrorCode.VALIDATION_ERROR, '嵌套关系元素非对象。', 400);
            }
            if (typeof r.version !== 'number' || !Number.isSafeInteger(r.version) || r.version < 1) {
              throw new DetunedError(ErrorCode.VALIDATION_ERROR, '嵌套关系版本不合法。', 400);
            }
            if (r.state !== 'open' && r.state !== 'resolved') {
              throw new DetunedError(ErrorCode.VALIDATION_ERROR, '嵌套关系状态不合法。', 400);
            }
            return {
              id: r.id,
              version: r.version,
              state: r.state,
            };
          });
        }
      }
      ref = pRef;
      break;
    }
    case 'post.withdraw': {
      const postId = result.id ?? result.post?.id;
      if (!postId || typeof postId !== 'string' || !postId.trim()) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '帖子撤回操作返回形态不正确。', 400);
      }
      ref = {
        v: 1,
        kind: 'post.withdraw',
        post_id: postId,
      };
      break;
    }
    case 'relation.create': {
      const rel = result.relation ?? result;
      const relId = rel?.id;
      if (!relId || typeof relId !== 'string' || !relId.trim()) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '关系创建操作返回形态不正确。', 400);
      }
      if (typeof rel.version !== 'number' || !Number.isSafeInteger(rel.version) || rel.version < 1) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '关系创建返回版本不合法。', 400);
      }
      if (rel.state !== 'open' && rel.state !== 'resolved') {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '关系创建返回状态不合法。', 400);
      }
      ref = {
        v: 1,
        kind: 'relation.create',
        relation_id: relId,
        relation_version: rel.version,
        relation_state: rel.state,
      };
      break;
    }
    case 'relation.resolve':
    case 'relation.reopen': {
      if (!result.relation?.id || !result.resolution?.id) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '关系决议操作返回形态不正确。', 400);
      }
      if (
        typeof result.relation.version !== 'number' ||
        !Number.isSafeInteger(result.relation.version) ||
        result.relation.version < 1
      ) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '关系决议返回版本不合法。', 400);
      }
      if (result.resolution.action !== 'resolve' && result.resolution.action !== 'reopen') {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '关系决议返回动作不合法。', 400);
      }
      const action = result.resolution.action === 'reopen' ? 'relation.reopen' : 'relation.resolve';
      const state = result.resolution.action === 'resolve' ? 'resolved' : 'open';
      if (result.relation.state !== state) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '关系决议返回状态与动作不匹配。', 400);
      }
      ref = {
        v: 1,
        kind: action,
        relation_id: result.relation.id,
        relation_version: result.relation.version,
        relation_state: state,
        resolution_id: result.resolution.id,
      };
      break;
    }
    case 'admin.redaction': {
      if (!result.redaction_id || typeof result.redaction_id !== 'string' || !result.redaction_id.trim()) {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '脱敏操作返回形态不正确。', 400);
      }
      ref = {
        v: 1,
        kind: 'admin.redaction',
        redaction_id: result.redaction_id,
      };
      break;
    }
    default: {
      const _exhaustive: never = parsedOp.family;
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        `未注册的写操作类型，拒绝任意对象序列化: ${_exhaustive}`,
        400
      );
    }
  }

  validateResultRef(operation, ref);
  return JSON.stringify(ref);
}

export const encodeResult = extractResultRef;

export function normalizeLegacyResultRef(
  tx: StoragePort,
  operation: string,
  parsed: any,
  spaceId?: string
): IdempotencyResultRef {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史幂等记录非对象。', 422);
  }

  // Cross-space verification if spaceId is provided
  if (spaceId && spaceId !== 'instance') {
    if (parsed.space_id && parsed.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史幂等记录空间与目标空间不匹配。', 422);
    }
    if (parsed.thread?.space_id && parsed.thread.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题所属空间不匹配。', 422);
    }
    if (parsed.post?.space_id && parsed.post.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史帖子所属空间不匹配。', 422);
    }
    if (parsed.relation?.space_id && parsed.relation.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史关系所属空间不匹配。', 422);
    }
  }

  // 1. Space
  if (
    (operation.startsWith('space.create') || operation.startsWith('space.patch')) &&
    (parsed.kind === 'space' || parsed.$ref === 'space' || (parsed.space && parsed.space.id))
  ) {
    const targetSpaceId = parsed.space_id ?? parsed.space?.id;
    if (!targetSpaceId || typeof targetSpaceId !== 'string') {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '空间引用缺少 space_id。', 422);
    }
    const rawRev = parsed.revision ?? parsed.space?.current_revision;
    if (rawRev !== undefined) {
      const r = typeof rawRev === 'object' && rawRev !== null ? rawRev.revision : rawRev;
      if (typeof r !== 'number' || !Number.isSafeInteger(r) || r < 1) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '空间引用 revision 不合法。', 422);
      }
    }
    const revNum =
      (typeof rawRev === 'object' && rawRev !== null ? rawRev.revision : rawRev) ?? 1;
    const ref: IdempotencyResultRef = {
      v: 1,
      kind: 'space',
      space_id: targetSpaceId,
      revision: typeof revNum === 'number' ? revNum : 1,
    };
    return validateResultRef(operation, ref);
  }

  // 2. Thread create
  if (
    operation === 'thread.create' &&
    (parsed.kind === 'thread.create' ||
      parsed.$ref === 'thread' ||
      (parsed.thread && parsed.thread.id) ||
      (parsed.id && (parsed.space_id || parsed.title)))
  ) {
    const threadId = parsed.thread_id ?? parsed.thread?.id ?? parsed.id;
    if (!threadId || typeof threadId !== 'string') {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题引用缺少 thread_id。', 422);
    }
    const thread = tx.findThreadById(threadId);
    if (!thread) {
      throw new DetunedError(ErrorCode.NOT_FOUND, '原主题已不存在。', 404);
    }
    if (spaceId && spaceId !== 'instance' && thread.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题所属空间不匹配。', 422);
    }
    const v1 = parseAndValidateVersion(parsed.thread_version, 'thread_version');
    const v2 = parseAndValidateVersion(parsed.version, 'version');
    const v3 = parseAndValidateVersion(parsed.thread?.version, 'thread.version');
    if (v1 !== undefined && v2 !== undefined && v1 !== v2) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题版本别名冲突。', 422);
    }
    const rawVersion = v1 ?? v2 ?? v3;
    const targetVersion = rawVersion ?? 1;

    const cAt = parsed.thread?.created_at ?? parsed.created_at;
    const uAt = parsed.thread?.updated_at ?? parsed.updated_at;
    if (targetVersion === 1) {
      if (cAt && uAt && cAt !== uAt) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题版本创建时间与更新时间冲突。', 422);
      }
      if (cAt && thread.created_at && cAt !== thread.created_at) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题版本创建时间与主题记录冲突。', 422);
      }
      if (uAt && thread.created_at && uAt !== thread.created_at) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题版本更新时间与主题记录冲突。', 422);
      }
    } else if (thread.version === targetVersion) {
      if (uAt && thread.updated_at && uAt !== thread.updated_at) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题版本更新时间与主题记录冲突。', 422);
      }
    }

    const tRef: any = {
      v: 1,
      kind: 'thread.create',
      thread_id: threadId,
      thread_version: targetVersion,
    };

    const hasInitialPost = 'initial_post' in parsed && parsed.initial_post !== undefined;
    const hasInitialPostId = 'initial_post_id' in parsed && parsed.initial_post_id !== undefined;

    let initialPostIdFromObj: string | undefined;
    if (hasInitialPost) {
      if (parsed.initial_post === null || typeof parsed.initial_post !== 'object' || Array.isArray(parsed.initial_post)) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '初始帖子形态不正确。', 422);
      }
      if (parsed.initial_post.post !== undefined) {
        if (parsed.initial_post.post === null || typeof parsed.initial_post.post !== 'object' || Array.isArray(parsed.initial_post.post)) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '初始帖子 post 形态不正确。', 422);
        }
        if (typeof parsed.initial_post.post.id !== 'string' || !parsed.initial_post.post.id.trim()) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '初始帖子 post 缺少 id。', 422);
        }
        initialPostIdFromObj = parsed.initial_post.post.id;
      } else if (parsed.initial_post.id !== undefined) {
        if (typeof parsed.initial_post.id !== 'string' || !parsed.initial_post.id.trim()) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '初始帖子 id 不合法。', 422);
        }
        initialPostIdFromObj = parsed.initial_post.id;
      } else {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '初始帖子缺少 id 或 post。', 422);
      }
    }

    let initialPostIdFromTop: string | undefined;
    if (hasInitialPostId) {
      if (typeof parsed.initial_post_id !== 'string' || !parsed.initial_post_id.trim()) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '初始帖子 initial_post_id 不合法。', 422);
      }
      initialPostIdFromTop = parsed.initial_post_id;
    }

    if (initialPostIdFromObj !== undefined && initialPostIdFromTop !== undefined && initialPostIdFromObj !== initialPostIdFromTop) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '初始帖子 ID 别名冲突。', 422);
    }

    const initialPostId = initialPostIdFromObj ?? initialPostIdFromTop;

    if (!initialPostId) {
      const hasOrphanRevision = ('initial_post_revision' in parsed && parsed.initial_post_revision !== undefined);
      const hasOrphanRelIds = ('relation_ids' in parsed && parsed.relation_ids !== undefined);
      const hasOrphanRels = ('relations' in parsed && parsed.relations !== undefined);
      if (hasOrphanRevision || hasOrphanRelIds || hasOrphanRels) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题创建缺少初始帖子，但包含初始帖子的修订或关系字段。', 422);
      }
    } else {
      tRef.initial_post_id = initialPostId;
      const ip = tx.findPostById(initialPostId);
      if (!ip) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原初始帖子已不存在。', 404);
      }
      if (spaceId && spaceId !== 'instance' && ip.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '初始帖子所属空间不匹配。', 422);
      }
      if (ip.thread_id !== thread.id) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '初始帖子所属主题不匹配。', 422);
      }

      const rev = resolveLegacyRevision(
        parsed.initial_post_revision,
        hasInitialPost ? parsed.initial_post.revision : undefined,
        '初始帖子'
      );
      const initRevNum = rev ?? 1;
      tRef.initial_post_revision = initRevNum;

      const ipRev = tx.getPostRevision(initialPostId, initRevNum);
      if (!ipRev) {
        throw new DetunedError(ErrorCode.NOT_FOUND, `原初始帖子修订已不存在 (post_id=${initialPostId}, rev=${initRevNum})。`, 404);
      }

      const resolvedRelIds = resolveArrayAlias(
        parsed.relation_ids,
        hasInitialPost ? parsed.initial_post.relation_ids : undefined,
        'relation_ids',
        validateLegacyRelationIds
      );

      const resolvedRels = resolveArrayAlias(
        parsed.relations,
        hasInitialPost ? parsed.initial_post.relations : undefined,
        'relations',
        validateLegacyRelations
      );

      const parsedRels = processLegacyRelations(
        tx,
        spaceId,
        initialPostId,
        initRevNum,
        operation,
        resolvedRelIds,
        resolvedRels
      );

      if (parsedRels.kind === 'unreplayable') {
        return validateResultRef(operation, parsedRels.unreplayableRef!);
      } else if (parsedRels.kind === 'resolved') {
        tRef.relation_ids = parsedRels.relation_ids;
        tRef.relations = parsedRels.relations;
      }
    }

    const snap = tx.getThreadVersion(threadId, targetVersion);
    if (!snap) {
      if (thread.version !== targetVersion) {
        return {
          v: 1,
          kind: 'unreplayable',
          op: operation,
          reason: 'historical_thread_version_unrecoverable',
        };
      }
    } else {
      if (targetVersion === 1) {
        if (cAt && snap.created_at !== cAt) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题版本创建时间与快照记录冲突。', 422);
        }
        if (uAt && snap.created_at !== uAt) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题版本更新时间与快照记录冲突。', 422);
        }
      } else {
        if (uAt && snap.created_at !== uAt) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题版本更新时间与快照记录冲突。', 422);
        }
      }
    }

    return validateResultRef(operation, tRef);
  }

  // 3. Thread patch
  if (
    operation.startsWith('thread.patch') &&
    (parsed.kind === 'thread.patch' ||
      parsed.$ref === 'thread' ||
      (parsed.id && (parsed.space_id || parsed.title)))
  ) {
    const threadId = parsed.thread_id ?? parsed.id ?? parsed.thread?.id;
    if (!threadId || typeof threadId !== 'string') {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题修改引用缺少 thread_id。', 422);
    }
    const thread = tx.findThreadById(threadId);
    if (!thread) {
      throw new DetunedError(ErrorCode.NOT_FOUND, '原主题已不存在。', 404);
    }
    if (spaceId && spaceId !== 'instance' && thread.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题所属空间不匹配。', 422);
    }
    const parsedOp = parseOperation(operation);
    if (parsedOp.targetId && thread.id !== parsedOp.targetId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题修改引用目标与操作目标不匹配。', 422);
    }
    const v1 = parseAndValidateVersion(parsed.thread_version, 'thread_version');
    const v2 = parseAndValidateVersion(parsed.version, 'version');
    const v3 = parseAndValidateVersion(parsed.thread?.version, 'thread.version');
    if (v1 !== undefined && v2 !== undefined && v1 !== v2) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '主题版本别名冲突。', 422);
    }
    const rawVersion = v1 ?? v2 ?? v3;
    const targetVersion = rawVersion ?? 1;

    const cAt = parsed.thread?.created_at ?? parsed.created_at;
    const uAt = parsed.thread?.updated_at ?? parsed.updated_at;
    if (targetVersion === 1) {
      if (cAt && uAt && cAt !== uAt) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题版本创建时间与更新时间冲突。', 422);
      }
      if (cAt && thread.created_at && cAt !== thread.created_at) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题版本创建时间与主题记录冲突。', 422);
      }
      if (uAt && thread.created_at && uAt !== thread.created_at) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题版本更新时间与主题记录冲突。', 422);
      }
    } else if (thread.version === targetVersion) {
      if (uAt && thread.updated_at && uAt !== thread.updated_at) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题版本更新时间与主题记录冲突。', 422);
      }
    }

    const snap = tx.getThreadVersion(threadId, targetVersion);
    if (!snap) {
      if (thread.version !== targetVersion) {
        return {
          v: 1,
          kind: 'unreplayable',
          op: operation,
          reason: 'historical_thread_version_unrecoverable',
        };
      }
    } else {
      if (targetVersion === 1) {
        if (cAt && snap.created_at !== cAt) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题版本创建时间与快照记录冲突。', 422);
        }
        if (uAt && snap.created_at !== uAt) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题版本更新时间与快照记录冲突。', 422);
        }
      } else {
        if (uAt && snap.created_at !== uAt) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史主题版本更新时间与快照记录冲突。', 422);
        }
      }
    }
    const ref: IdempotencyResultRef = {
      v: 1,
      kind: 'thread.patch',
      thread_id: threadId,
      thread_version: targetVersion,
    };
    return validateResultRef(operation, ref);
  }

  // 4. Post create & revision
  if (
    (operation.startsWith('post.create') || operation.startsWith('post.revision')) &&
    (parsed.kind === 'post' ||
      parsed.$ref === 'post' ||
      (parsed.post && parsed.post.id) ||
      (parsed.id && parsed.thread_id))
  ) {
    const postId = parsed.post_id ?? parsed.post?.id ?? parsed.id;
    if (!postId || typeof postId !== 'string') {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子引用缺少 post_id。', 422);
    }
    const post = tx.findPostById(postId);
    if (!post) {
      throw new DetunedError(ErrorCode.NOT_FOUND, '原帖子不存在。', 404);
    }
    if (spaceId && spaceId !== 'instance' && post.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子所属空间不匹配。', 422);
    }
    const parsedOp = parseOperation(operation);
    if (parsedOp.family === 'post.create' && parsedOp.targetId && post.thread_id !== parsedOp.targetId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子所属主题与操作目标不匹配。', 422);
    }
    if (parsedOp.family === 'post.revision' && parsedOp.targetId && post.id !== parsedOp.targetId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子目标不匹配。', 422);
    }
    const threadIdFromPayload = parsed.thread_id ?? parsed.post?.thread_id;
    if (threadIdFromPayload && threadIdFromPayload !== post.thread_id) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子所属主题与输入不匹配。', 422);
    }
    const rawRev = resolveLegacyRevision(
      parsed.current_revision,
      parsed.revision,
      '帖子'
    );
    const revNum = rawRev ?? 1;
    const postRev = tx.getPostRevision(postId, revNum);
    if (!postRev) {
      throw new DetunedError(ErrorCode.NOT_FOUND, `原帖子修订已不存在 (post_id=${postId}, rev=${revNum})。`, 404);
    }
    const pRef: any = {
      v: 1,
      kind: 'post',
      post_id: postId,
      revision: revNum,
    };

    const resolvedRelIds = resolveArrayAlias(
      parsed.relation_ids,
      undefined,
      'relation_ids',
      validateLegacyRelationIds
    );

    const resolvedRels = resolveArrayAlias(
      parsed.relations,
      undefined,
      'relations',
      validateLegacyRelations
    );

    const parsedRels = processLegacyRelations(
      tx,
      spaceId,
      postId,
      revNum,
      operation,
      resolvedRelIds,
      resolvedRels
    );

    if (parsedRels.kind === 'unreplayable') {
      return validateResultRef(operation, parsedRels.unreplayableRef!);
    } else if (parsedRels.kind === 'resolved') {
      pRef.relation_ids = parsedRels.relation_ids;
      pRef.relations = parsedRels.relations;
    }

    return validateResultRef(operation, pRef);
  }

  // 5. Post withdraw
  if (
    operation.startsWith('post.withdraw') &&
    (parsed.kind === 'post.withdraw' ||
      parsed.$ref === 'post' ||
      (parsed.id && (parsed.lifecycle || parsed.space_id)))
  ) {
    const postId = parsed.post_id ?? parsed.id ?? parsed.post?.id;
    if (!postId || typeof postId !== 'string') {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '帖子撤回引用缺少 post_id。', 422);
    }
    const ref: IdempotencyResultRef = {
      v: 1,
      kind: 'post.withdraw',
      post_id: postId,
    };
    return validateResultRef(operation, ref);
  }

  // 6. Relation create
  if (
    operation === 'relation.create' &&
    (parsed.kind === 'relation.create' ||
      (parsed.$ref === 'relation' && !parsed.resolution_id && !parsed.resolution) ||
      (parsed.id && parsed.source_post_id && parsed.target_post_id) ||
      (parsed.relation && parsed.relation.id && !parsed.resolution && !parsed.resolution_id))
  ) {
    const relationId = parsed.relation_id ?? parsed.id ?? parsed.relation?.id;
    if (!relationId || typeof relationId !== 'string') {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系引用缺少 relation_id。', 422);
    }
    const rel = tx.findRelationById(relationId);
    if (!rel) {
      throw new DetunedError(ErrorCode.NOT_FOUND, '原关联关系已不存在。', 404);
    }
    if (spaceId && spaceId !== 'instance' && rel.space_id !== spaceId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关联关系所属空间不匹配。', 422);
    }
    const sourcePost = tx.findPostById(rel.source_post_id);
    if (!sourcePost || (spaceId && spaceId !== 'instance' && sourcePost.space_id !== spaceId)) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关联关系源帖子不存在或跨空间。', 422);
    }
    const sourceRev = tx.getPostRevision(rel.source_post_id, rel.source_revision);
    if (!sourceRev) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关联关系源帖子历史修订不存在。', 422);
    }
    const targetPost = tx.findPostById(rel.target_post_id);
    if (!targetPost || (spaceId && spaceId !== 'instance' && targetPost.space_id !== spaceId)) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关联关系目标帖子不存在或跨空间。', 422);
    }
    const targetRev = tx.getPostRevision(rel.target_post_id, rel.target_revision);
    if (!targetRev) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关联关系目标帖子历史修订不存在。', 422);
    }
    const v1 = parseAndValidateVersion(parsed.relation_version, 'relation_version');
    const v2 = parseAndValidateVersion(parsed.version, 'version');
    const v3 = parseAndValidateVersion(parsed.relation?.version, 'relation.version');
    if (v1 !== undefined && v2 !== undefined && v1 !== v2) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系版本别名冲突。', 422);
    }
    const rawVersion = v1 ?? v2 ?? v3;

    const s1 = parseAndValidateState(parsed.relation_state, 'relation_state');
    const s2 = parseAndValidateState(parsed.state, 'state');
    const s3 = parseAndValidateState(parsed.relation?.state, 'relation.state');
    if (s1 !== undefined && s2 !== undefined && s1 !== s2) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系状态别名冲突。', 422);
    }
    const rawState = s1 ?? s2 ?? s3;

    if (rawVersion !== undefined && rawVersion > rel.version) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `关联关系版本超过当前存储版本: ${rel.id}。`, 422);
    }
    if (rawVersion !== undefined && rawState !== undefined) {
      if (rawVersion === 1) {
        const expectedInitialState = rel.type === 'challenges' ? 'open' : 'resolved';
        if (rawState !== expectedInitialState) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `关联关系历史初始状态与类型不匹配: ${rel.id}。`, 422);
        }
      } else {
        const resolution = tx.findRelationResolutionByVersion(rel.id, rawVersion);
        if (!resolution) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `关联关系历史决议记录不存在，历史状态不可证实: ${rel.id}。`, 422);
        }
        const expectedState = resolution.action === 'resolve' ? 'resolved' : 'open';
        if (rawState !== expectedState) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `关联关系历史状态与决议动作不匹配: ${rel.id}。`, 422);
        }
      }
    }

    if (rawVersion === undefined || rawState === undefined) {
      return {
        v: 1,
        kind: 'unreplayable',
        op: operation,
        reason: 'historical_relation_version_unrecoverable',
      };
    }
    const ref: IdempotencyResultRef = {
      v: 1,
      kind: 'relation.create',
      relation_id: relationId,
      relation_version: rawVersion,
      relation_state: rawState,
    };
    return validateResultRef(operation, ref);
  }

  // 7. Relation resolve / reopen
  if (
    (operation.includes('resolve') || operation.includes('reopen')) &&
    (parsed.kind === 'relation.resolve' ||
      parsed.kind === 'relation.reopen' ||
      parsed.$ref === 'relation' ||
      parsed.resolution ||
      parsed.resolution_id)
  ) {
    const relationId = parsed.relation_id ?? parsed.relation?.id ?? parsed.id;
    if (!relationId || typeof relationId !== 'string') {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议引用缺少 relation_id。', 422);
    }
    const resolutionId = parsed.resolution_id ?? parsed.resolution?.id;
    if (!resolutionId || typeof resolutionId !== 'string') {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议引用缺少 resolution_id。', 422);
    }
    const v1 = parseAndValidateVersion(parsed.relation_version, 'relation_version');
    const v2 = parseAndValidateVersion(parsed.relation?.version, 'relation.version');
    const v3 = parseAndValidateVersion(parsed.resolution?.version, 'resolution.version');
    if (v1 !== undefined && v2 !== undefined && v1 !== v2) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议版本别名冲突。', 422);
    }
    const rawVersion = v1 ?? v2 ?? v3;
    let version = rawVersion;
    if (version === undefined) {
      const res = tx.findRelationResolutionById(resolutionId);
      if (res && typeof res.version === 'number') {
        version = res.version;
      } else {
        version = 2;
      }
    }

    const s1 = parseAndValidateState(parsed.relation_state, 'relation_state');
    const s2 = parseAndValidateState(parsed.state, 'state');
    const s3 = parseAndValidateState(parsed.relation?.state, 'relation.state');
    if (s1 !== undefined && s2 !== undefined && s1 !== s2) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议状态别名冲突。', 422);
    }
    const rawState = s1 ?? s2 ?? s3;

    const action = operation.includes('reopen') ? 'relation.reopen' : 'relation.resolve';
    const state = rawState ?? (action === 'relation.resolve' ? 'resolved' : 'open');
    const ref: IdempotencyResultRef = {
      v: 1,
      kind: action,
      relation_id: relationId,
      relation_version: version,
      relation_state: state,
      resolution_id: resolutionId,
    };
    return validateResultRef(operation, ref);
  }

  // 8. Admin redaction
  if (
    operation.startsWith('admin.redaction') &&
    (parsed.kind === 'admin.redaction' ||
      parsed.$ref === 'redaction' ||
      parsed.redaction_id ||
      (parsed.id && parsed.affected_revisions))
  ) {
    const redactionId = parsed.redaction_id ?? parsed.id;
    if (!redactionId || typeof redactionId !== 'string') {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '脱敏引用缺少 redaction_id。', 422);
    }
    const ref: IdempotencyResultRef = {
      v: 1,
      kind: 'admin.redaction',
      redaction_id: redactionId,
    };
    return validateResultRef(operation, ref);
  }

  // Rejection for any unknown legacy format
  throw new DetunedError(
    ErrorCode.RESYNC_REQUIRED,
    `未知或不受支持的幂等引用格式: ${parsed.kind ?? parsed.$ref ?? 'unknown'}。`,
    422
  );
}

export function reconstructResult(tx: StoragePort, operation: string, resultRefStr: string, spaceId?: string): any {
  let parsed: any;
  try {
    parsed = JSON.parse(resultRefStr);
  } catch {
    throw new DetunedError(
      ErrorCode.RESYNC_REQUIRED,
      '无法解析幂等记录引用，存储数据损坏。',
      422
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new DetunedError(
      ErrorCode.RESYNC_REQUIRED,
      '幂等引用格式损坏，非对象数据。',
      422
    );
  }

  // Version guards
  if (parsed.v !== undefined && parsed.v !== 1) {
    throw new DetunedError(
      ErrorCode.RESYNC_REQUIRED,
      `不受支持的幂等引用版本 (v${parsed.v})。`,
      422
    );
  }
  if (parsed.ref_version && parsed.ref_version > 1) {
    throw new DetunedError(
      ErrorCode.RESYNC_REQUIRED,
      `不受支持的幂等引用版本 (v${parsed.ref_version})。`,
      422
    );
  }

  let ref: IdempotencyResultRef;
  if (parsed.v === 1) {
    ref = validateResultRef(operation, parsed);
  } else {
    // Check for explicitly unreplayable historical records
    if (parsed.kind === 'unreplayable') {
      throw new DetunedError(
        ErrorCode.RESYNC_REQUIRED,
        `原操作结果已不可重放: ${parsed.reason}。原写请求已提交，请查询当前状态以继续。`,
        422
      );
    }
    ref = normalizeLegacyResultRef(tx, operation, parsed, spaceId);
  }

  if (ref.kind === 'unreplayable') {
    throw new DetunedError(
      ErrorCode.RESYNC_REQUIRED,
      `原操作结果已不可重放: ${ref.reason}。原写请求已提交，请查询当前状态以继续。`,
      422
    );
  }

  return reconstructFromValidRef(tx, operation, ref, spaceId);
}

function reconstructFromValidRef(tx: StoragePort, operation: string, ref: IdempotencyResultRef, spaceId?: string): any {
  validateResultRefSemantics(tx, operation, spaceId ?? 'instance', ref);

  const parsedOp = parseOperation(operation);

  // Target binding check
  if (parsedOp.family === 'thread.patch' && parsedOp.targetId && ref.kind === 'thread.patch') {
    if (ref.thread_id !== parsedOp.targetId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用目标与当前操作目标不一致。', 422);
    }
  }
  if (parsedOp.family === 'post.revision' && parsedOp.targetId && ref.kind === 'post') {
    if (ref.post_id !== parsedOp.targetId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用目标与当前操作目标不一致。', 422);
    }
  }
  if (parsedOp.family === 'post.withdraw' && parsedOp.targetId && ref.kind === 'post.withdraw') {
    if (ref.post_id !== parsedOp.targetId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用目标与当前操作目标不一致。', 422);
    }
  }
  if (
    (parsedOp.family === 'relation.resolve' || parsedOp.family === 'relation.reopen') &&
    parsedOp.targetId &&
    (ref.kind === 'relation.resolve' || ref.kind === 'relation.reopen')
  ) {
    if (ref.relation_id !== parsedOp.targetId) {
      throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用目标与当前操作目标不一致。', 422);
    }
  }

  switch (ref.kind) {
    case 'space': {
      if (parsedOp.family === 'space.create') {
        if (spaceId && spaceId !== 'instance') {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '空间创建幂等引用作用域与目标不一致。', 422);
        }
      } else {
        if (spaceId && ref.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用空间与目标空间不一致。', 422);
        }
      }
      if (parsedOp.targetId && ref.space_id !== parsedOp.targetId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用目标与当前操作目标不一致。', 422);
      }
      const space = tx.findSpaceById(ref.space_id);
      if (!space) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原空间已不存在。', 404);
      }
      const revision = tx.getSpaceRevision(ref.space_id, ref.revision);
      if (!revision) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原空间修订版本不存在。', 404);
      }
      return { space, revision };
    }
    case 'thread.create': {
      const thread = tx.findThreadById(ref.thread_id);
      if (!thread) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原主题已不存在。', 404);
      }
      if (spaceId && thread.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用主题与目标空间不一致。', 422);
      }
      const snap = tx.getThreadVersion(ref.thread_id, ref.thread_version);
      if (!snap) {
        throw new DetunedError(
          ErrorCode.RESYNC_REQUIRED,
          '原主题历史版本无法恢复，请查询当前状态以继续。',
          422
        );
      }
      const outThread: Thread = {
        ...thread,
        title: snap.title,
        version: snap.version,
        state: snap.state as any,
        updated_at: snap.created_at,
      };
      if (ref.initial_post_id) {
        const initialRevNum = ref.initial_post_revision ?? 1;
        const post = tx.findPostById(ref.initial_post_id);
        if (!post) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '原初始帖子已不存在。', 404);
        }
        if (spaceId && post.space_id !== spaceId) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用初始帖子与目标空间不一致。', 422);
        }
        const revision = tx.getPostRevision(ref.initial_post_id, initialRevNum);
        if (!revision) {
          throw new DetunedError(ErrorCode.NOT_FOUND, '原初始帖子历史修订版本不存在。', 404);
        }
        let relations: Relation[] = [];
        if (ref.relations && Array.isArray(ref.relations)) {
          relations = ref.relations.map((r) => {
            const rel = tx.findRelationById(r.id);
            if (!rel) {
              throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `原关联关系记录 ${r.id} 不存在。`, 422);
            }
            if (spaceId && rel.space_id !== spaceId) {
              throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关联关系与目标空间不一致。', 422);
            }
            return {
              ...rel,
              version: r.version,
              state: r.state,
            };
          });
        } else if (ref.relation_ids && Array.isArray(ref.relation_ids) && ref.relation_ids.length > 0) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史关联关系版本无法恢复，请查询当前状态以继续。', 422);
        }
        const outInitialPost: any = {
          post,
          revision,
        };
        if (ref.relations !== undefined || ref.relation_ids !== undefined) {
          outInitialPost.relations = relations;
        }
        return {
          thread: outThread,
          initial_post: outInitialPost,
        };
      }
      return { thread: outThread };
    }
    case 'thread.patch': {
      const thread = tx.findThreadById(ref.thread_id);
      if (!thread) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原主题已不存在。', 404);
      }
      if (spaceId && thread.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用主题与目标空间不一致。', 422);
      }
      const snap = tx.getThreadVersion(ref.thread_id, ref.thread_version);
      if (!snap) {
        throw new DetunedError(
          ErrorCode.RESYNC_REQUIRED,
          '原主题历史版本无法恢复，请查询当前状态以继续。',
          422
        );
      }
      return {
        ...thread,
        title: snap.title,
        version: snap.version,
        state: snap.state as any,
        updated_at: snap.created_at,
      };
    }
    case 'post': {
      const post = tx.findPostById(ref.post_id);
      if (!post) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原帖子已不存在。', 404);
      }
      if (spaceId && post.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用帖子与目标空间不一致。', 422);
      }
      if (parsedOp.family === 'post.create' && parsedOp.targetId) {
        if (post.thread_id !== parsedOp.targetId) {
          throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用帖子不属于目标主题。', 422);
        }
      }
      const revision = tx.getPostRevision(ref.post_id, ref.revision);
      if (!revision) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原帖子历史修订版本不存在。', 404);
      }
      const out: any = { post, revision };
      if (ref.relations && Array.isArray(ref.relations)) {
        out.relations = ref.relations.map((r) => {
          const rel = tx.findRelationById(r.id);
          if (!rel) {
            throw new DetunedError(ErrorCode.RESYNC_REQUIRED, `原关联关系记录 ${r.id} 不存在。`, 422);
          }
          if (spaceId && rel.space_id !== spaceId) {
            throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关联关系与目标空间不一致。', 422);
          }
          return {
            ...rel,
            version: r.version,
            state: r.state,
          };
        });
      } else if (ref.relation_ids && Array.isArray(ref.relation_ids) && ref.relation_ids.length > 0) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '历史关联关系版本无法恢复，请查询当前状态以继续。', 422);
      } else if (ref.relation_ids !== undefined || parsedOp.family === 'post.create' || parsedOp.family === 'post.revision') {
        out.relations = [];
      }
      return out;
    }
    case 'post.withdraw': {
      const post = tx.findPostById(ref.post_id);
      if (!post) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原帖子已不存在。', 404);
      }
      if (spaceId && post.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用帖子与目标空间不一致。', 422);
      }
      return post;
    }
    case 'relation.create': {
      const relation = tx.findRelationById(ref.relation_id);
      if (!relation) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原关系已不存在。', 404);
      }
      if (spaceId && relation.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用关系与目标空间不一致。', 422);
      }
      return {
        ...relation,
        version: ref.relation_version,
        state: ref.relation_state,
      };
    }
    case 'relation.resolve':
    case 'relation.reopen': {
      const relation = tx.findRelationById(ref.relation_id);
      if (!relation) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原关系已不存在。', 404);
      }
      if (spaceId && relation.space_id !== spaceId) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '幂等引用关系与目标空间不一致。', 422);
      }
      const resolution = tx.findRelationResolutionById(ref.resolution_id);
      if (!resolution) {
        throw new DetunedError(ErrorCode.NOT_FOUND, '原关系决议记录不存在。', 404);
      }
      if (resolution.relation_id !== relation.id) {
        throw new DetunedError(ErrorCode.RESYNC_REQUIRED, '关系决议记录与目标关系不一致。', 422);
      }
      return {
        relation: {
          ...relation,
          version: ref.relation_version,
          state: ref.relation_state,
        },
        resolution,
      };
    }
    case 'admin.redaction': {
      return {
        redaction_id: ref.redaction_id,
      };
    }
    default:
      throw new DetunedError(
        ErrorCode.RESYNC_REQUIRED,
        `不受支持的引用 kind。`,
        422
      );
  }
}

export class IdempotencyService {
  constructor(
    private readonly storage: StoragePort,
    private readonly hasher: HasherPort,
    private readonly clock: ClockPort
  ) {}

  executeIdempotent<T>(
    actorId: string,
    spaceId: string,
    operation: string,
    key: string,
    payload: unknown,
    statusCode: number,
    action: (tx: StoragePort) => T
  ): { data: T; isReplay: boolean } {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        '缺少 Idempotency-Key / request_key。',
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
            '同名 Idempotency-Key 包含不同的请求内容。',
            409,
            false,
            { key }
          );
        }
        // Identical request retry: reconstruct result applying current redaction/visibility
        const reconstructed = reconstructResult(tx, operation, existing.result_ref, spaceId) as T;
        return { data: reconstructed, isReplay: true };
      }

      // Execute fresh business action
      const result = action(tx);

      // Save idempotency record with compact reference only
      const resultRef = extractResultRef(operation, result);
      const parsedRef = JSON.parse(resultRef);
      validateResultRef(operation, parsedRef);
      validateResultRefSemantics(tx, operation, spaceId, parsedRef);
      const record: IdempotencyRecord = {
        actor_id: actorId,
        space_id: spaceId,
        operation,
        key,
        request_hash: requestHash,
        result_ref: resultRef,
        http_status: statusCode,
        created_at: this.clock.nowIso(),
      };
      tx.createIdempotencyRecord(record);

      return { data: result, isReplay: false };
    });
  }
}
