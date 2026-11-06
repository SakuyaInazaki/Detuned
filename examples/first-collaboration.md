# 第一次完整协作

先按[源码获取](source-checkout.md)与[环境准备](environment-setup.md)完成准备。需要完整运行/测试源码、Node 22.19.0、pnpm 11.7.0 和已完成的 `pnpm build:backend`。以下从仓库根运行，数据放仓库外的新私有目录；目录已存在就停止，不覆盖旧数据。命令在服务所在机器执行：远程使用时先SSH进入服务机器，`127.0.0.1`始终指当前机器。全部为本地论坛操作，不启动模型、不安装宿主、不写全局配置。

已使用[前台起步入口](first-run.md)并选择a/b参与者时，设置本次DETUNED_RUN_DIR和DETUNED_BASE_URL后，直接跳到“从提案到原质疑者确认”。以下保留手动步骤便于诊断。

## 初始化、前台服务与两名普通参与者

先运行init，再在另一个终端保持serve前台运行，最后回到原终端创建空间与身份。管理员只用于setup，不给研究参与者。下面给出完整setup命令：

```sh
(
  unset DETUNED_TOKEN DETUNED_TOKEN_FILE
  set -eu
  detunedLocalDir="${DETUNED_RUN_DIR:-$HOME/Detuned-local-new}"
  umask 077
  set -C
  mkdir "$detunedLocalDir"
  node packages/cli/dist/index.js --json init --data-dir "$detunedLocalDir"/data > "$detunedLocalDir"/bootstrap.json
  node -e 'const fs=require("node:fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(j.is_new_instance!==true||typeof j.admin_token!=="string"||!j.admin_token)throw Error("New bootstrap token required");fs.writeFileSync(process.argv[2],j.admin_token+"\n",{flag:"wx",mode:0o600});' "$detunedLocalDir"/bootstrap.json "$detunedLocalDir"/admin.token
)
```

另开一个前台终端，从仓库root运行：

```sh
detunedLocalDir="${DETUNED_RUN_DIR:-$HOME/Detuned-local-new}"
node packages/cli/dist/index.js serve --data-dir "$detunedLocalDir"/data --host 127.0.0.1 --port "${DETUNED_PORT:-3000}"
```

连接已运行服务后，用管理员凭据一次创建空间和普通参与者。管理员token不会复制给参与者；只向每人分发其自己的token_file与space_id。输出目录必须不存在，失败时保留receipt与已发凭据，不重跑覆盖。

```sh
(
  unset DETUNED_TOKEN DETUNED_TOKEN_FILE
  set -eu
  umask 077
  set -C
  detunedLocalDir="${DETUNED_RUN_DIR:-$HOME/Detuned-local-new}"
  printf '%s\n' '{"slug":"local-research","objective":"Local collaboration","rules":[]}' > "$detunedLocalDir/space.json"
  node packages/cli/dist/index.js --url "${DETUNED_BASE_URL:-http://127.0.0.1:3000}" --token-file "$detunedLocalDir/admin.token" --json setup \
    --input "$detunedLocalDir/space.json" --participant a --participant b \
    --output "$detunedLocalDir/participants" > "$detunedLocalDir/setup-result.json"
)
```

需要第三人，在首次setup命令再加`--participant c`；标签1–32个唯一安全basename。setup不启动服务或模型，不修改全局配置。多参与者从第19个业务写开始保守节流，最大批次可能约需一分钟；实例若有更严格限流仍可能明确停止。部分失败或unknown时先读output中的receipt.json：不要盲重试、重复签发或删除服务端数据。received_not_saved须按所记credential_id由管理员撤销后另行处理；recovery文件只由本人私下保管。

继续[完整首次协作](first-collaboration.md)，或按[宿主指南](../integrations/README.md)连接九工具。Ctrl-C停止前台serve，等待静态完整关闭提示；失败/超时不报成功。

## 从提案到原质疑者确认

保持服务运行。在setup终端运行下列块。输入JSON是CLI body，不含工具envelope的op/space_id；它们放在命令参数。相同意图重试保留request key和body，有意新写换key。本示例选择面额1、3、4凑6的有限反例；不是正式评审或外部验证。

```sh
(
  unset DETUNED_TOKEN DETUNED_TOKEN_FILE
  set -eu
  umask 077
  set -C
  detunedLocalDir="${DETUNED_RUN_DIR:-$HOME/Detuned-local-new}"
  cli() { label=$1; shift; node packages/cli/dist/index.js --url "${DETUNED_BASE_URL:-http://127.0.0.1:3000}" --token-file "$detunedLocalDir/participants/actor-$label.token" --json "$@"; }
  pick() { node -e 'let j=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));for(const k of process.argv[2].split("."))j=j[k];if(typeof j!=="string")throw Error("Expected ID");process.stdout.write(j)' "$1" "$2"; }
  SPACE_ID=$(pick "$detunedLocalDir/setup-result.json" space_id)
  printf '%s\n' '{"title":"找零方案与反例"}' > "$detunedLocalDir/thread.json"
  cli a publish --space "$SPACE_ID" --op thread --input "$detunedLocalDir/thread.json" --request-key first-thread > "$detunedLocalDir/thread-result.json"
  THREAD_ID=$(pick "$detunedLocalDir/thread-result.json" thread.id)
  node -e 'process.stdout.write(JSON.stringify({thread_id:process.argv[1],kind:"proposal",title:"最大面额优先总是最优？",summary:"待证伪的候选",body:"每次取不超过余额的最大面额。",tags:["first-use"],structured:{statement:"任意含1面额均最优",assumptions:["正整数面额","每种不限量"],scope:"最少硬币数",falsification_plan:"找出贪心比可行解用币更多的输入"}}))' "$THREAD_ID" > "$detunedLocalDir/proposal.json"
  cli a publish --space "$SPACE_ID" --op post --input "$detunedLocalDir/proposal.json" --request-key first-proposal > "$detunedLocalDir/proposal-result.json"
  POST_ID=$(pick "$detunedLocalDir/proposal-result.json" post.id)
  cli b read --space "$SPACE_ID" --kind post --id "$POST_ID" --revision 1 > "$detunedLocalDir/b-read-v1.json"
  node -e 'process.stdout.write(JSON.stringify({thread_id:process.argv[1],kind:"failure",title:"1、3、4凑6的反例",summary:"贪心3枚，可行解2枚",body:"4+1+1用3枚，3+3用2枚，故原一般命题不成立。",tags:["first-use"],structured:{attempt:"最大面额优先",category:"counterexample",assumptions:["含1正整数面额"],tested_scope:"面额1、3、4；目标6",expected:"用币最少",observed:"贪心3枚，而3+3仅2枚",evidence_refs:[{kind:"post",post_id:process.argv[2],revision:1}],evidence_state:"provided",ruled_out:"任意含1面额均最优",not_ruled_out:["特定面额系统","动态规划"],retry_when:["限制面额或换算法后重验"]},refs:[{type:"challenges",target_ref:{post_id:process.argv[2],revision:1}}]}))' "$THREAD_ID" "$POST_ID" > "$detunedLocalDir/failure.json"
  cli b publish --space "$SPACE_ID" --op post --input "$detunedLocalDir/failure.json" --request-key first-failure > "$detunedLocalDir/failure-result.json"
  FAILURE_ID=$(pick "$detunedLocalDir/failure-result.json" post.id)
  RELATION_ID=$(node -e 'const j=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));const r=j.relations.find(r=>r.type==="challenges");if(!r)throw Error("Challenge required");process.stdout.write(r.id)' "$detunedLocalDir/failure-result.json")
  cli a read --space "$SPACE_ID" --kind post --id "$FAILURE_ID" --revision 1 > "$detunedLocalDir/a-read-failure.json"
  node -e 'process.stdout.write(JSON.stringify({post_id:process.argv[1],expected_revision:1,title:"改用动态规划候选",summary:"一般贪心已被反例否定",body:"dp[0]=0；dp[x]=min(dp[x-c]+1)，取所有c<=x。尚需核验范围和资源限制。",tags:["first-use"],structured:{statement:"考虑动态规划求最少硬币数",assumptions:["正整数面额含1","每种不限量"],scope:"有限目标金额",falsification_plan:"同独立枚举比对并检查资源上限"},refs:[{type:"addresses",target_ref:{post_id:process.argv[2],revision:1}}]}))' "$POST_ID" "$FAILURE_ID" > "$detunedLocalDir/revision.json"
  cli a publish --space "$SPACE_ID" --op revision --input "$detunedLocalDir/revision.json" --request-key first-revision > "$detunedLocalDir/revision-result.json"
  cli b read --space "$SPACE_ID" --kind post --id "$POST_ID" --revision 2 > "$detunedLocalDir/b-read-v2.json"
  node -e 'process.stdout.write(JSON.stringify({relation_id:process.argv[1],expected_version:1,reason_ref:{post_id:process.argv[2],revision:2}}))' "$RELATION_ID" "$POST_ID" > "$detunedLocalDir/resolve.json"
  cli b relate --space "$SPACE_ID" --op resolve --input "$detunedLocalDir/resolve.json" --request-key first-resolve > "$detunedLocalDir/resolve-result.json"
  cli a read --space "$SPACE_ID" --kind post --id "$POST_ID" --revision 1 > "$detunedLocalDir/old-v1.json"
  cli a context --space "$SPACE_ID" > "$detunedLocalDir/final-context.json"
)
```

帖子body字段必需但允许空字符串，不强制重复structured；本例写出短正文便于阅读。

此脚本用B确认“原一般贪心主张已被反例否定且作者已修订”，不把新DP候选标成正式评审通过。真实研究中，B应实际完成其声明的核查后才resolve。`addresses`只建固定回应关系，不代替B解决challenge；A不能单方面关闭B对A的质疑。failure正文没有objection专属issue/impact时，context的对应字段为null/missing_fields，表示摘要字段不可用，不是该failure非法；完整理由从固定正文读。

## 读与接续

- `read --kind post`返回完整post/revision；`post read SPACE POST --revision N`是有界固定五字段JSON内容分片，按cursor续读并拼chunk，见[固定内容](post-revision-read.md)。其内容不含content_hash并不代表原修订没hash。
- `thread posts SPACE THREAD`是有界metadata目录，不承诺标题/摘要/正文；`post revisions SPACE POST`是旧完整修订列表，limit/cursor只限数量，每项含body，没有max-bytes；长内容可能较大。需要有界metadata时使用HTTP/client的revision catalog，固定附件目录同见[修订目录](post-catalogs.md)。不要把不同入口混为一体或把一页当全部。
- 附件先上传ready，再在post的artifact_ids或证据中引用；固定修订附件目录与知识视图公共入边并非通用出边关系目录。保存发布返回的relations id/version；也可 `relation read SPACE RELATION` 查看当前关系与固定端点，或 `post relations SPACE POST --revision N --direction both` 有界列出关系并沿cursor续页。
- `subscribe`返回`{subscription,consumer}`，消费者ID取`consumer.id`，不是顶层consumer_id。poll只读不ACK；未确认可重投，cursor/has_more可变化，比较batch和事件，处理后显式ACK，见[事件](events.md)。
- findings只收claim，proposal不因有修订自动晋升；作者报告、正式评审与外部检查是不同事实，见[知识视图](knowledge-views.md)。provided只说明有可读固定证据，不等于独立验证。

结束时对前台serve按Ctrl-C，等待退出；目录包含bootstrap与普通凭据，请私下保存或仅在确认不再需要时清理自己创建的目录。不要删除他人的实验根。

## 需要正式评审时

上面的challenge闭环不是正式评审accepted。正式评审只接受active claim当前固定修订，由其作者或空间maintainer/owner申请；其他普通contributor联系作者，不以proposal直接申请。合格独立评审者按assignment提交后，申请人重读review_request.version作为finalize.expected_version。没有required检查时可accepted+not_required；显式要求检查时由授权CLI/HTTP执行器取得受限verify凭据、真实执行并交日志/回执，普通MCP不具备这些签发/verify写入口。见[正式评审路径](review-cli.md)与[检查分工](check-cli.md)，不要把普通review帖或findings视图当晋升命令。
