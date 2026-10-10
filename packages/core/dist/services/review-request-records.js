import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { DetunedError, ErrorCode, isReviewSnapshotManifest } from '@detuned/protocol';
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const goodHash = (v) => typeof v === 'string' && v.length === 64 && /^[0-9a-f]+$/.test(v);
const positive = (v) => Number.isSafeInteger(v) && v > 0;
const id = (v) => typeof v === 'string' && v.length > 0;
export const reviewResync = () => new DetunedError(ErrorCode.RESYNC_REQUIRED, 'Stored review material cannot be safely reconstructed.', 409);
const missing = () => new DetunedError(ErrorCode.NOT_FOUND, 'Review material does not exist or is not accessible.', 404);
const redacted = () => new DetunedError(ErrorCode.CONTENT_REDACTED, 'Review material has been redacted.', 410);
function postReference(storage, spaceId, postId, online) {
    const post = storage.findPostById(postId);
    if (!post || post.space_id !== spaceId)
        throw online ? missing() : reviewResync();
    if (!['active', 'withdrawn', 'redacted'].includes(post.lifecycle))
        throw reviewResync();
    if (online && post.lifecycle === 'redacted')
        throw redacted();
}
export function reviewSnapshotItems(snapshotId, manifest) {
    return [
        { snapshot_id: snapshotId, item_type: 'target_post', item_id: manifest.target.ref.post_id, revision: manifest.target.ref.revision, sha256: manifest.target.content_hash },
        ...manifest.dependencies.map(d => ({ snapshot_id: snapshotId, item_type: 'dependency_post', item_id: d.ref.post_id, revision: d.ref.revision, sha256: d.content_hash })),
        ...manifest.artifacts.map(a => ({ snapshot_id: snapshotId, item_type: 'artifact', item_id: a.artifact_id, revision: 0, sha256: a.sha256 })),
        { snapshot_id: snapshotId, item_type: 'space_rules', item_id: manifest.space_id, revision: manifest.rules_revision, sha256: null },
    ];
}
const itemKey = (i) => JSON.stringify([i.item_type, i.item_id, i.revision]);
/** Only raw SHA/header/item/visibility checks here; JCS belongs exclusively to the review module. */
function readSnapshotRecords(storage, spaceId, snapshotId, online) {
    const record = storage.findReviewSnapshotById(snapshotId);
    if (!record || record.space_id !== spaceId)
        throw online ? missing() : reviewResync();
    if (!record.target_ref || !id(record.target_ref.post_id))
        throw reviewResync();
    postReference(storage, spaceId, record.target_ref.post_id, online);
    if (record.id !== snapshotId || !positive(record.target_ref.revision) || !positive(record.policy_revision) || !positive(record.rules_revision) ||
        !id(record.created_by) || !id(record.created_at) || typeof record.manifest_json !== 'string' || Buffer.byteLength(record.manifest_json, 'utf8') > 262144 ||
        !goodHash(record.manifest_sha256) || createHash('sha256').update(record.manifest_json, 'utf8').digest('hex') !== record.manifest_sha256)
        throw reviewResync();
    let manifest;
    try {
        const value = JSON.parse(record.manifest_json);
        if (!isReviewSnapshotManifest(value))
            throw reviewResync();
        manifest = value;
    }
    catch (error) {
        if (error instanceof DetunedError)
            throw error;
        throw reviewResync();
    }
    for (const ref of [manifest.target.ref, ...manifest.dependencies.map(d => d.ref)])
        postReference(storage, spaceId, ref.post_id, online);
    for (const entry of manifest.artifacts) {
        const artifact = storage.findArtifactById(entry.artifact_id);
        if (!artifact || artifact.space_id !== spaceId || artifact.visibility !== 'space')
            throw online ? missing() : reviewResync();
        if (!['ready', 'missing', 'redacted'].includes(artifact.state))
            throw reviewResync();
        if (online && artifact.state === 'redacted')
            throw redacted();
        if (artifact.sha256 !== entry.sha256 || artifact.bytes !== entry.bytes)
            throw reviewResync();
    }
    if (manifest.space_id !== spaceId || !isDeepStrictEqual(manifest.target.ref, record.target_ref) || manifest.rules_revision !== record.rules_revision || manifest.policy_revision !== record.policy_revision)
        throw reviewResync();
    for (const entry of [manifest.target, ...manifest.dependencies]) {
        const metadata = storage.getPostRevisionMetadata(entry.ref.post_id, entry.ref.revision);
        if (!metadata || metadata.content_hash !== entry.content_hash)
            throw reviewResync();
    }
    let rules;
    try {
        rules = storage.getSpaceRevision(spaceId, manifest.rules_revision);
    }
    catch (error) {
        if (error instanceof SyntaxError)
            throw reviewResync();
        throw error;
    }
    if (!rules || !rules.review_policy || !Array.isArray(rules.review_policy.required_checks) || !rules.check_profiles || typeof rules.check_profiles !== 'object')
        throw reviewResync();
    const expected = reviewSnapshotItems(snapshotId, manifest), actual = storage.listReviewSnapshotItems(snapshotId);
    if (new Set(expected.map(itemKey)).size !== expected.length || actual.length !== expected.length ||
        !isDeepStrictEqual([...expected].sort((a, b) => cmp(itemKey(a), itemKey(b))), [...actual].sort((a, b) => cmp(itemKey(a), itemKey(b)))))
        throw reviewResync();
    // Set-like input fields have explicit canonical order; meaningful arrays remain untouched.
    const checks = [...manifest.review_policy.required_checks].sort(cmp);
    if (checks.some(n => !id(n) || !/\S/.test(n)) || checks.length > 32 || new Set(checks).size !== checks.length ||
        !isDeepStrictEqual(checks, manifest.review_policy.required_checks) ||
        !isDeepStrictEqual(manifest.check_profiles.map(p => p.check_name), checks))
        throw reviewResync();
    const normalizePolicy = { ...rules.review_policy, required_checks: [...rules.review_policy.required_checks].sort(cmp) };
    if (!isDeepStrictEqual(normalizePolicy, manifest.review_policy))
        throw reviewResync();
    for (const profile of manifest.check_profiles) {
        const original = Object.hasOwn(rules.check_profiles, profile.check_name) ? rules.check_profiles[profile.check_name] : undefined;
        if (!original || !Array.isArray(original.verifier_actor_ids) || !isDeepStrictEqual(profile, { check_name: profile.check_name, config_sha256: original.config_sha256,
            verifier_actor_ids: [...original.verifier_actor_ids].sort(cmp), description: original.description }))
            throw reviewResync();
    }
    const ordered = (items, key) => {
        const keys = items.map(key);
        return new Set(keys).size === keys.length && isDeepStrictEqual(keys, [...keys].sort(cmp));
    };
    const refs = manifest.dependencies.map(d => JSON.stringify([d.ref.post_id, d.ref.revision]));
    if (new Set(refs).size !== refs.length || manifest.dependencies.some(d => isDeepStrictEqual(d.ref, manifest.target.ref)) ||
        !isDeepStrictEqual(manifest.dependencies, [...manifest.dependencies].sort((a, b) => cmp(a.ref.post_id, b.ref.post_id) || a.ref.revision - b.ref.revision)) ||
        !ordered(manifest.artifacts, a => a.artifact_id) || !ordered(manifest.contributors, a => a) ||
        !isDeepStrictEqual(manifest.code_refs, [...manifest.code_refs].sort((a, b) => cmp(a.repository, b.repository) || cmp(a.commit, b.commit) || cmp(a.source_artifact_id, b.source_artifact_id))) ||
        new Set(manifest.code_refs.map(c => JSON.stringify([c.repository, c.commit, c.source_artifact_id]))).size !== manifest.code_refs.length ||
        manifest.code_refs.some(c => !manifest.artifacts.some(a => a.artifact_id === c.source_artifact_id)))
        throw reviewResync();
    let nodes = 0;
    const stack = [{ value: manifest, depth: 0 }];
    while (stack.length) {
        const item = stack.pop();
        if (++nodes > 20000 || item.depth > 64)
            throw reviewResync();
        if (item.value !== null && typeof item.value === 'object')
            for (const value of Object.values(item.value))
                stack.push({ value, depth: item.depth + 1 });
    }
    return { record, manifest };
}
function reconstructRequestView(storage, spaceId, requestId, version, online) {
    const head = storage.findReviewRequestById(requestId);
    if (!head || head.space_id !== spaceId)
        throw online ? missing() : reviewResync();
    if (!head.target_ref || !id(head.target_ref.post_id))
        throw reviewResync();
    postReference(storage, spaceId, head.target_ref.post_id, online);
    if (head.id !== requestId || !positive(head.round) || !positive(head.version) || !id(head.requested_by) || !id(head.created_at))
        throw reviewResync();
    const storedVersion = storage.findReviewRequestVersion(requestId, version ?? head.version);
    const snapshot = readSnapshotRecords(storage, spaceId, head.snapshot_id, online);
    if (!storedVersion || storedVersion.request_id !== requestId || !positive(storedVersion.version) || storedVersion.version > (head.version) ||
        !id(storedVersion.changed_by) || !id(storedVersion.changed_at) || !['collecting', 'cancelled', 'revealed', 'stale', 'accepted', 'changes_requested', 'rejected'].includes(storedVersion.phase) ||
        !Number.isSafeInteger(storedVersion.submitted_count) || storedVersion.submitted_count < 0 || storedVersion.submitted_count > 5 ||
        (storedVersion.phase === 'cancelled' ? (storedVersion.version < 2 || typeof storedVersion.reason !== 'string' || !/\S/.test(storedVersion.reason) || storedVersion.reason.length > 500) : storedVersion.reason !== null) ||
        (storedVersion.version === 1 && (storedVersion.phase !== 'collecting' || storedVersion.submitted_count !== 0 || storedVersion.changed_by !== head.requested_by || storedVersion.changed_at !== head.created_at)) ||
        !isDeepStrictEqual(snapshot.record.target_ref, head.target_ref))
        throw reviewResync();
    if ((version === undefined || version === head.version) && !isDeepStrictEqual({ request_id: head.id, version: head.version, phase: head.phase, changed_by: head.changed_by, changed_at: head.changed_at, reason: head.reason, submitted_count: head.submitted_count }, storedVersion))
        throw reviewResync();
    if (['accepted', 'changes_requested', 'rejected'].includes(storedVersion.phase)) {
        const decision = storage.findReviewDecisionByRequestId(requestId);
        if (!decision || decision.request_version !== storedVersion.version || decision.outcome !== storedVersion.phase ||
            decision.actor_id !== storedVersion.changed_by || decision.created_at !== storedVersion.changed_at || decision.snapshot_sha256 !== snapshot.record.manifest_sha256)
            throw reviewResync();
    }
    const submissions = storage.listReviewSubmissions(requestId);
    if (!Number.isSafeInteger(head.submitted_count) || head.submitted_count < 0 || head.submitted_count > 5 || submissions.length !== head.submitted_count ||
        submissions.filter(s => s.request_version <= storedVersion.version).length !== storedVersion.submitted_count ||
        new Set(submissions.map(s => s.assignment_id)).size !== submissions.length ||
        new Set(submissions.map(s => s.request_version)).size !== submissions.length ||
        (storedVersion.phase === 'revealed' && (storedVersion.submitted_count === 0 || submissions.some(s => s.revealed_at === null))))
        throw reviewResync();
    const assignments = storage.listReviewAssignments(requestId);
    const reviewers = assignments.map(a => a.reviewer_actor_id).sort(cmp);
    if (assignments.some(a => !id(a.id) || a.request_id !== requestId || !id(a.reviewer_actor_id) || (a.group_at_assignment !== null && typeof a.group_at_assignment !== 'string')) ||
        reviewers.length !== snapshot.manifest.review_policy.required_reviewers || new Set(reviewers).size !== reviewers.length ||
        reviewers.some(actorId => snapshot.manifest.contributors.includes(actorId)))
        throw reviewResync();
    if (head.submitted_count > assignments.length || (['revealed', 'accepted', 'changes_requested', 'rejected'].includes(storedVersion.phase) && storedVersion.submitted_count !== assignments.length))
        throw reviewResync();
    if (snapshot.manifest.review_policy.distinct_independence_groups) {
        const groups = assignments.map(a => a.group_at_assignment);
        if (groups.some(group => typeof group !== 'string' || !/\S/.test(group)) || new Set(groups).size !== groups.length)
            throw reviewResync();
    }
    return { id: head.id, space_id: head.space_id, target_ref: { ...head.target_ref }, snapshot_id: head.snapshot_id,
        snapshot_sha256: snapshot.record.manifest_sha256, rules_revision: snapshot.record.rules_revision, policy_revision: snapshot.record.policy_revision,
        round: head.round, phase: storedVersion.phase, version: storedVersion.version, requested_by: head.requested_by, created_at: head.created_at,
        changed_by: storedVersion.changed_by, changed_at: storedVersion.changed_at, reason: storedVersion.reason, reviewer_actor_ids: reviewers };
}
/** Online callers cannot opt out of the current material privacy gate. */
export function readReviewSnapshotRecords(storage, spaceId, snapshotId) {
    return readSnapshotRecords(storage, spaceId, snapshotId, true);
}
export function reconstructReviewRequestView(storage, spaceId, requestId, version) {
    try {
        return reconstructRequestView(storage, spaceId, requestId, version, true);
    }
    catch (error) {
        if (error instanceof SyntaxError)
            throw reviewResync();
        throw error;
    }
}
/** Maintenance only: validates intrinsic frozen records and returns no material/body.
 * Redaction preserves original narrow hashes; never read or restore sanitized historical bodies. */
export function validatePersistedReviewRequestBinding(storage, spaceId, requestId, version, snapshotId, manifestSha256, phase) {
    const view = reconstructRequestView(storage, spaceId, requestId, version, false);
    if (view.snapshot_id !== snapshotId || view.snapshot_sha256 !== manifestSha256 || view.phase !== phase)
        throw reviewResync();
}
/** Fresh actions only. Caller first applies current authentication and online material privacy. */
export function assertReviewSnapshotCurrent(storage, records) {
    const { record, manifest } = records, space = storage.findSpaceById(record.space_id);
    const stale = () => new DetunedError(ErrorCode.SNAPSHOT_STALE, 'Review material is no longer current and available.', 409);
    if (!space || space.policy_revision !== record.policy_revision)
        throw stale();
    for (const entry of [manifest.target, ...manifest.dependencies]) {
        const post = storage.findPostById(entry.ref.post_id);
        if (!post || post.lifecycle !== 'active' || post.current_revision !== entry.ref.revision)
            throw stale();
    }
    for (const entry of manifest.artifacts)
        if (storage.findArtifactById(entry.artifact_id)?.state !== 'ready')
            throw stale();
}
/** Infrastructure/internal metadata only: intrinsic validation, not an online read authorization.
 * Callers never expose this manifest as a substitute for readReviewSnapshotRecords. */
export function readIntrinsicReviewRequestRecords(storage, spaceId, requestId) {
    try {
        reconstructRequestView(storage, spaceId, requestId, undefined, false);
        const head = storage.findReviewRequestById(requestId);
        if (!head)
            throw reviewResync();
        const records = readSnapshotRecords(storage, spaceId, head.snapshot_id, false);
        return { head: structuredClone(head), ...records };
    }
    catch (error) {
        if (error instanceof SyntaxError)
            throw reviewResync();
        throw error;
    }
}
//# sourceMappingURL=review-request-records.js.map