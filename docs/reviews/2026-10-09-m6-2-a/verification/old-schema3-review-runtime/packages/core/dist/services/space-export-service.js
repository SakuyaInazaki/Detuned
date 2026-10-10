import { createHash, randomUUID } from 'node:crypto';
import { DetunedError, EXPORT_LIMITS, validateSpaceExportLine } from '@detuned/protocol';
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function pick(data, fields) { return Object.fromEntries(fields.map(field => [field, data[field]])); }
const FIELDS = {
    space: ['id', 'slug', 'current_revision', 'policy_revision', 'created_at'],
    space_revision: ['space_id', 'revision', 'objective', 'rules', 'review_policy', 'check_profiles', 'pinned_refs', 'editor_id', 'created_at'],
    thread: ['id', 'space_id', 'title', 'version', 'state', 'creator_id', 'created_at', 'updated_at'],
    thread_version: ['thread_id', 'version', 'title', 'state', 'created_at'],
    post: ['id', 'space_id', 'thread_id', 'author_id', 'kind', 'current_revision', 'lifecycle', 'created_at'],
    post_revision: ['post_id', 'revision', 'title', 'summary', 'body', 'tags', 'structured', 'editor_id', 'created_at'],
    relation: ['id', 'space_id', 'source_post_id', 'source_revision', 'target_post_id', 'target_revision', 'type', 'state', 'version', 'creator_id', 'created_at'],
    relation_resolution: ['id', 'relation_id', 'version', 'resolver_id', 'reason_ref', 'action', 'created_at'],
    revision_artifact: ['post_id', 'revision', 'artifact_id', 'purpose'],
    artifact: ['id', 'space_id', 'owner_id', 'visibility', 'sha256', 'bytes', 'mime', 'state', 'created_at'],
};
function limit(message) { return new DetunedError('EXPORT_LIMIT_EXCEEDED', message, 422); }
function invalidated() { return new DetunedError('EXPORT_INVALIDATED', 'Export was invalidated by a space permission or redaction change; restart the export.', 409); }
/** One content reader per active export; live authorization always uses the original storage. */
export class SpaceExportService {
    storage;
    authService;
    clock;
    sessions = new Set();
    limits;
    constructor(storage, authService, clock, options = {}) {
        this.storage = storage;
        this.authService = authService;
        this.clock = clock;
        this.limits = { ...EXPORT_LIMITS, ...options.limits };
        for (const key of Object.keys(EXPORT_LIMITS)) {
            if (!Number.isSafeInteger(this.limits[key]) || this.limits[key] < (key === 'max_records' ? 0 : 1) || this.limits[key] > EXPORT_LIMITS[key])
                throw new TypeError('Export limits may only reduce the protocol defaults.');
        }
    }
    get activeCount() { return this.sessions.size; }
    open(auth, spaceId, options = {}) {
        this.storage.readSnapshot(() => this.authService.requireSpaceAccess(this.authService.refreshContext(auth), spaceId, 'observer'));
        if (this.sessions.size >= this.limits.max_active)
            throw new DetunedError('RATE_LIMITED', 'Too many active space exports.', 429, false);
        const snapshot = this.storage.openSpaceExportSnapshot(spaceId);
        try {
            const session = new SpaceExportSession(this.storage, this.authService, this.clock, snapshot, auth, spaceId, this.limits, options, () => this.sessions.delete(session));
            this.sessions.add(session);
            return session;
        }
        catch (error) {
            snapshot.close();
            throw error;
        }
    }
    closeAll() {
        for (const session of [...this.sessions])
            session.terminate(new DetunedError('EXPORT_UNAVAILABLE', 'Export service is closing.', 503, false));
    }
}
export class SpaceExportSession {
    storage;
    authService;
    clock;
    snapshot;
    auth;
    spaceId;
    limits;
    options;
    released;
    closed = false;
    terminalError;
    phase = 'header';
    count = 0;
    bytes = 0;
    chain = Buffer.alloc(32);
    checkedThrough;
    timer;
    deadline;
    createdAt;
    exportId = `exp_${randomUUID()}`;
    constructor(storage, authService, clock, snapshot, auth, spaceId, limits, options, released) {
        this.storage = storage;
        this.authService = authService;
        this.clock = clock;
        this.snapshot = snapshot;
        this.auth = auth;
        this.spaceId = spaceId;
        this.limits = limits;
        this.options = options;
        this.released = released;
        this.checkedThrough = snapshot.eventSeq;
        this.createdAt = clock.nowIso();
        this.deadline = performance.now() + limits.deadline_ms;
        this.timer = setTimeout(() => this.terminate(limit('Export duration limit exceeded.')), limits.deadline_ms);
        this.timer.unref?.();
    }
    guard() {
        if (performance.now() >= this.deadline)
            throw limit('Export duration limit exceeded.');
        this.storage.readSnapshot(() => {
            this.authService.requireSpaceAccess(this.authService.refreshContext(this.auth), this.spaceId, 'observer');
            const space = this.storage.findSpaceById(this.spaceId);
            const through = this.storage.getExportEventSeq(this.spaceId);
            if (space.acl_epoch !== this.snapshot.aclEpoch || BigInt(through) < BigInt(this.checkedThrough) || this.storage.hasExportRedactionAfter(this.spaceId, this.checkedThrough, through))
                throw invalidated();
            this.checkedThrough = through;
        });
    }
    postRef(value, evidence = false) {
        if (!object(value))
            return false;
        const fields = evidence ? ['kind', 'post_id', 'revision'] : ['post_id', 'revision'];
        if (Object.keys(value).sort().join(',') !== fields.sort().join(',') || (evidence && value.kind !== 'post') || typeof value.post_id !== 'string' || !Number.isSafeInteger(value.revision) || Number(value.revision) < 1)
            return false;
        const state = this.snapshot.postRef(value.post_id, Number(value.revision));
        return Boolean(state && state.space_id === this.spaceId && state.exists);
    }
    evidence(value) {
        if (!object(value))
            return false;
        if (value.kind === 'post')
            return this.postRef(value, true);
        if (value.kind !== 'artifact' || Object.keys(value).sort().join(',') !== 'artifact_id,kind' || typeof value.artifact_id !== 'string')
            return false;
        const state = this.snapshot.artifactState(value.artifact_id);
        return Boolean(state && state.space_id === this.spaceId && state.visibility === 'space');
    }
    structured(value) {
        if (!object(value))
            throw new DetunedError('EXPORT_UNAVAILABLE', 'Stored structured research content is malformed.', 503, false);
        const output = { ...value };
        let changed = false;
        for (const field of ['source_refs', 'subject_refs', 'evidence_refs'])
            if (Object.hasOwn(value, field)) {
                if (!Array.isArray(value[field])) {
                    delete output[field];
                    changed = true;
                    continue;
                }
                const list = value[field];
                const filtered = list.filter(ref => field === 'evidence_refs' ? this.evidence(ref) : this.postRef(ref));
                output[field] = filtered;
                if (filtered.length !== list.length)
                    changed = true;
            }
        if (Object.hasOwn(value, 'target_ref') && !this.postRef(value.target_ref)) {
            delete output.target_ref;
            changed = true;
        }
        return { value: output, changed };
    }
    project(candidate) {
        const row = candidate.data;
        const data = pick(row, FIELDS[candidate.kind]);
        if (candidate.kind === 'space_revision') {
            if (!Array.isArray(row.pinned_refs))
                throw new DetunedError('EXPORT_UNAVAILABLE', 'Stored pinned references are malformed.', 503);
            const refs = row.pinned_refs.filter(ref => this.postRef(ref));
            data.pinned_refs = refs;
            if (refs.length !== row.pinned_refs.length)
                data.projected = true;
        }
        else if (candidate.kind === 'post' && row.lifecycle === 'redacted') {
            return { id: row.id, space_id: row.space_id, thread_id: row.thread_id, current_revision: row.current_revision, lifecycle: 'redacted', tombstone: true };
        }
        else if (candidate.kind === 'post_revision') {
            if (row.lifecycle === 'redacted')
                return { post_id: row.post_id, revision: row.revision, tombstone: true };
            const structured = this.structured(row.structured);
            data.structured = structured.value;
            if (structured.changed)
                data.projected = true;
            else
                data.source_content_hash = row.content_hash;
        }
        else if (candidate.kind === 'relation' || candidate.kind === 'relation_resolution') {
            if (!this.postRef({ post_id: row.source_post_id, revision: row.source_revision }) || !this.postRef({ post_id: row.target_post_id, revision: row.target_revision }))
                return null;
            if (candidate.kind === 'relation_resolution' && !this.postRef(row.reason_ref))
                return null;
        }
        else if (candidate.kind === 'revision_artifact') {
            if (!this.postRef({ post_id: row.post_id, revision: row.revision }))
                return null;
            const post = this.snapshot.postRef(String(row.post_id), Number(row.revision));
            if (post?.lifecycle === 'redacted')
                return null;
            const artifact = this.snapshot.artifactState(String(row.artifact_id));
            if (!artifact || artifact.space_id !== this.spaceId || artifact.visibility !== 'space')
                return null;
        }
        else if (candidate.kind === 'artifact') {
            if (row.state === 'redacted' || row.state === 'missing')
                return { id: row.id, space_id: row.space_id, state: row.state, tombstone: true };
            if (row.visibility !== 'space' || row.state !== 'ready')
                return null;
            data.content_url = `/api/v1/spaces/${encodeURIComponent(this.spaceId)}/artifacts/${encodeURIComponent(String(row.id))}/content`;
        }
        return data;
    }
    encode(value, chained) {
        if (!validateSpaceExportLine(value))
            throw new DetunedError('EXPORT_UNAVAILABLE', 'Stored material cannot be represented by the export protocol.', 503, false);
        const line = JSON.stringify(value) + '\n';
        const size = Buffer.byteLength(line);
        if (size > this.limits.max_line_bytes || this.bytes + size > this.limits.max_total_bytes)
            throw limit('Export wire byte limit exceeded.');
        if (chained)
            this.chain = createHash('sha256').update(this.chain).update(line, 'utf8').digest();
        this.bytes += size;
        return line;
    }
    /** Synchronous guard immediately before delivery. Call only when downstream is ready for one line. */
    nextLine() {
        if (this.terminalError)
            throw this.terminalError;
        if (this.closed)
            return { kind: 'done' };
        try {
            if (this.phase === 'ended') {
                this.close();
                return { kind: 'done' };
            }
            this.guard();
            if (this.phase === 'header') {
                this.phase = 'records';
                return { kind: 'line', line: this.encode({ type: 'header', format: 'detuned-space-export', version: 2, export_id: this.exportId, created_at: this.createdAt,
                        source: { space_id: this.spaceId, schema_version: 3, snapshot_event_seq: this.snapshot.eventSeq, space_revision: this.snapshot.spaceRevision },
                        identity_semantics: 'source_actor_ids_only', scope: 'public_research', hash_algorithm: 'sha256-chain-v1', formal_review_status: 'excluded', formal_check_status: 'excluded' }, true) };
            }
            for (let skipped = 0; skipped < 128; skipped++) {
                const candidate = this.snapshot.nextCandidate(this.limits.max_raw_bytes);
                if (!candidate) {
                    this.guard();
                    const line = this.encode({ type: 'end', complete: true, record_count: this.count, bytes_before_end: this.bytes, chain_sha256: this.chain.toString('hex') }, false);
                    this.phase = 'ended';
                    return { kind: 'line', line };
                }
                const data = this.project(candidate);
                if (!data)
                    continue;
                if (this.count >= this.limits.max_records)
                    throw limit('Export record count limit exceeded.');
                // Projection is synchronous. Recheck before handing this exact line to transport.
                this.guard();
                const line = this.encode({ type: 'record', seq: this.count + 1, kind: candidate.kind, data }, true);
                this.count++;
                return { kind: 'line', line };
            }
            return { kind: 'pending' };
        }
        catch (error) {
            const failure = error instanceof DetunedError ? error : new DetunedError('EXPORT_UNAVAILABLE', 'Export snapshot could not be read.', 503, false);
            this.terminalError = failure;
            this.close();
            throw failure;
        }
    }
    terminate(error) {
        if (this.closed)
            return;
        this.terminalError = error;
        this.close();
        try {
            this.options.onError?.(error);
        }
        catch { /* Closing and releasing the reader must precede transport callbacks. */ }
    }
    close() {
        if (!this.closed) {
            this.closed = true;
            clearTimeout(this.timer);
            try {
                this.snapshot.close();
            }
            finally {
                this.released();
            }
        }
    }
}
//# sourceMappingURL=space-export-service.js.map