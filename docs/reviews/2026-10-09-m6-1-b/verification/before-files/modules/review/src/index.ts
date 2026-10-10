import {
  type PostRef, type CreateReviewRequest, type ReviewPolicy, type Post,
  isCreateReviewRequest, isSnapshotReviewPolicy, parseNewTypedStructured, DetunedError, ErrorCode,
} from '@detuned/protocol';
import { type StoragePort, type HasherPort, type ClockPort, type IdGeneratorPort,
  AuthService, type AuthenticatedContext } from '@detuned/core';
import { canonicalizeReviewJson, ReviewCanonicalizationError } from './canonical-json.js';

export interface ReviewSnapshotManifest {
  manifest_version: 1;
  space_id: string;
  target: { ref: PostRef; content_hash: string; statement: string; assumptions: string[]; scope: string; falsification_plan: string };
  dependencies: { ref: PostRef; content_hash: string }[];
  artifacts: { artifact_id: string; sha256: string; bytes: number }[];
  code_refs: CreateReviewRequest['code_refs'];
  rules_revision: number;
  policy_revision: number;
  review_policy: ReviewPolicy;
  check_profiles: { check_name: string; config_sha256: string; verifier_actor_ids: string[]; description: string }[];
  contributors: string[];
  reproduction_instructions: string;
}
const cmp = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const hash = (v: unknown): v is string => typeof v === 'string' && v.length === 64 && /^[0-9a-f]{64}$/.test(v);
const positive = (v: number) => Number.isSafeInteger(v) && v > 0;
const invalid = () => new DetunedError(ErrorCode.VALIDATION_ERROR, 'Review snapshot material is invalid.', 400);
const stale = () => new DetunedError(ErrorCode.SNAPSHOT_STALE, 'Review snapshot material is not current and available.', 409);
const missing = () => new DetunedError(ErrorCode.NOT_FOUND, 'Review material does not exist or is not accessible.', 404);
const broad = () => new DetunedError(ErrorCode.QUERY_TOO_BROAD, 'Review snapshot exceeds its material traversal budget.', 422);
function materialRead<T>(read: () => T): T {
  try { return read(); } catch (error) { if (error instanceof SyntaxError) throw invalid(); throw error; }
}
function distinct(values: string[]) { if (new Set(values).size !== values.length) throw invalid(); }

/** Material construction only: neither reviewer eligibility nor a persisted review round. */
export class ReviewModule {
  constructor(private readonly storage: StoragePort, private readonly hasher: HasherPort,
    private readonly clock: ClockPort, private readonly idGen: IdGeneratorPort,
    private readonly authService: AuthService) {}

  generateSnapshotManifest(auth: AuthenticatedContext, spaceId: string, req: CreateReviewRequest):
    { manifest: ReviewSnapshotManifest; manifestHash: string } {
    return this.storage.readSnapshot(() => {
      const current = this.authService.refreshContext(auth);
      this.authService.requireSpaceAccess(current, spaceId, 'observer');
      if (!isCreateReviewRequest(req)) throw invalid();
      const refKey = (ref: PostRef) => JSON.stringify([ref.post_id, ref.revision]);
      distinct(req.dependency_refs.map(refKey));
      if (req.dependency_refs.some(ref => refKey(ref) === refKey(req.target_ref))) throw invalid();
      distinct(req.code_refs.map(ref => JSON.stringify([ref.repository, ref.commit, ref.source_artifact_id])));
      if (req.code_refs.some(ref => !req.artifact_ids.includes(ref.source_artifact_id))) throw invalid();
      const space = this.storage.findSpaceById(spaceId);
      if (!space) throw missing();
      if (!positive(space.policy_revision)) throw invalid();
      if (space.policy_revision !== req.expected_policy_revision)
        throw new DetunedError(ErrorCode.REVISION_CONFLICT, 'Review policy revision has changed.', 409);
      const rules = materialRead(() => this.storage.getSpaceRevision(spaceId, space.policy_revision));
      if (!rules || !positive(rules.revision) || !isSnapshotReviewPolicy(rules.review_policy)) throw invalid();
      const checks = rules.review_policy.required_checks;
      if (checks.length > 32 || checks.some(name => typeof name !== 'string' || !/\S/.test(name))) throw invalid();
      distinct(checks);
      const profiles = [...checks].sort(cmp).map(check_name => {
        const profile = rules.check_profiles && typeof rules.check_profiles === 'object' && Object.hasOwn(rules.check_profiles, check_name) ? rules.check_profiles[check_name] : undefined;
        if (!profile || !hash(profile.config_sha256) || !Array.isArray(profile.verifier_actor_ids) || profile.verifier_actor_ids.length > 128 ||
          profile.verifier_actor_ids.some(id => typeof id !== 'string' || !id) || typeof profile.description !== 'string') throw invalid();
        distinct(profile.verifier_actor_ids);
        return { check_name, config_sha256: profile.config_sha256, verifier_actor_ids: [...profile.verifier_actor_ids].sort(cmp), description: profile.description };
      });
      const contributors = new Set(req.declared_contributors);
      let revisionsScanned = 0;
      const add = (id: string) => { if (typeof id !== 'string' || !id) throw invalid(); contributors.add(id); if (contributors.size > 4096) throw broad(); };
      const collect = (post: Post) => {
        add(post.author_id);
        let after: number | undefined;
        while (true) {
          const page = this.storage.listPostRevisionMetadata(post.id, 100, after);
          for (const metadata of page.revisions) {
            if (++revisionsScanned > 10000) throw broad();
            if (!positive(metadata.revision) || (after !== undefined && metadata.revision >= after)) throw invalid();
            add(metadata.editor_id); after = metadata.revision;
          }
          if (!page.has_more) break;
          if (!page.revisions.length) throw invalid();
        }
      };
      const read = (ref: PostRef) => {
        const post = this.storage.findPostById(ref.post_id);
        if (!post || post.space_id !== spaceId) throw missing();
        if (post.lifecycle === 'redacted') throw new DetunedError(ErrorCode.CONTENT_REDACTED, 'Review material has been redacted.', 410);
        if (post.lifecycle !== 'active' || !positive(post.current_revision) || post.current_revision !== ref.revision) throw stale();
        const revision = materialRead(() => this.storage.getPostRevision(post.id, ref.revision));
        if (!revision) throw missing();
        if (!hash(revision.content_hash)) throw invalid();
        collect(post);
        return { post, revision };
      };
      const target = read(req.target_ref);
      if (target.post.kind !== 'claim') throw invalid();
      // Parser owns the existing strict typed-material rules; no historical rewrite.
      let structured: ReturnType<typeof parseNewTypedStructured>;
      try { structured = parseNewTypedStructured('claim', target.revision.structured); } catch { throw invalid(); }
      if (!structured || !('statement' in structured)) throw invalid();
      const dependencies = req.dependency_refs.map(ref => {
        const material = read(ref);
        return { ref: { ...ref }, content_hash: material.revision.content_hash };
      }).sort((a, b) => cmp(a.ref.post_id, b.ref.post_id) || a.ref.revision - b.ref.revision);
      const artifacts = req.artifact_ids.map(artifact_id => {
        const artifact = this.storage.findArtifactById(artifact_id);
        if (!artifact || artifact.space_id !== spaceId || artifact.visibility !== 'space') throw missing();
        if (artifact.state === 'redacted') throw new DetunedError(ErrorCode.CONTENT_REDACTED, 'Review material has been redacted.', 410);
        if (artifact.state !== 'ready') throw stale();
        if (!hash(artifact.sha256) || !Number.isSafeInteger(artifact.bytes) || artifact.bytes < 0) throw invalid();
        return { artifact_id, sha256: artifact.sha256, bytes: artifact.bytes };
      }).sort((a,b) => cmp(a.artifact_id,b.artifact_id));
      const manifest: ReviewSnapshotManifest = {
        manifest_version: 1, space_id: spaceId,
        target: { ref: { ...req.target_ref }, content_hash: target.revision.content_hash,
          statement: structured.statement, assumptions: [...structured.assumptions], scope: structured.scope, falsification_plan: structured.falsification_plan },
        dependencies, artifacts,
        code_refs: req.code_refs.map(ref => ({...ref})).sort((a,b) => cmp(a.repository,b.repository) || cmp(a.commit,b.commit) || cmp(a.source_artifact_id,b.source_artifact_id)),
        rules_revision: rules.revision, policy_revision: space.policy_revision,
        review_policy: { ...rules.review_policy, required_checks: [...checks].sort(cmp) },
        check_profiles: profiles, contributors: [...contributors].sort(cmp), reproduction_instructions: req.reproduction_instructions,
      };
      try {
        const canonical = canonicalizeReviewJson(manifest);
        return { manifest, manifestHash: this.hasher.sha256(canonical) };
      } catch (error) {
        if (!(error instanceof ReviewCanonicalizationError)) throw error;
        if (error.reason === 'max_bytes') throw new DetunedError(ErrorCode.PAYLOAD_TOO_LARGE, 'Review snapshot exceeds its encoded byte budget.', 413);
        if (error.reason === 'max_depth' || error.reason === 'max_nodes') throw broad();
        throw invalid();
      }
    });
  }
}
