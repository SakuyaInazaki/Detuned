import type Database from 'better-sqlite3';
import { DetunedError, ErrorCode, resolveResourceLimits, type ResourceLimits } from '@detuned/protocol';
import { resourceQuotaError } from '@detuned/core';

/** Runtime connection only. No migration, persistent metadata, or offline maintenance policy. */
export function configureSqliteResourceLimits(db: Database.Database, limits: ResourceLimits): void {
  const resolved = resolveResourceLimits(limits);
  if (db.inTransaction) throw new DetunedError(ErrorCode.VALIDATION_ERROR, '运行额度必须在事务外配置。', 400);
  const pageSize = db.pragma('main.page_size', { simple: true }) as number;
  const currentPages = db.pragma('main.page_count', { simple: true }) as number;
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0 || !Number.isSafeInteger(currentPages) || currentPages < 0) throw resourceQuotaError('database');
  const target = Math.floor(resolved.database_max_bytes / pageSize);
  if (target < 1 || currentPages > target) throw resourceQuotaError('database');
  const actual = db.pragma(`main.max_page_count = ${target}`, { simple: true });
  if (actual !== target || db.pragma('main.max_page_count', { simple: true }) !== target) throw resourceQuotaError('database');
}
