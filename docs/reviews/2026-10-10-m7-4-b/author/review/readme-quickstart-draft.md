# README快速开始草稿（待最小doc smoke，不称整段实跑）

从仓库root运行；需要已安装兼容Node/pnpm与依赖。新安装/最低Node22/远端CI本包未新认证。数据库、bootstrap与token放在仓库外新目录；mkdir遇已有目录立即停止，不覆盖旧数据。

```sh
pnpm install --frozen-lockfile
pnpm build
```

已有当前构建产物可跳过重复安装。以下私有init步骤与两次serve/reinit已由LS01有限验证；整段两个普通身份setup尚未copy-paste实跑。JSON不是token-file。

```sh
(
  unset DETUNED_TOKEN DETUNED_TOKEN_FILE
  set -eu
  detunedLocalDir="$HOME/Detuned-local-new"
  umask 077
  set -C
  mkdir "$detunedLocalDir"
  node packages/cli/dist/index.js --json init --data-dir "$detunedLocalDir"/data > "$detunedLocalDir"/bootstrap.json
  node -e 'const fs=require("node:fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(j.is_new_instance!==true||typeof j.admin_token!=="string"||!j.admin_token)throw Error("New bootstrap token required");fs.writeFileSync(process.argv[2],j.admin_token+"\n",{flag:"wx",mode:0o600});' "$detunedLocalDir"/bootstrap.json "$detunedLocalDir"/admin.token
)
```

Then in a separate foreground terminal, from repository root:

```sh
detunedLocalDir="$HOME/Detuned-local-new"
node packages/cli/dist/index.js serve --data-dir "$detunedLocalDir"/data --host 127.0.0.1 --port 3000
```

The following setup subshell uses admin token only for explicit management. It creates two **different actors**, not two sessions of one actor. Nonsecret IDs may be shell variables; tokens remain files. Use new JSON capture paths; once credential creation is ambiguous, do not blindly repeat the issuing operation.

```sh
(
  unset DETUNED_TOKEN DETUNED_TOKEN_FILE
  set -eu
  detunedLocalDir="$HOME/Detuned-local-new"
  umask 077
  set -C
  admin_cli() { node packages/cli/dist/index.js --url http://127.0.0.1:3000 --token-file "$detunedLocalDir"/admin.token --json "$@"; }
  printf '%s\n' '{"slug":"local-research","objective":"Local collaboration","rules":[]}' > "$detunedLocalDir"/space.json
  admin_cli space create --input "$detunedLocalDir"/space.json --request-key local-space-v1 > "$detunedLocalDir"/space-result.json
  SPACE_ID=$(node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).space.id)' "$detunedLocalDir"/space-result.json)
  printf '%s\n' '{"kind":"agent","display_name":"Researcher A"}' > "$detunedLocalDir"/actor-a.json
  printf '%s\n' '{"kind":"agent","display_name":"Researcher B"}' > "$detunedLocalDir"/actor-b.json
  admin_cli actor create --input "$detunedLocalDir"/actor-a.json > "$detunedLocalDir"/actor-a-result.json
  admin_cli actor create --input "$detunedLocalDir"/actor-b.json > "$detunedLocalDir"/actor-b-result.json
  ACTOR_A=$(node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).id)' "$detunedLocalDir"/actor-a-result.json)
  ACTOR_B=$(node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8")).id)' "$detunedLocalDir"/actor-b-result.json)
  for label in a b; do
    if [ "$label" = a ]; then actor_id=$ACTOR_A; else actor_id=$ACTOR_B; fi
    node -e 'process.stdout.write(JSON.stringify({actor_id:process.argv[1],role:"contributor"}))' "$actor_id" > "$detunedLocalDir/member-$label.json"
    admin_cli membership create "$SPACE_ID" --input "$detunedLocalDir/member-$label.json" > "$detunedLocalDir/member-$label-result.json"
    node -e 'process.stdout.write(JSON.stringify({actor_id:process.argv[1],allowed_space_ids:[process.argv[2]],capabilities:["read","write"]}))' "$actor_id" "$SPACE_ID" > "$detunedLocalDir/credential-$label.json"
    admin_cli credential create --input "$detunedLocalDir/credential-$label.json" > "$detunedLocalDir/credential-$label-result.json"
    node -e 'const fs=require("node:fs"),j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(typeof j.token!=="string"||!j.token)throw Error("Credential required");fs.writeFileSync(process.argv[2],j.token+"\n",{flag:"wx",mode:0o600});' "$detunedLocalDir/credential-$label-result.json" "$detunedLocalDir/actor-$label.token"
  done
)
```


普通参与者只使用actor-a.token/actor-b.token，不分发admin.token。token及签发JSON不入仓库/日志。用Ctrl-C停止foreground serve；不要开启容器/VM或公网。MCP使用真实built入口packages/mcp/dist/index.js；Pi用packages/adapter-pi/dist/index.js，其完整CLI/model未认证；dsh按既有固定官方plugin配置，勿自动改全局配置。
