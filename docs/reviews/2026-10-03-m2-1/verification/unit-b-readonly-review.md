# Unit B finite read-only lifecycle review

Reviewed artifact-files, artifact HTTP routes, AppOptions registration and CLI startup/close. No blocking product finding remains after R1 narrow JSON-field error mapping.

- Stage is chunk-wise SHA256/count, O_EXCL/O_NOFOLLOW0600; bounded size, abort listener cleanup and fd close on error. Publish fsyncs regular source file, hardlinks without overwrite, syncs objects directory and only then removes stage. EEXIST never grants target ownership; post-link failure cleans only its target.
- Canonical directory/static symlink guards and generated-key grammar protect root. No claimed defense against privileged simultaneous parent-directory replacement. Cleanup validates live keys, preserves every DB-referenced key regardless state and cleans only known ordinary candidate keys.
- Multipart stage occurs during iteration, but core ownership transfer happens only after iteration completed; all trailing parts/metadata validate first. R1 maps only FST_INVALID_JSON_FIELD_ERROR to approved400; file overflow remains413. Upload lease stays through core create/final cleanup, then releases in finally. Unconfigured blob route throws explicit500 before writing.
- Three routes always register. Download uses current auth/state and owned stream with normalized MIME/content length, attachment, nosniff/private-no-store. Public DTO omits storage_key/original filename. No remote fetch or execution path introduced.
- CLI acquires DirectoryLock, coordinates DB/secret, constructs FS and runs GC against complete key list before building/listening; app composition alone never runs GC. Close keeps app→DB→lock order. Limits validated and explicit configuration is injected.

Independent P05 exercises real collision/symlink/DBtrigger cleanup and lock-held GC with sentinel preservation. Actual CLI startup/failure/lock enforcement are covered by four formal CLI tests, not replaced by P05's manually held lock on an isolated harness. This review does not imply new M3 backup or M6 private workflow.

Final execution and parent-accepted local engineering conclusion: r1-final/verification.md (210/210 across18files, original29commands28/29, versionedAD5/5, six independent groups6/6). Preparation-time statements above retain their historical context; current results use the final pointer.
