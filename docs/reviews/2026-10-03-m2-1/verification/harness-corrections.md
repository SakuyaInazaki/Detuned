# Independent fixture corrections and teardown attribution

No product execution after parentR1pause. First/second timeout logs remain. They do not justify a passing or failing product conclusion.

Confirmed setup errors in the draft:

- Credential creation API returns data.credential_id, not data.credential.id. Corrected request target lookup in P04; the draft could throw while a paused request remained open.
- Credential/member revocation legitimately changes events/state outside artifact upload. P04 now captures artifact/event/idempotency baseline after the administrative revocation, then asserts finalize adds no artifact commit. It does not mistake legitimate revocation events for attachment partial writes.
- raw multipart calls now have bounded10second request timeout and resume/destroy, with immediately observed rejection; deliberately incomplete uploads explicitly abort then await observed failure.

Teardown cause remains **unresolved pending frozen execution**: second/third stderr shows P01 and P02 assertions completed, but no P03 entry; logging occurs immediately before h.close, so it isolates waiting after P02 to teardown, not a failed P03 quota assertion. Earlier draft did not record active server requests, response completion or socket status, so it cannot prove idle-client/setup cause and cannot rule out a production stream/shutdown issue.

The factory now tracks every onRequest/onResponse pair and server connection/close socket count. Before force-ending only its own temporary connections, teardown logs active_requests and socket_count. It retains these snapshots rather than hide them. After R1freeze we will distinguish an unfinished deliberate request, idle agent socket, or a normal content request lacking response completion. If normal complete content leaves the server/CLI close stuck, report a concrete finite lifecycle finding to parent; force close is fixture cleanup and does not establish graceful shutdown correctness. Do not broaden to generalM3shutdown work.

Final pointer: R1 execution completed six groups6/6. observed-content-close-both.json separately verifies fully consumed nonempty and zero-byte content followed by ordinary app.close, both succeed(75/67ms); active onResponse bookkeeping clears after50mssettle. This resolves the finite teardown investigation without using force-close as product graceful-shutdown evidence. See r1-final/verification.md; earlier failures remain historical and unchanged.
