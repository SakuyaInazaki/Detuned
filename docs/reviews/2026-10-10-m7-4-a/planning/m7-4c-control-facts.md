# M7.4-C fixed Codex control contacts (static only)

2026-10-10. No native execution, help/version command, account/configuration read, installation or model request. This complements `m7-4c-codex-isolation-facts.md`; it does not supersede its freeze or the previous blocked probes. A v2 review takes priority over further investigation.

## Known installed file

The sealed M4.5-A `author/codex/stdio-probe.mjs` and `stdio-state-probe.mjs` identify exactly:

`/opt/homebrew/lib/node_modules/@openai/codex/node_modules/@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/bin/codex`

Only that explicit file was stat/realpath/stream-hashed in this read-only pass; no home search or executable invocation occurred. Actual realpath equals that path, bytes `260472144`, SHA-256 `80a3933d11a9d13ef806aa24f7bb8afc9169cfe4e9b09d6da6a92922cbde9cff`. This binds file identity, not successful protocol behavior or an independently rerun version command.

## Already generated fixed protocol

Source: sealed `docs/reviews/2026-10-09-m4-5-a/author/codex/generated-protocol/` and its generator manifest. No generator was rerun.

| Operation | Existing generated shape / old probe usage |
| --- | --- |
| initialize | `v1/InitializeParams.json` requires `clientInfo`; `capabilities` optional. Old probe uses `{clientInfo:{name:'private-detuned-probe',version:'1'},capabilities:{experimentalApi:true}}`, then sends the `initialized` notification. |
| thread/start | `v2/ThreadStartParams.json` has no required keys. `cwd`, `ephemeral` and `config` are supported; `config` is an object permitting additional properties. Old probe supplies owned cwd, ephemeral true and explicit `mcp_servers.detuned` command/args/env. This schema alone does not prove runtime acceptance of every nested configuration value. |
| mcpServerStatus/list | `v2/ListMcpServerStatusParams.json` has no required keys; exposes `threadId`, `detail`, `cursor`, `limit`. Old probe uses the returned thread ID and `detail:'toolsAndAuthOnly'`, then reads `data`, server name and `tools`. |
| mcpServer/tool/call | `v2/McpServerToolCallParams.json` requires `threadId`, `server`, `tool`; `arguments` and `_meta` are optional. Old probe uses server `detuned`, tool `forum_context`, ordinary arguments, and checks returned `isError` / `structuredContent`. |

The old scripts intended this sequence without `turn/start`, model prompts or login. Their sealed receipts nevertheless show initialization blocked under the OS guard; they do **not** establish that thread creation, discovery or tool calls completed. The previous eight-tool expectation is historical; current Detuned has nine. Nothing here silently upgrades that old evidence.

## Fixed configuration support

Official tag links:

- [core config](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/core/src/config/mod.rs) resolves `cfg.cli_auth_credentials_store` into the CLI authentication backend; it resolves `cfg.sqlite_home` and `cfg.log_dir`, with the latter defaulting to Codex-home logs and SQLite also admitting an environment override. These are actual fixed-version configuration inputs, not invented app-server flags.
- [authentication storage](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/login/src/auth/storage.rs) has the `File` backend and matches that selection to file storage rooted at `codex_home/auth.json`; Keyring/Auto are separate choices. The serialized `file` setting is the candidate explicitly selected backend, rather than an assumption about the default.
- [app-server entry](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/app-server/src/lib.rs) loads configuration and constructs authentication from it before processing the control chain. The old state probe already supplied `-c sqlite_home=...` and `-c log_dir=...`; its failure is preserved, not treated as success.

## Unknown acceptance boundary

The generated protocol proves these messages and selectors exist, not that an empty-account app-server can create a thread and establish MCP without initialization-time model catalogue/provider/authentication/network work. This bounded pass did not establish the full fixed thread-start implementation's side effects or a no-account/no-turn successful route. A raw fixed message-processor source fetch was unavailable; no replacement rolling implementation was used. Therefore **no-account, no-model, no-turn thread/start → list → tool/call remains unknown and requires a separately authorized protected experiment**.

The later candidate must retain minimal child environment, private official CODEX_HOME/config/cwd/file-auth/SQLite/log roots and OS denial of real user state/Keychain/external network. It must fail safely if any forbidden access remains; it cannot loosen protection, read user files, or delete old denial evidence to manufacture success. Current M7.4-A scope remains unchanged.
