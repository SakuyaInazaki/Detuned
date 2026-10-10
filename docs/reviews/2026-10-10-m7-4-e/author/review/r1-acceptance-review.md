# M7.4-E.R1 独立有限验收

结论：接受最终冻结版本的逐 PID 登记/ACK、真实 launcher 回归、故障清退，以及本机固定 Codex 0.144.6 的 native 九工具目录和实际 checks 矩阵；未发现新增阻塞。本审查仅读取既有证据与静态计算哈希，未运行任何验证。

## 冻结与保护

实际源码 SHA256 `b6c6b1d195357d25fc8c983f8e9e2a0ece675099b71363073cc658f6f8d4047e`；新测试 `f421379b725f806b8df8fd3fd8fed68b7abe3c4de53e6a44c5bd5725e9a48279`；实际 capture-v2 `09dbb602abeee4560bcbf10fd32a0850ccdec0a8acf016e1e15a0a0ffcc01129`。本地门禁和两 native 收据均绑定这些字节。原 ownership helper 保持 1015 bytes / `0202f11b6071607d6180aa833eeb39c42f82a1a2ba019c3df47ea650b9e2acf1`；C1 ownership 测试、Claude 整脚本和 D 测试保护哈希均一致。逐文件复核 baseline 的 436 项产品源码/配置/测试（排除已授权 Codex 源码）及 555 项 dist，零非 owner 漂移；新增 launcher 测试单独绑定。

## 实际门禁

亲读 verification 的 `r1-source-syntax-first`、`r1-capture-syntax-first`、`r1-new-source-noemit-first`、`r1-new-single-file-focused-first` 四份 receipt 及 stdout/stderr：全部 exit 0。新单文件真实 2/2：CL01 774ms、CL02 608ms，命令 2.246146s；CL02 记录两个实际 EOF close 均 0/null、all_owned_absent=true。保留 stdout 中 node_modules/lockfile setting 不同步提示，不将其改写为安装验证。未新增 full/build/workspace type/lint。

## 受控第二候选拒绝

亲读 `reject-second-mcp-first.receipt.json` 和对应 producer/capture：outer 0 / 4.267849875s 是预期失败 oracle 通过；producer 仍 failed / NATIVE_PROBE_FAILED / CANCELLED，driver 1/null。两个候选均已有实际独立 proof/persist，source confirmed observer/authority/ACK 仅各 1；第二候选没有获得 ACK。所有真实任务 settlement、最终 discovery completed、coverage complete 成立，source absence 2/failure 0；capture 独立 absence attempts 2、absent 2、present 0、unknown 0。所有登记 child/group/candidate/root/control 已 absent。保留原观察业务错误；已 settled 的 rejection 没有被误报为 pending 或未知 cleanup。

## 唯一修后 normal

亲读 `r1-normal-native-first.receipt.json`、`codex-native-r1-first-result.json` 与 capture：outer 0 / 2.067569292s，driver 0/null，deadline=false。固定 binary SHA `80a3933d11a9d13ef806aa24f7bb8afc9169cfe4e9b09d6da6a92922cbde9cff`，真实 initialize/thread/start 后一次 status/list 广告精确九工具、unexpected 0；另有实际 tool/call 19，普通两写六读、invalid-before-prepare HTTP 0、reason 500、scope denial、artifact metadata-only、ACK delta 0/pending unchanged、cancel 矩阵均通过。九工具广告与这些实际调用分别成立，不将目录广告等同每工具完整行为认证。

两个候选逐 PID 实际 proof/confirmed observer/authority/ACK 均为 2；五项 settlement、final discovery completed 和 coverage complete 成立；source positive absence 2/failure 0。capture 独立 proof persisted 2、absence attempts 2/absent 2/present 0/unknown 0；全部登记 children/groups/candidates/root/control absent，active/open connections 0。native 实际 close 为 null/SIGTERM，属于既定 TERM 清退，不能写为自然 exit 0；driver 的 0/null 与 launcher 单测 EOF 0/null 分开记录。

## 保留与适用边界

E first normal 8.267639s 的目录为空失败、CL02 旧源码唯一 red 的逐 PID 登记失败、原 source/capture 静态拒绝和 v3 count/bool 准备错误均保留，不回填、不覆盖、不宣称直接实测 EEXIST。最终两 native receipt retry=false。本次为本机固定版本、固定政策/预算下无 prompt/model 请求的有限证据，不外推模型收益、用户 profile、四宿主、Linux、clean install 或完整产品认证。历史 full 967/155 仅引用，不与当前 focused 2/2 累加。未运行项保持未运行。
