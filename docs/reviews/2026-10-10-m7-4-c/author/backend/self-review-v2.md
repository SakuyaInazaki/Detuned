# v2: candidate ownership and failure cleanup

First native failure/report/receipt and v1 freeze remain unchanged. Only the owned Codex script changed; no runtime was performed.

| State | Allowed behavior / reported fact |
|---|---|
| Positive launcher PID received | Add to retained candidate set before callback; mcp_candidate_received=true. onOwnership mcp_spawned carries privateRoot, workerPID, confirmed workerPGID, nativePID and candidate mcpPID. This is not MCP group confirmation. |
| Candidate observer completed | mcp_candidate_observed=true; exact ps/query follows. Fixed mcp_phase values distinguish PID/exec/format/UID/PGID/group-match failure. |
| Same-worker-group and confirmed observer completed | mcp_registered=true only here; mismatch still fails closed with original assertion, no expanded PGID trust. |
| Ack file written | mcp_acknowledged=true; only then may the launcher import MCP. |
| Candidate absence | Only process.kill(positivePID,0) existence probe, never a candidate signal. ESRCH is absent; EPERM/EACCES unknown and present at deadline are false/failure. Only confirmed worker group receives existing TERM/KILL. |
| Root removal | Requires initializer settled, actual worker close, confirmed worker-group absence (or no-bootstrap case) AND every received MCP candidate absent. Unknown/present retains root/registry evidence. An empty candidate set is labelled not-received, not global absence proof. |

The generated trusted launcher now installs its first real timer before dynamic fs import, PID write, ack read or MCP import. The pre-ack timer expires at min(now+3000, shared absolute 75-second work end); acknowledgement switches to that same work end, never adds time. Missing acknowledgement never imports MCP. Whole supervisor remains 90 seconds, worker closes within original internal 85-second bound; D outer95 is unchanged.

Worker gate distinguishes current wall-clock budget expiry (NATIVE_PROBE_DEADLINE) from early cancellation (CANCELLED). Supervisor original ownership/assert failure remains first priority; worker cancellation is not re-labelled as a passed deadline. Public diagnostics are fixed phase/boolean/error enums, no candidate PID/PGID/raw ps. The trusted observer alone receives ownership PIDs/paths. Native policy, argv/environment, methods, ordinary matrix and same-worker-group condition are unchanged.

Static checks only: exact text/diff and hash. No syntax, guard, native, test, build, lint or type command run. Actual next outcome still belongs to D/root; v2 does not certify a Codex MCP group or tool success.
