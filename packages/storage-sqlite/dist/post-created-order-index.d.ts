import type Database from 'better-sqlite3';
/** Shared by the query and its optional runtime-only performance index. */
export declare const POST_CREATED_SORT_KEY_SQL = "CASE WHEN length(created_at) = 24 AND strftime('%Y-%m-%dT%H:%M:%fZ',created_at,'+0 seconds') = created_at THEN created_at ELSE NULL END";
export declare const POST_CREATED_ORDER_INDEX = "posts_thread_created_sort_v1";
/** Explicit writable runtime preparation, after page quota; never called by bootstrap or reads. */
export declare function preparePostCreatedOrderIndex(db: Database.Database): void;
//# sourceMappingURL=post-created-order-index.d.ts.map