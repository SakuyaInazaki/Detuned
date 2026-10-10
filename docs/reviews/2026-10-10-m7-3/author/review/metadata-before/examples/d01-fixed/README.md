# 固定本地外部验证器（M7.2）

当前验收与限制以[进度](../../docs/progress.md)和[审查索引](../../docs/reviews/README.md)为准。这个短寿命无模型示例只执行静态仓库已知算法，不执行论坛下载代码，不是完整D01或数学证明。

## 固定材料与真实setup

本地catalog定义first-discovery（已知错误首次发现规则）和relaxation（优先队列松弛）两个descriptor；选择一个，不能选择“任意通过者”。每次manifest必须恰六材料：所选candidate、reference、checker、cases、config、runner。catalog七literal SHA/bytes覆盖两个candidate与五common材料，含runner provenance；catalog不自hash。角色只按exact SHA/bytes识别，不按文件名/描述/帖子指令。extra/duplicate/missing/both candidates/config不匹配及实际下载byte损坏预检拒，零日志/回执写。

普通控制者按[check HTTP](../check-http.md)与[check CLI](../check-cli.md)真实setup，顺序如下：

1. 准备真实V actor与冻结profile：check_name=`d01-fixed`，config_sha256取本地config pin，verifier_actor_ids允许该V。V无需普通membership。
2. 建立claim，并把本地catalog `assets('relaxation')`或`assets('first-discovery')`返回的六真实bytes逐项普通artifact上传，保存全部真实artifact IDs。
3. 用claim固定引用及全部六IDs创建独立review request，生成包含完整材料的冻结snapshot；不能先冻结空材料再追加。
4. 读取当前request.version与真实snapshot，以当前版本、固定snapshot、profile名和V创建run；不用SQL构造成功formal状态。
5. 空间owner/maintainer一次签发绑定verify凭据，并将token私有保存到自有0600普通文件。issuer确有一次明文输出，无key/自动retry；只有无membership且allowed_scope允许时既有admin规则可虚拟owner，不覆盖已有低角色/inactive身份。
6. 使用下面七flags运行固定验证器。

issuer成功明文须妥善私有保存；token不进入runner argv、runner stdout/log、ledger或全局配置。运行前需要已有本地构建产物；runner静态导入仓库sharedclient/protocol dist，无新安装或包依赖。runner不会创建身份/request/run/凭据。

## 七固定CLIflags

```sh
node scripts/checks/d01-fixed-verifier.mjs \
  --url "$BASE_URL" \
  --space "$SPACE_ID" \
  --run "$RUN_ID" \
  --token-file "$PRIVATE_VERIFY_TOKEN_FILE" \
  --upload-key fixed-log-job-1 \
  --receipt-key fixed-receipt-job-1 \
  --receipt-id fixed.receipt.job-1
```

ID为原值，sharedclient负责编码；七项必填，不接受seed/cases/resources/executable/hook覆盖。tokenfile bounded regular UTF8<=64KiB/O_NOFOLLOW/权限限制；全部HTTP经受限sharedclient，无getMe/普通session/logicalOperationId。run/snapshot/profile/config/verifier实际绑定和manifest JCS SHA核后，只下载manifest IDs，核实际length/SHA/逐byte相同，不落盘import/eval。

## 结果与重试

固定5例加seed20260927的24图及original/reversed共58例；包含三点10vs2、零权、parallel/equal、unreachable和安全整数。最多128图/32vertices/1024edges，candidate+独立Bellman-Ford+全部variants共享累计10,000,000 operations；资源/溢出/环境错误是error，不是否定算法。实际距离差异是fail（首次发现具体[0,10,1]对reference[0,2,1]），全部固定案例一致才pass。pass退出0，已提交fail退出1/error退出2；固定小例不证明普遍数学命题。

真实bounded日志记录固定ref/hash、limits/case/result，随后真实upload和receipt。timestamps/environment/tool_versions是自报告，不是可信attestation。预检失败零writes；网络/撤权/stale/terminal/log发布失败可使receipt未持久化，CLI输出安全错误submitted:false，不能凭退出码或pendingrun说已通过。上传已提交但receipt失败可留下真实日志，不能伪造已提交回执。

只保证同一process同一sharedclient调用重试保原log bytes/receipt body/key。新process有新执行instants/文本，不提供journal或跨process恢复；旧key用于不同bytes/body须安全conflict且不得声称submitted。终态run拒新执行，不能重新生成“已恢复”的旧结果。改变候选/材料应走新真实attempt与新jobkeys。受控afterPreflight仅测试进程内throw用于证明环境error，不由CLI或论坛载入。

证据见[本包](../../docs/reviews/2026-10-10-m7-2/README.md)。完整角色/重启/封存评审/后续新异议旅程仅[M7.3规划](../../docs/reviews/2026-10-10-m7-1-b2/planning/m7-3-task.md)，未在此示例实现。无host/model/VM/性能新认证。
