import type Database from 'better-sqlite3';
export declare const RELATION_SOURCE_INDEX = "relations_source_revision_id_v1";
export declare const RELATION_TARGET_INDEX = "relations_target_revision_id_v1";
export declare const RELATION_HISTORY_INDEX = "relation_resolutions_relation_version_id_v1";
export declare const RELATION_READ_INDEXES: readonly [readonly ["relation_resolutions_relation_version_id_v1", "CREATE INDEX relation_resolutions_relation_version_id_v1 ON relation_resolutions(relation_id,version,id)"], readonly ["relations_source_revision_id_v1", "CREATE INDEX relations_source_revision_id_v1 ON relations(space_id,source_post_id,source_revision,id)"], readonly ["relations_target_revision_id_v1", "CREATE INDEX relations_target_revision_id_v1 ON relations(space_id,target_post_id,target_revision,id)"]];
/** Derived runtime-only indexes; exact collision rejection, never written by a read or bootstrap. */
export declare function prepareRelationReadIndexes(db: Database.Database): void;
//# sourceMappingURL=relation-read-indexes.d.ts.map