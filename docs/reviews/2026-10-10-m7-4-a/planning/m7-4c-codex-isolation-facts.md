# M7.4-C Codex isolation: fixed-version read-only facts

Recorded 2026-10-10. This is static research for a possible later package, not an M7.4-A implementation or native execution authorization. No host invocation, installation, configuration/account read, environment mutation, or source/test change was performed. The earlier two OS-guard denial results remain historical evidence; this investigation does not resolve or replace them.

## Fixed source and supported entry point

All implementation links below refer to official `openai/codex` tag `rust-v0.144.6`, rather than current `exec` flags or inferred app-server behavior.

- [utils/home-dir/src/lib.rs](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/utils/home-dir/src/lib.rs): `find_codex_home` uses a nonempty `CODEX_HOME` by checking and canonicalizing that directory. Only its absent-variable branch calls `dirs::home_dir()` and appends `.codex`. A selected directory must already exist and be a directory.
- [app-server/src/lib.rs](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/app-server/src/lib.rs): app-server uses the Codex-home/config-loading path, constructs authentication from resolved config, and derives its installation ID from `config.codex_home`. This is a real app-server source entry point, not an extrapolation from another subcommand.
- [config/src/loader/mod.rs](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/config/src/loader/mod.rs) and [config/src/state.rs](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/config/src/state.rs): the default user configuration path is `codex_home/config.toml`; loader overrides include `user_config_path` and `ignore_user_config`. Their existence does not establish an exposed app-server CLI switch.
- [core/src/config/mod.rs](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/core/src/config/mod.rs): default log directory is under Codex home; SQLite home can instead come from explicit configuration or an environment override before falling back to Codex home.
- [login/src/auth/storage.rs](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/login/src/auth/storage.rs): file authentication storage opens `codex_home/auth.json`; a missing file returns no stored authentication. Keyring/Auto modes are separate backends and can access the OS credential store even though their store key incorporates the selected home.
- [login/src/auth/manager.rs](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/login/src/auth/manager.rs): authentication recognizes `OPENAI_API_KEY`, `CODEX_API_KEY`, and `CODEX_ACCESS_TOKEN`. App-server passing `enable_codex_api_key_env=false` is not proof that all authentication environment inputs are ignored.
- [core-plugins/src/store.rs](https://github.com/openai/codex/blob/rust-v0.144.6/codex-rs/core-plugins/src/store.rs): `PluginStore` derives cache and data roots from `codex_home/plugins/cache` and `codex_home/plugins/data`.

Selecting a native child's own configuration/state root through its official `CODEX_HOME` input is distinct from repurposing that variable as an unrelated shell temporary variable. No parent `HOME`, `CODEX_HOME`, or `process.env` change is needed to express this candidate route.

## Remaining boundaries and unknowns

`CODEX_HOME` alone is not complete isolation. The fixed loader also has system requirements/configuration, macOS managed configuration, and project layers. Authentication backend selection can still reach Keychain; inherited authentication or SQLite environment inputs can redirect behavior. The bounded source review did not locate a distinct sidebar-state path, and does not claim that all indirect state readers are accounted for. No real user files were read to test those questions.

Root's candidate defenses for a separately authorized M7.4-C are: a minimal allowlist child environment excluding inherited auth/SQLite inputs; a task-specific `codexProbeStateDir` supplied only as that child's official `CODEX_HOME`; an owned empty cwd/config; fixed file authentication storage and owned SQLite/log paths; and the retained OS guard denying real user state, Keychain, and external network access. These are candidate constraints, not an implemented or tested probe. Exact supported configuration keys and all resulting paths require the later package's fixed-source review and acceptance.

Static evidence establishes an official directory-selection route. It does not establish successful startup, usable control RPC, absence of every attempted forbidden read, or native certification. Current M7.4-A scope is unchanged; a later task, fresh boundary, and explicit root dispatch would be required before any experiment.
