import { ClaimMaterial, FailureMaterial, PostRef, Relation, RelationProjection, SourceStatus } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
export declare function projectClaimMaterial(structured: unknown): ClaimMaterial;
export declare function projectFailureMaterial(structured: unknown): FailureMaterial;
export declare function projectSource(storage: StoragePort, spaceId: string, ref: PostRef): SourceStatus;
export declare function projectSummarySources(storage: StoragePort, spaceId: string, structured: unknown): {
    source_refs: SourceStatus[] | null;
    missing_fields: ('source_refs')[];
};
export declare function projectRelation(storage: StoragePort, spaceId: string, relation: Relation): RelationProjection | null;
export declare function projectTargetRelations(storage: StoragePort, spaceId: string, targetId: string): RelationProjection[];
export declare const REPORT_FLAGS: {
    readonly report_kind: "author_report";
};
//# sourceMappingURL=knowledge-projection.d.ts.map