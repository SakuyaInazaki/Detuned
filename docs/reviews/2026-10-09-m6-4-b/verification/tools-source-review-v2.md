# A tools F01 static closure — v2

Reviewed manifest SHA b859b8918648f080fcb56c61230ef994715313ee33ac8684d076ab131ecf8826 and identity-v2.diff. All four current hashes match v2; protocol/tools.ts, MCP tool-validation.ts and RT01–04 test hashes are unchanged from v1. Only client.ts changes.

Original F01 remains in [first source review](tools-source-review.md); [DT03 first finding](dt03-first-finding.json) independently observed one session POST after held assignment credential rotation, then ClientProtocolError. First failure is retained, not overwritten.

client.ts:1193–1202 now snapshots this.token before assignment GET. Immediately after assignment await it checks abort first, then credential equality using existing RequestKeyError('IDENTITY_CHANGED', fixed safe message), before session POST. Immediately after POST await it repeats abort-first/equality order before strict isSession, requested space and assignment actor binding, and original bare Session return. This closes the demonstrated preflight rotation path statically. If rotation occurs during an already-started POST, the response is rejected rather than falsely bound; an already-committed server session is not claimed rolled back.

Existing createSession singleattempt, canonical validation-before-HTTP, old eight output branches and MCP prepare/cache are unchanged by this four-line delta. Snapshot is token equality, not an invented actor/eligibility oracle. No B product edits or checks executed; runtime closure and remaining DT03 cases belong to D's authorized window. Static review found no additional blocker in this narrow delta.
