# V11 terminal initializer ownership

Closes B F1/F2 only, preserving v10 and its static findings. No runtime/syntax/build/type/test command by A; D handles F3 independently.

Shared terminal flag is set synchronously on signal and on exception/cleanup entry. gate rejects terminal or expired work after binary realpath/stat/hash/output checks, after mkdtemp/realpath/lstat, after targeted UID/PGID queries and observer waits, and before fork/bootstrap/native ack/MCP ack allocation. Observer waiting also races the existing interruption so never-resolve callbacks cannot keep an initializer runnable after cancellation. It never turns callback error/timeout into success. Original error remains primary.

Initializer is separately retained from worker-close wait, with settled bookkeeping. Native registration tasks and MCP watcher remain observed; finally first stops already-known owned worker resources, then uses remaining emergency budget to settle initializer/registration tasks before evaluating resource closure and root absence. No late fork can pass terminal gate. If initialization remains unsettled, worker_closed/group_closed are unverified false and the result failed.

mkdtemp result is now stored as allocatedRoot before canonical realpath. Both spellings are visible to finally; successful cleanup chooses canonical-or-exact-allocated, removes only the owned root and verifies ENOENT. A late allocated result after terminal independently attempts exact-root cleanup and rethrows; it cannot proceed to realpath/fork/bootstrap. A timed-out/failed cleanup is not recorded as absence.

50/60/65 budgets, worker-group structure, guard/control/tool assertions, pure helpers, Pi files and OS policy remain unchanged. All successful resource claims still depend on actual settlement and absence, not Promise.race completion. No claim of arbitrary kernel failure zero residuals or observed native success.
