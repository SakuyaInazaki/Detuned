# M2.1 Unit A independent source review

Preparation review only; no build/full suite/probes executed. Reviewed frozen approved-contract, ArtifactService, artifact-references, AuthService.refreshContext, artifact result-ref branches and SQLite additions.

No finite-scope blocking finding identified:

- New artifact.create has exact operation/ref whitelist and artifact_id required; persisted precheck invokes structural and entity semantics. Entity validity checks scope/hash/bytes/base MIME, intentionally excludes mutable state and physical file presence, so later redaction/missing does not invalidate startup.
- Replay creates a candidate under the same ownership protocol, reconstructs typed DTO, then ArtifactService.getMetadata rechecks current ACL/state/exists; candidate cleaned on replay/conflict. Public projection omits storage key and original filename.
- Upload authorization refreshes actor/credential before publish and again inside immediate transaction, then requireSpaceAccess fetches membership. No asynchronous FS work inside the transaction. quota, ready row, minimal object_id event and idempotency persist together; quota sums all artifact states.
- publishedKey assigned only after successful publish; failure cannot discard a collision's pre-existing destination. Finally handles only own staged key and successfully published candidate; original failure survives cleanup failure.
- post/initial-post/revision invoke linkRevisionArtifacts within their write transactions; duplicate IDs rejected, scope/state/visibility checked and evidence inclusion enforced before associative inserts. No FS await in reference transaction, per approved contract.
- SQLite changes are query/insert helpers over existing artifact/revision_artifacts tables; no SQL/schema/DDL changes required.

Independent execution remains pending Unit B freeze. FS durability/no-overwrite/symlink/GC and multipart exhaustion cannot be inferred from the business tests and will be evaluated against real FS/SQLite/HTTP. Parent approves interface/overall acceptance.

Final execution and parent-accepted local engineering conclusion: r1-final/verification.md (210/210 across18files, original29commands28/29, versionedAD5/5, six independent groups6/6). Preparation-time statements above retain their historical context; current results use the final pointer.
