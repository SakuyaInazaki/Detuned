# M7.4-E A static implementation handoff

Source: `scripts/integrations/codex-check-probe.mjs`, 37714 bytes, SHA256 `aee7ec48fb050f8aaa6ba70307bba2164497579d0e676a459fab2470808a0430`.

The actual pre-edit 34643-byte source is retained in `before/codex-check-probe.mjs` (SHA256 `2edd11e6150b92f3e05cec1b87f010b5b5a94aa99a411f07c7b07f93573918e0`). `source.delta.diff` is a filesystem-only unified diff; `freeze.json` records protected helper and exact unchanged bindings. This is static author evidence, not syntax/runtime success.

## Exact changes

`createTrustedCodexMcpLauncher({privateRoot,workEnd})` is the actual production-used launcher factory. Its registration/ACK files are fixed `mcp-pid`/`mcp-ack`; its built MCP entry is fixed internally from this repository. The function accepts no arbitrary entry/code/env, launches nothing, and importing the source remains host-free. The generated own launcher installs its real <=3s timer before filesystem import, registration write or ACK read. Only after exact own-PID ACK does it replace its own `process.argv[1]` with the fixed built MCP absolute path and perform the same dynamic import. Other argv, environment, policy, source-owned process topology and authority order are unchanged. The ACK-after timer uses the same original work end and is unref'ed so actual MCP EOF can exit naturally; no deadline resets or budget increases.

This fixes the demonstrated control-flow defect: previously `process.argv[1]` remained the launcher, so the imported built MCP entry guard skipped main/bridge.start. It does not establish the absence of other host failures. Original sealed C/C.1/D results remain intact.

Each already-issued `mcpServerStatus/list` result now records only a bounded last summary and response count: response/data/tools shape enums, data count, exact detuned match count, tools count, fixed expected-name presence/missing lists, unexpected count, and next-cursor presence boolean. Unknown names and cursor values are never copied into public diagnostics. The existing private exact catalogue equality remains; successful public tools are the fixed nine names only after that assertion. The original 40 polls/filter/nextCursor behavior is unchanged; pagination is not repaired in this package.

The exact fixed337 `ServerNotification` method is `mcpServer/startupStatus/updated`, with `McpServerStatusUpdatedNotification` parameters. Only notifications matching both actual owned thread ID and literal detuned server are recorded. Public fields are `starting`, `ready`, `failed`, `cancelled`, or `unknown`; failure reason is `reauthenticationRequired`, `none`, or `unknown`. They contain counts and last state only, at most40 matching records, no error text/raw field. A bounded <=40-entry private sanitized tuple queue handles notifications arriving before the thread/start response; once the actual owned ID is known, unmatched entries are discarded and the queue is emptied. Thread IDs never enter the public diagnostics.

## Unchanged static bindings and ownership

The complete 1015-byte `proveCodexMcpOwnership` range remains SHA256 `0202f11b6071607d6180aa833eeb39c42f82a1a2ba019c3df47ea650b9e2acf1`. Exact byte comparisons also retain sandbox policy function, fixed binary constants, native spawn args/environment, detached worker fork environment, five RPC methods and per-request deadline, worker75/85 and supervisor75/85/90 deadline declarations. No control/HTTP call, signal permission, independent-group proof, confirmation/ACK/cancellation/cleanup change is added. External95 capture remains D-owned and unchanged in logic.

A changed only this source and E author/backend evidence. Claude source, D test, C.1 owned-group test, protected pure exports, Pi/product/core/HTTP/protocol/schema, fixed337 files, normal documentation, dependencies and old sealed evidence were not edited by A.

## Validation boundary

A ran no syntax, source-noEmit, tests, build, native, version, account, installation or model command. D owns the actual production-factory real Node/stdio regression and subsequent approved gate/capture execution. B owns actual frozen source/schema review. No host tool certification or acceptance is claimed. Any native attempt still needs separate root release.
