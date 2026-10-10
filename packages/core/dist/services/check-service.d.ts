import { type CreateCheckRun, type InvalidateCheckRun, type SubmitCheckReceipt, type CheckRunRecord, type CheckReceiptRecord } from '@detuned/protocol';
import type { StoragePort } from '../ports/storage.js';
import type { ClockPort } from '../ports/clock.js';
import type { IdGeneratorPort } from '../ports/id-generator.js';
import type { HasherPort } from '../ports/hasher.js';
import { AuthService, type AuthenticatedContext } from './auth-service.js';
import { IdempotencyService } from './idempotency-service.js';
export declare class CheckService {
    private readonly storage;
    private readonly auth;
    private readonly idempotency;
    private readonly clock;
    private readonly ids;
    private readonly hasher;
    constructor(storage: StoragePort, auth: AuthService, idempotency: IdempotencyService, clock: ClockPort, ids: IdGeneratorPort, hasher: HasherPort);
    private maintainer;
    private event;
    createRun(auth: AuthenticatedContext, spaceId: string, req: CreateCheckRun, key: string): CheckRunRecord;
    getRequiredChecks(auth: AuthenticatedContext, spaceId: string, requestId: string): {
        space_id: string;
        request_id: string;
        snapshot_id: string;
        request_version: number;
        verification_status: "pending" | "error" | "not_required" | "failed" | "passed";
        checks: {
            check_name: string;
            run: {
                space_id: string;
                id: string;
                request_id: string;
                snapshot_id: string;
                snapshot_sha256: string;
                check_name: string;
                attempt: number;
                verifier_actor_id: string;
                check_config_sha256: string;
                state: import("@detuned/protocol").CheckRunState;
                version: number;
                created_by: string;
                created_at: string;
                changed_by: string;
                changed_at: string;
                invalidation_reason: string | null;
            } | null;
            receipt_id: string | null;
        }[];
    };
    private publicRun;
    getRun(auth: AuthenticatedContext, spaceId: string, runId: string): CheckRunRecord;
    getSnapshot(auth: AuthenticatedContext, spaceId: string, runId: string): {
        record: import("@detuned/protocol").ReviewSnapshotRecord;
        manifest: import("@detuned/protocol").ReviewSnapshotManifestData;
    };
    getPostRevision(auth: AuthenticatedContext, spaceId: string, runId: string, postId: string, revision: number): {
        created_at: string;
        revision: number;
        editor_id: string;
        title: string;
        summary: string;
        post_id: string;
        body: string;
        tags: string[];
        structured: {
            [x: string]: unknown;
        } | {
            scope: string;
            statement: string;
            assumptions: string[];
            falsification_plan: string;
        } | {
            verification_plan?: string | undefined;
            target_ref: {
                revision: number;
                post_id: string;
            };
            evidence_refs: ({
                revision: number;
                kind: "post";
                post_id: string;
            } | {
                kind: "artifact";
                artifact_id: string;
            })[];
            issue: string;
            impact: string;
        } | {
            evidence_missing_reason?: string | undefined;
            assumptions: string[];
            evidence_refs: ({
                revision: number;
                kind: "post";
                post_id: string;
            } | {
                kind: "artifact";
                artifact_id: string;
            })[];
            attempt: string;
            evidence_state: "provided" | "unverified";
            category: "counterexample" | "proof_gap" | "test_failure" | "performance_failure" | "environment_error" | "budget_exhausted";
            tested_scope: string;
            expected: string;
            observed: string;
            ruled_out: string;
            not_ruled_out: string[];
            retry_when: string[];
        } | {
            source_refs: {
                revision: number;
                post_id: string;
            }[];
        } | {
            subject_refs: {
                revision: number;
                post_id: string;
            }[];
            informal: true;
        };
        content_hash: string;
    };
    issueCredential(auth: AuthenticatedContext, spaceId: string, runId: string, ttlSeconds?: number): {
        credential_id: string;
        token: string;
        expires_at: string;
    };
    submitReceipt(auth: AuthenticatedContext, spaceId: string, runId: string, req: SubmitCheckReceipt, key: string): CheckReceiptRecord;
    getReceipt(auth: AuthenticatedContext, spaceId: string, runId: string): CheckReceiptRecord;
    invalidateRun(auth: AuthenticatedContext, spaceId: string, runId: string, req: InvalidateCheckRun, key: string): CheckRunRecord;
}
//# sourceMappingURL=check-service.d.ts.map