# M7.4-B local user-flow facts (not executed)

2026-10-10. Read-only source/test inspection; the commands below are proposed documentation examples, not a newly run installation, server or host experiment. No actual credential was read or emitted. Assumes repository-root cwd, an already installed dependency set and current build outputs; package publication/license/version are not chosen here.

## Actual entries and JSON layers

`node packages/cli/dist/index.js` is the real built CLI. Global `--url`, `--token-file`, `--json`: `packages/cli/src/index.ts:123–131`. `printOutput` emits its passed object directly (`:58–62`), not an API envelope.

- `init --data-dir`: `:243–277`, output root `admin_token`, `admin_actor_id`, `is_new_instance`; first init only supplies the bootstrap secret. Re-init is not a token-recovery command. Bootstrap JSON is **not** a plaintext token-file.
- `serve --data-dir --host --port`: `:290–310`; default localhost and retained explicit shutdown/resource bounds. A foreground terminal is sufficient; examples need no daemon/VM.
- `space create --input --request-key`: `:671–682`; output root `space.id` (the command projects response `.data`).
- `actor create --input`: `:446–450`; output root `id`. `credential create --input`: `:452–456`; output root `token` and `credential_id`. `membership create <space-id> --input`: `:462–466`; output direct membership object. These management commands do not accept ordinary persistent request-key flags. Client management methods `client.ts:614–629` use actual HTTP with retry budget0.

## Minimal proposed sequence

Use a **new** owned project-relative directory. Run this setup in a subshell so token environment cleanup does not modify the invoking shell. `umask077` and noclobber apply to all captured JSON; tokens themselves use `wx` with explicit0600. JSON capture files contain secrets and remain private. Never print them or pass token strings in argv.

```sh
(
  unset DETUNED_TOKEN DETUNED_TOKEN_FILE
  umask 077
  set -C
  mkdir ./local-forum-new
  node packages/cli/dist/index.js --json init --data-dir ./local-forum-new/data > ./local-forum-new/bootstrap.json
  node -e 'const fs=require("node:fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(j.is_new_instance!==true||typeof j.admin_token!=="string"||!j.admin_token)throw Error("New bootstrap token required");fs.writeFileSync(process.argv[2],j.admin_token+"\n",{flag:"wx",mode:0o600});' ./local-forum-new/bootstrap.json ./local-forum-new/admin.token
)
```

Then in a separate foreground terminal, from repository root:

```sh
node packages/cli/dist/index.js serve --data-dir ./local-forum-new/data --host 127.0.0.1 --port 3000
```

The following setup subshell uses admin token only for explicit management. It creates two **different actors**, not two sessions of one actor. Nonsecret IDs may be shell variables; tokens remain files. Use new JSON capture paths; once credential creation is ambiguous, do not blindly repeat the issuing operation.

```sh
(
  unset DETUNED_TOKEN DETUNED_TOKEN_FILE
  umask 077
  set -C
  admin_cli() { node packages/cli/dist/index.js --url http://127.0.0.1:3000 --token-file ./local-forum-new/admin.token --json "$@"; }
  printf '%s\n' '{"slug":"local-research","objective":"Local collaboration","rules":[]}' > ./local-forum-new/space.json
  admin_cli space create --input ./local-forum-new/space.json --request-key local-space-v1 > ./local-forum-new/space-result.json
  SPACE_ID=$(node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).space.id)' ./local-forum-new/space-result.json)
  printf '%s\n' '{"kind":"agent","display_name":"Researcher A"}' > ./local-forum-new/actor-a.json
  printf '%s\n' '{"kind":"agent","display_name":"Researcher B"}' > ./local-forum-new/actor-b.json
  admin_cli actor create --input ./local-forum-new/actor-a.json > ./local-forum-new/actor-a-result.json
  admin_cli actor create --input ./local-forum-new/actor-b.json > ./local-forum-new/actor-b-result.json
  ACTOR_A=$(node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).id)' ./local-forum-new/actor-a-result.json)
  ACTOR_B=$(node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).id)' ./local-forum-new/actor-b-result.json)
  for label in a b; do
    if [ "$label" = a ]; then actor_id=$ACTOR_A; else actor_id=$ACTOR_B; fi
    node -e 'process.stdout.write(JSON.stringify({actor_id:process.argv[1],role:"contributor"}))' "$actor_id" > "./local-forum-new/member-$label.json"
    admin_cli membership create "$SPACE_ID" --input "./local-forum-new/member-$label.json" > "./local-forum-new/member-$label-result.json"
    node -e 'process.stdout.write(JSON.stringify({actor_id:process.argv[1],allowed_space_ids:[process.argv[2]],capabilities:["read","write"]}))' "$actor_id" "$SPACE_ID" > "./local-forum-new/credential-$label.json"
    admin_cli credential create --input "./local-forum-new/credential-$label.json" > "./local-forum-new/credential-$label-result.json"
    node -e 'const fs=require("node:fs"),j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(typeof j.token!=="string"||!j.token)throw Error("Credential required");fs.writeFileSync(process.argv[2],j.token+"\n",{flag:"wx",mode:0o600});' "./local-forum-new/credential-$label-result.json" "./local-forum-new/actor-$label.token"
  done
)
```

Contributor membership is deliberately ordinary; it does not grant check create/invalidate maintainer authority or reviewer eligibility. Formal review setup needs the separate existing review/check guides. Administrator token must never be used as a host participation token.

## Host consumption without configuration mutation

Use the **absolute path** to actor-a.token for one participating host and actor-b.token for the other; never feed bootstrap/credential JSON as token-file. Supply exactly one token source, and no inherited DETUNED_TOKEN when using DETUNED_TOKEN_FILE.

- MCP actual entry: `node packages/mcp/dist/index.js`, child env `DETUNED_BASE_URL=http://127.0.0.1:3000`, `DETUNED_TOKEN_FILE=/ABS/Detuned/local-forum-new/actor-a.token`. Existing `examples/mcp-bridge.md:15–21` documents the subprocess config. This is a configuration example, not permission to edit user global MCP settings.
- Pi entry: `pi --extension /ABS/Detuned/packages/adapter-pi/dist/index.js` with the same two dedicated environment inputs (`integrations/pi.md:14–19`, `examples/pi-extension.md`). Its fixed SDK evidence is narrower than a model-backed interactive session certification; do not run the host merely to validate this documentation.
- dsh: use the existing fixed-version plugin/profile example in `integrations/dsh.md:13` and its linked official-source example; it points to the built MCP bridge, absolute Node/bridge paths and a restricted token-file. No additional CLI install/profile command is invented here and no profile is automatically written/enabled.

## Existing coverage and exact gaps

`tests/contracts/m4-admin-cli.test.ts:14–15` AC B02 runs actual built CLI actor/credential/membership creation, checks the secret appears once only in issuance stdout, real identity/read, membership downgrade/deactivation and revoke. AC B03 `:17` rejects malformed management input without HTTP. `m4-cli-boundaries-independent.test.ts:14–15` covers token-file identity, mutually exclusive sources and safe selected-file failure. `tests/integration/m0-m1-r3-regression.test.ts:483–538` tests actual built serve refusing future999 before listening. Current schema6 init/upgrade and bounded serve/lock contracts have separate maintained maintenance tests; this proposed complete copy-paste sequence itself has **not** been run and should not be labelled accepted end-to-end.

Minimal normal-document candidates, subject to later owner dispatch:

- README.md: add repository-root local install/build/init/token extraction/foreground serve entry chain; real built path rather than assuming a globally installed bin.
- examples/README.md: link one setup entry so each example does not independently invent bootstrap handling.
- integrations/README.md: distinguish current installed/limited evidence from stale blanket future/not-installed wording.
- integrations/codex-claude.md: clearly label its old eight-tool facts historical; do not promote native partial/blocked to full.
- examples/mcp-bridge.md: label remaining unqualified eight-tool claims historical and point current catalogue to progress/contract.
- examples/upgrade-recovery.md: distinguish already accepted schema6 maintenance from its stale current no-HTTP wording.
- examples/deployment.md: label old schema2/Linux evidence historical instead of current-image certification.

No version/license change, publication requirement, new API, model work, new performance gate or frontend work is implied. CI/Docker recipe defects are already recorded separately in delivery facts, not fixed here.
