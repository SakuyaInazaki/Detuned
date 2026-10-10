# V12 target authority and protected cleanup exit

Only Claude probe changed; Pi/pure helpers/products/policy/control/tool inputs unchanged. A ran no check/native command. Original v11 call_rejected Error/EPERM remains original evidence; this fix does not infer the actual original PID or prove a native start.

Every remaining process.kill call is in groupExists/stopGroup, first asserting a positive safe integer >1. These receive only workerPGID assigned after exact targeted UID/PGID confirmation. Worker cleanup uses its own ChildProcess handles only with valid positive pid; the obsolete private group branch was removed. Invalid fork values are never negated/probed/signalled.

## States

| State | Permitted stop/probe | Evidence / result | Root removal |
| --- | --- | --- | --- |
| Root registered, no worker created | No PID/group operation | group_probe=not_created; no child to wait | exact allocated/canonical root rm+ENOENT |
| Fork invalid candidate | No signal/probe; wait own actual close within existing budget | fork_pid_present/valid booleans only; group_probe=not_confirmed, group_closed=false, failed | only after actual child close and bootstrap never sent |
| Valid own child, group query not confirmed | Own ChildProcess handle TERM→1sKILL and actual close; no negative PID/group operation | worker_spawned is candidate, never group authority; group_closed=false/failed | same pre-bootstrap condition |
| Confirmed own worker group | Existing bounded exact group TERM/KILL and protected final probe | absent=true only on actual ESRCH; present/EPERM/EACCES is false/unknown and failed | actual child close plus confirmed absence after bootstrap |
| Initializer not settled | No late fork allowed by terminal gate | cleanup unverified false/failed | no absence claim |

The final group probe is now inside attempt and explicit catch. EPERM is safe group_probe=unknown/group_probe_code=EPERM and group_closed=false, not an uncaught exit bypassing report. Own child async spawn error records the first error and sets terminal immediately; later query/assertion/cleanup cannot overwrite it. Failure still reaches the final generic no-code wrapper after safe report. Protected abort IPC cannot escape finally either.

## D observer adaptation

root_registered: {stage,privateRoot}, before fork. worker_spawned: {stage,privateRoot,workerPID}, only valid positive own candidate; **no group field**. worker_registered: {stage,privateRoot,workerPID,workerPGID}, exact query-confirmed; later native/mcp fields unchanged. Each trusted callback resolves under terminal/deadline before proceeding; observer throw/hold remains failure. D records root/direct-child/group categories separately and never treats candidate as certified group. Expected controlled rejection at worker_registered now has prefix root_registered → worker_spawned → worker_registered; earlier rejection must assert its distinct no-bootstrap state, not manufacture this prefix.

Root removal for an unconfirmed group is limited to actual closed own child with bootstrap never sent: the fixed private worker cannot start native/MCP before bootstrap. This does not claim unknown group absence; its flag remains false and experiment remains failed. The root is exact owned resource, rm is checked by ENOENT. All 50/60/65 bounds remain; no repeat native/core/Pi execution by A and no optional-experiment success claim.
