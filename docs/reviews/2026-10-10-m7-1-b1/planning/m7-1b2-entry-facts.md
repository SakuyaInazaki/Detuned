# M7.1-B2 entry facts (read-only, 2026-10-10)

No product/task/interface implementation, installation, host/model execution or version claim. B1 freeze remains intact; final task and ownership are root decisions.

## CLI

`packages/cli/src/index.ts` has no top-level check command, so a check namespace has no observed Commander collision. Existing review has rounds/read/snapshot/assignment/submission/submissions/status/decision/request/submit/finalize/cancel/artifact-upload. Ordinary artifact upload/metadata/download is separate. `withArtifactSignal` uses owned SIGINT/SIGTERM AbortController and removes handlers; `readArtifactBlob`/`publishArtifactFile` in `packages/cli/src/artifact-io.ts` provide safe file snapshot/no-clobber publishing and should be reused without weakening checks. Download prints metadata summary after publication, never raw binary stdout.

`getWriteContext` creates FileRequestKeyStore only when both --request-key-dir and --logical-operation-id exist, and rejects mixing option --request-key or JSON request_key. Current review JSON writes accept --input/stdin object, strip request_key then call typedclient. B1 ordinary create/invalidate now register persistent scopes by request/run; they can use this context. Verify receipt/log must not use this context: their client options forbid logicalOperationId, and CLI must reject persistent flags before input/file/token/network effects. Their explicit --request-key/JSON key or client per-call key is distinct. Issuer is once-only plaintext/no key/retry0; CLI should preserve safe raw error boundary and not persist its token. Twelve existing B1 client operations are available after B1 acceptance, not an authorization to duplicate domain rules.

## Nine ordinary tools

`packages/protocol/src/tools.ts` owns canonical ToolReadParamsUnion/ToolReviewParamsUnion, typeobject/anyOf schema and validateToolParams. Add ordinary create/invalidate and selected safe read branches here, within existing forum_review/forum_read names, not a tenth tool. Current write branches require explicit request_key. `packages/client/src/client.ts::callTool` is the one typed dispatch point reused by both hosts. Root still must choose read kind/op names and exact branch fields; no names are invented here.

`packages/mcp/src/tool-validation.ts` exposes flat canonical and wrapped {input} versions and compiles SDK Ajv validators before validateToolParams. `bridge.ts` validates before `binding.prepare` and then calls client.callTool. Pi `packages/adapter-pi/src/index.ts` registers DETUNED_TOOLS through adaptToolSchema preserving full object; `runtime.ts::tool` validates before prepare/callTool and owns cancellation/generation. Thus canonical tools + shared callTool are the minimal product接点; MCP/Pi runtime edits are not inherently needed to grow strict branches, but their tests must verify both advertised schemas and executions.

`packages/client/src/session-binding.ts::prepare` still does ordinary capabilities/getMe/diagnostic session. Verify credentials are intentionally incompatible; do not loosen this or add issuer/verify receipt/log writes to normal tools. Ordinary safe reads remain server-controlled currentACL/sealed/privacy, including check-bound material; binaries should retain existing tool output bounds rather than embed download bytes. The exact safe read subset/branch structure is a root task decision.

## Pinned host facts

Current `integrations/dsh.md` pins official DeepSeek Harness source 5badb15009ae1756c3afe0ae0cef1faafc290ccc, official MCP client README and tool authoring docs at that commit. compatibility.json records @deepseek-ai/dsh-mcp-client@0.2.1-alpha.1, plugin/registry limited nine-tool evidence, full CLI/profile/model未测. `scripts/integrations/dsh-runtime/launch.mjs` checks that source SHA and Vitest4.1.8 before loading source; it was read, not run. Its existing runtime/loader/experiment config testfiles are precise possible evidence接点, not new installation authorization. dsh execute returns canonical JSON, not Pi content/details.

`integrations/pi.md` official public extension registration and fixed types are reflected in `packages/adapter-pi`; package.json and actual installed package at packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent/package.json both read as0.87.1. Current `tests/fixtures/pi-runtime/native-lifecycle.mjs` checks fixed loader SHA81106b07522aaf9197858c4679fecd7fbd23c346376d6e1f2cc3dd5294d543f4; that internal loader is test-only, not product/public SDK. compatibility.json preserves partial SDK/native/lifecycle nine-tool result, no fullCLI/profile/RPC/model. No official versions were refreshed or host processes launched.

## Narrow owner candidates, not dispatch

Product minimum: packages/cli/src/index.ts; packages/protocol/src/tools.ts; packages/client/src/client.ts. Existing safe file IO/context, binding and adapters can be reused unchanged. New focused CLI/tool tests should be root-selected; existing relevant regression references are tests/contracts/m6-review-cli.test.ts, m6-review-tools.test.ts, m6-review-tools-independent.test.ts, m4-mcp-schema.test.ts, m4-mcp-input-mode.test.ts, m4-pi-runtime.test.ts, m4-pi-native-lifecycle.test.ts and scripts/integrations/dsh-runtime/runtime.spec.ts. Do not expand all of them reflexively; root/D select required existing or new coverage and pin evidence. Metadata/examples/compatibility are separate closing owners, not automatic host upgrades.

No observed conflict with root ordinary-tool scope. Main risks are accidental use of persistent key context by verify CLI, accidentally putting issuer into ordinary tool schema, inventing generic URLs/HTTP business rules, or treating old fixed-host evidence as validation of expanded branches. B1 real failures take priority.
