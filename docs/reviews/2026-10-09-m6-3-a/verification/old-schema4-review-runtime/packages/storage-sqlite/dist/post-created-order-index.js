import { DetunedError, ErrorCode } from '@detuned/protocol';
import { mapStorageFullError } from '@detuned/core';
import { classifyDatabase } from './bootstrap.js';
/** Shared by the query and its optional runtime-only performance index. */
export const POST_CREATED_SORT_KEY_SQL = "CASE WHEN length(created_at) = 24 AND strftime('%Y-%m-%dT%H:%M:%fZ',created_at,'+0 seconds') = created_at THEN created_at ELSE NULL END";
export const POST_CREATED_ORDER_INDEX = 'posts_thread_created_sort_v1';
const indexSQL = `CREATE INDEX ${POST_CREATED_ORDER_INDEX} ON posts(thread_id,(${POST_CREATED_SORT_KEY_SQL} IS NULL),${POST_CREATED_SORT_KEY_SQL},id)`;
const unavailable = () => new DetunedError(ErrorCode.TEMPORARILY_UNAVAILABLE, 'Runtime read index preparation failed; service was not started.', 503, false);
/** Explicit writable runtime preparation, after page quota; never called by bootstrap or reads. */
export function preparePostCreatedOrderIndex(db) {
    if (db.readonly || db.inTransaction)
        throw unavailable();
    try {
        db.transaction(() => {
            if (classifyDatabase(db).kind !== 'current_initialized')
                throw unavailable();
            const existing = db.prepare('SELECT type,tbl_name,sql FROM sqlite_master WHERE name=? COLLATE NOCASE').get(POST_CREATED_ORDER_INDEX);
            if (existing) {
                // Reserved definition is deliberately exact: never silently keep, drop or repair a collision.
                if (existing.type !== 'index' || existing.tbl_name !== 'posts' || existing.sql !== indexSQL)
                    throw unavailable();
                return;
            }
            db.exec(indexSQL);
        }).immediate();
    }
    catch (error) {
        const mapped = mapStorageFullError(error);
        if (mapped instanceof DetunedError)
            throw mapped;
        throw unavailable();
    }
}
//# sourceMappingURL=post-created-order-index.js.map