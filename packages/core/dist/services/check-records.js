import { isDeepStrictEqual } from 'node:util';
import { DetunedError, ErrorCode, toArtifactMetadata, isCheckInstant, isSubmitCheckReceipt } from '@detuned/protocol';
import { readIntrinsicReviewRequestRecords, readReviewSnapshotRecords, reviewResync } from './review-request-records.js';
const positive = (n) => Number.isSafeInteger(n) && n > 0;
const instant = isCheckInstant;
export function readCheckRun(storage, spaceId, id, version) {
    try {
        const run = storage.findCheckRunById(id), head = run ? storage.findReviewRequestById(run.request_id) : null;
        if (!run || !head || head.space_id !== spaceId)
            throw new DetunedError(ErrorCode.NOT_FOUND, 'Check does not exist or is not accessible.', 404);
        const { record, manifest } = readIntrinsicReviewRequestRecords(storage, spaceId, head.id);
        const runKeys = ['id', 'request_id', 'snapshot_id', 'snapshot_sha256', 'check_name', 'attempt', 'verifier_actor_id', 'check_config_sha256', 'created_request_version', 'state', 'version', 'created_by', 'created_at', 'changed_by', 'changed_at', 'invalidation_reason'];
        if (Object.keys(run).length !== runKeys.length || Object.keys(run).some(k => !runKeys.includes(k)))
            throw reviewResync();
        const profile = manifest.check_profiles.find(p => p.check_name === run.check_name);
        if (run.id !== id || run.snapshot_id !== head.snapshot_id || run.snapshot_sha256 !== record.manifest_sha256 || !profile || profile.config_sha256 !== run.check_config_sha256 || !profile.verifier_actor_ids.includes(run.verifier_actor_id) || !positive(run.attempt) || !positive(run.version) || !positive(run.created_request_version) || run.created_request_version >= head.version || !instant(run.created_at) || !instant(run.changed_at))
            throw reviewResync();
        const created = storage.findReviewRequestVersion(head.id, run.created_request_version), next = storage.findReviewRequestVersion(head.id, run.created_request_version + 1);
        if (!created || !next || !['collecting', 'revealed'].includes(created.phase) || created.phase !== next.phase || created.submitted_count !== next.submitted_count || next.reason !== null || next.changed_by !== run.created_by || next.changed_at !== run.created_at)
            throw reviewResync();
        const history = storage.findCheckRunVersion(id, version ?? run.version);
        const versionKeys = ['check_run_id', 'version', 'observed_request_version', 'state', 'receipt_id', 'changed_by', 'changed_at', 'invalidation_reason'];
        if (history && (Object.keys(history).length !== versionKeys.length || Object.keys(history).some(k => !versionKeys.includes(k))))
            throw reviewResync();
        if (!history || !positive(history.observed_request_version) || history.observed_request_version > head.version || !positive(history.version) || history.version > run.version || history.check_run_id !== id || !instant(history.changed_at) || !history.changed_by || !['pending', 'pass', 'fail', 'error', 'invalidated'].includes(history.state) || (history.state === 'invalidated' ? (typeof history.invalidation_reason !== 'string' || !history.invalidation_reason.trim() || [...history.invalidation_reason].length > 500) : history.invalidation_reason !== null))
            throw reviewResync();
        if (history.version === 1 && (history.observed_request_version !== run.created_request_version + 1 || history.state !== 'pending' || history.receipt_id !== null || history.changed_by !== run.created_by || history.changed_at !== run.created_at))
            throw reviewResync();
        let previousObserved = run.created_request_version + 1, previousState = null;
        const boundReceipt = storage.findCheckReceiptByRunId(id);
        for (let n = 1; n <= history.version; n++) {
            const prior = storage.findCheckRunVersion(id, n);
            if (!prior || prior.version !== n || prior.check_run_id !== id || !positive(prior.observed_request_version) || prior.observed_request_version < previousObserved || prior.observed_request_version > head.version || !instant(prior.changed_at) || !prior.changed_by || Object.keys(prior).length !== versionKeys.length || Object.keys(prior).some(k => !versionKeys.includes(k)))
                throw reviewResync();
            if (n === 1) {
                if (prior.observed_request_version !== run.created_request_version + 1 || prior.state !== 'pending' || prior.receipt_id !== null || prior.changed_by !== run.created_by || prior.changed_at !== run.created_at || prior.invalidation_reason !== null)
                    throw reviewResync();
            }
            else if (prior.state === 'invalidated') {
                if (typeof prior.invalidation_reason !== 'string' || !prior.invalidation_reason.trim() || [...prior.invalidation_reason].length > 500 || (boundReceipt && boundReceipt.run_version < n ? prior.receipt_id !== boundReceipt.receipt_id : prior.receipt_id !== null))
                    throw reviewResync();
            }
            else if (!['pass', 'fail', 'error'].includes(prior.state) || previousState !== 'pending' || prior.invalidation_reason !== null || !boundReceipt || prior.receipt_id !== boundReceipt.receipt_id || prior.version !== boundReceipt.run_version || prior.state !== boundReceipt.result || prior.changed_by !== run.verifier_actor_id || prior.changed_at !== boundReceipt.received_at)
                throw reviewResync();
            previousObserved = prior.observed_request_version;
            previousState = prior.state;
        }
        if (version === undefined && !isDeepStrictEqual(history, { check_run_id: id, version: run.version, observed_request_version: history.observed_request_version, state: run.state, receipt_id: storage.findCheckReceiptByRunId(id)?.receipt_id ?? null, changed_by: run.changed_by, changed_at: run.changed_at, invalidation_reason: run.invalidation_reason }))
            throw reviewResync();
        if (['pass', 'fail', 'error'].includes(history.state)) {
            const receipt = storage.findCheckReceiptByRunId(id);
            if (!receipt || receipt.receipt_id !== history.receipt_id || receipt.run_version !== history.version || receipt.result !== history.state || receipt.received_at !== history.changed_at || receipt.verifier_actor_id !== history.changed_by)
                throw reviewResync();
            validateCheckReceipt(storage, run, receipt);
        }
        return { ...run, version: history.version, state: history.state, changed_by: history.changed_by, changed_at: history.changed_at, invalidation_reason: history.invalidation_reason };
    }
    catch (error) {
        if (error instanceof SyntaxError)
            throw reviewResync();
        throw error;
    }
}
function validateCheckReceipt(storage, run, receipt) {
    const { check_run_id, verifier_actor_id, received_at, run_version, ...payload } = receipt;
    if (check_run_id !== run.id || verifier_actor_id !== run.verifier_actor_id || !positive(run_version) || run_version > run.version || !instant(received_at) || !isSubmitCheckReceipt(payload) || payload.observed_snapshot_sha256 !== run.snapshot_sha256 || payload.observed_check_config_sha256 !== run.check_config_sha256)
        throw reviewResync();
    const artifact = storage.findArtifactById(receipt.logs_artifact_id), request = storage.findReviewRequestById(run.request_id);
    if (!artifact || !request || artifact.space_id !== request.space_id || artifact.visibility !== 'space' || artifact.check_run_id !== run.id || artifact.owner_id !== run.verifier_actor_id)
        throw reviewResync();
}
export function readCheckReceipt(storage, spaceId, runId) {
    const run = readCheckRun(storage, spaceId, runId), receipt = storage.findCheckReceiptByRunId(runId);
    if (!receipt)
        throw new DetunedError(ErrorCode.NOT_FOUND, 'Check receipt does not exist.', 404);
    validateCheckReceipt(storage, run, receipt);
    const version = storage.findCheckRunVersion(runId, receipt.run_version);
    if (!version || version.receipt_id !== receipt.receipt_id || version.state !== receipt.result || version.changed_by !== receipt.verifier_actor_id || version.changed_at !== receipt.received_at)
        throw reviewResync();
    return structuredClone(receipt);
}
export function assertCheckOnlinePrivacy(storage, spaceId, run) { readReviewSnapshotRecords(storage, spaceId, run.snapshot_id); }
export function readRequiredCheckFacts(storage, spaceId, requestId) {
    const { manifest } = readIntrinsicReviewRequestRecords(storage, spaceId, requestId);
    const checks = manifest.review_policy.required_checks.map(name => { const row = storage.findLatestCheckRun(requestId, name); const run = row ? readCheckRun(storage, spaceId, row.id) : null; return { name, run, receipt: run && ['pass', 'fail', 'error'].includes(run.state) ? readCheckReceipt(storage, spaceId, run.id) : null }; });
    const verification_status = checks.length === 0 ? 'not_required' : checks.some(c => c.run?.state === 'fail') ? 'failed' : checks.some(c => c.run?.state === 'error') ? 'error' : checks.every(c => c.run?.state === 'pass') ? 'passed' : 'pending';
    return { checks, verification_status: verification_status };
}
export function parseCheckResultReference(operation, raw) {
    const r = raw;
    if (!r || Object.keys(r).length !== (r.kind === 'artifact.check' ? 5 : 4) || typeof r !== 'object' || Array.isArray(r) || r.v !== 1 || !['check.run', 'check.receipt', 'artifact.check'].includes(r.kind) || typeof r.run_id !== 'string' || !r.run_id || !positive(r.run_version) || Object.keys(r).some(k => !['v', 'kind', 'run_id', 'run_version', ...(r.kind === 'artifact.check' ? ['artifact_id'] : [])].includes(k)))
        throw reviewResync();
    if (r.kind === 'artifact.check' ? (operation !== `artifact.check.create:${r.run_id}` || typeof r.artifact_id !== 'string' || !r.artifact_id) : r.kind === 'check.receipt' ? operation !== `check.receipt.create:${r.run_id}` : !(operation.startsWith('check.run.create:') || operation === `check.run.invalidate:${r.run_id}`))
        throw reviewResync();
    return r;
}
export function reconstructCheckResult(storage, spaceId, operation, raw, online = true) {
    const ref = parseCheckResultReference(operation, raw), run = readCheckRun(storage, spaceId, ref.run_id, ref.run_version);
    if (online)
        assertCheckOnlinePrivacy(storage, spaceId, run);
    if (operation.startsWith('check.run.create:') && operation !== `check.run.create:${run.request_id}`)
        throw reviewResync();
    if (ref.kind === 'check.run')
        return run;
    if (ref.kind === 'check.receipt') {
        const receipt = readCheckReceipt(storage, spaceId, run.id);
        if (receipt.run_version !== ref.run_version)
            throw reviewResync();
        if (online)
            assertCheckReceiptPrivacy(storage, spaceId, receipt);
        return receipt;
    }
    const artifact = storage.findArtifactById(ref.artifact_id);
    if (!artifact || artifact.space_id !== spaceId || artifact.check_run_id !== run.id || artifact.owner_id !== run.verifier_actor_id || artifact.visibility !== 'space')
        throw reviewResync();
    if (online) {
        if (artifact.state === 'redacted')
            throw new DetunedError(ErrorCode.CONTENT_REDACTED, 'Check log was redacted.', 410);
        if (artifact.state !== 'ready')
            throw new DetunedError(ErrorCode.NOT_FOUND, 'Check log is unavailable.', 404);
    }
    return toArtifactMetadata(artifact);
}
export function assertCheckReceiptPrivacy(storage, spaceId, receipt) { const log = storage.findArtifactById(receipt.logs_artifact_id); if (!log || log.space_id !== spaceId)
    throw reviewResync(); if (log.state === 'redacted')
    throw new DetunedError(ErrorCode.CONTENT_REDACTED, 'Check log was redacted.', 410); if (log.state !== 'ready')
    throw new DetunedError(ErrorCode.NOT_FOUND, 'Check log is unavailable.', 404); }
//# sourceMappingURL=check-records.js.map