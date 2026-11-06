import { DetunedError, ErrorCode } from '@detuned/protocol';
import { mapStorageFullError } from '@detuned/core';
import { classifyDatabase } from './bootstrap.js';
export const RELATION_SOURCE_INDEX = 'relations_source_revision_id_v1';
export const RELATION_TARGET_INDEX = 'relations_target_revision_id_v1';
export const RELATION_READ_INDEXES = [
    [RELATION_SOURCE_INDEX, `CREATE INDEX ${RELATION_SOURCE_INDEX} ON relations(space_id,source_post_id,source_revision,id)`],
    [RELATION_TARGET_INDEX, `CREATE INDEX ${RELATION_TARGET_INDEX} ON relations(space_id,target_post_id,target_revision,id)`],
];
const unavailable = () => new DetunedError(ErrorCode.TEMPORARILY_UNAVAILABLE, 'Runtime relation read indexes preparation failed; service was not started.', 503, false);
/** Derived runtime-only indexes; exact collision rejection, never written by a read or bootstrap. */
export function prepareRelationReadIndexes(db) {
    if (db.readonly || db.inTransaction)
        throw unavailable();
    try {
        db.transaction(() => {
            if (classifyDatabase(db).kind !== 'current_initialized')
                throw unavailable();
            for (const [name, sql] of RELATION_READ_INDEXES) {
                const row = db.prepare('SELECT type,tbl_name,sql FROM sqlite_master WHERE name=? COLLATE NOCASE').get(name);
                if (row) {
                    if (row.type !== 'index' || row.tbl_name !== 'relations' || row.sql !== sql)
                        throw unavailable();
                }
                else
                    db.exec(sql);
            }
        }).immediate();
    }
    catch (error) {
        const mapped = mapStorageFullError(error);
        if (mapped instanceof DetunedError)
            throw mapped;
        throw unavailable();
    }
}
//# sourceMappingURL=relation-read-indexes.js.map