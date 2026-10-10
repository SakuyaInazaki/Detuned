# 原始出口与当前有限本地交付：独立只读核对

2026-10-10。依据 docs/08-roadmap.md 原始 M0–M7 出口、docs/09-validation.md T01–T20/D01/D02、docs/progress.md 和 docs/reviews/README.md 的接受链及最新封存包入口。仅静态核对；没有新运行、全库重读或修改封存记录。下表证据路径统一以 `docs/reviews/` 为根；“接受”均限各原报告的本机范围，不表示本轮 C 重跑。

| 出口 | 已接受证据路径 | 真实未满足/边界 |
|---|---|---|
| T01 身份/帖子/固定修订/恢复 | 2026-10-03-m0-m1-r23/README.md；2026-10-10-m7-3/README.md | 本机核心闭合；不外推任意介质灾难恢复。 |
| T02 幂等并发/事务故障 | 2026-10-03-m0-m1-r23/README.md；2026-10-08-m3-4-b2/m3-acceptance.md；2026-10-09-m7-1-a/README.md | 服务端事务与重放接受；没有当前开放缺陷证据。 |
| T03 修订 CAS/旧引用 | 2026-10-03-m0-m1-r23/README.md；2026-10-09-m6-3-a/README.md | 已接受；旧批准不代表新修订。 |
| T04 当前 ACL/跨入口隐私 | 2026-10-03-m0-m1-r23/README.md；2026-10-09-m6-2-a/README.md；2026-10-09-m6-4-c2b/README.md；2026-10-10-m7-1-b1/README.md | 已接受；不以宿主认证替代服务端权限。 |
| T05 字面搜索/中文/分页 | 2026-10-03-m2-3/README.md；2026-10-09-m6-4-c2b/README.md | 已接受，有界公开意见搜索不含 sealed 正文。 |
| T06 编码预算/继续读取/checkpoint/规模 | 2026-10-03-m2-4-a/README.md；2026-10-06-m2-4-c2/README.md | 100k/1M/20clients/600s 真测及独立后验接受；首 runner 后验超时保留。非受控目标硬件认证，无新风险不重复压测。 |
| T07 附件字节/配额/授权/故障 | 2026-10-03-m2-1/README.md；2026-10-10-m7-1-b1/README.md | 普通及 scoped run 流传输已接受；不执行附件。 |
| T08 poll/ack/重投 | 2026-10-06-m3-1/README.md；2026-10-10-m7-3/README.md | 真实重启/未确认批次闭合；ACK 不是模型理解。 |
| T09 session/rotation/当前身份 | 2026-10-03-m0-m1-r23/README.md；2026-10-09-m7-1-a/README.md；2026-10-10-m7-4-b/README.md | 核心/CLI 已接受；普通参与者不获 admin。 |
| T10 HTTP/CLI/MCP/Pi 一致与四宿主 | 2026-10-08-m4-2-a/README.md；2026-10-10-m7-1-b2/README.md；2026-10-10-m7-4-a/README.md | 工具契约/真实 SDK/HTTP 接点接受；四宿主完整实际会话未齐，不能整体勾选。 |
| T11 浏览器安全/可用 | 2026-10-09-m5-1-e2/README.md；2026-10-09-m6-4-c1/README.md | 已有有限浏览器事实保留；用户取消所有后续前端/视觉/浏览器工作，不立新前端待办。 |
| T12 升级/备份/恢复/损坏拒绝 | 2026-10-08-m3-3-c/README.md；2026-10-09-m7-1-a/README.md | schema6、真实 V5 水合、离线升级/物理恢复/逻辑 formal 排除接受；当前 Linux 镜像/任意 legacy 不自动认证。 |
| T13 redaction 全路径/快照 | 2026-10-08-m3-4-b2/m3-acceptance.md；2026-10-09-m6-3-a/README.md；2026-10-09-m7-1-a/README.md | 已接受；物理备份可能保历史敏感字节，不等于公开导出。 |
| T14 独立评审资格 | 2026-10-09-m6-1-b/README.md；2026-10-09-m6-2-a/README.md | 已接受，同 actor 多 session 不能凑人数。 |
| T15 sealed 隔离/reveal | 2026-10-09-m6-2-a/README.md；2026-10-09-m6-4-c2b/README.md；2026-10-10-m7-3/README.md | 已接受，D01 checkpoint 有独立真实 HTTP 观察。 |
| T16 固定 snapshot/失效/历史 | 2026-10-09-m6-1-a/README.md；2026-10-09-m6-3-a/README.md；2026-10-10-m7-3/README.md | 已接受，后续修订不沿用旧批准。 |
| T17 finalize/异议竞态 | 2026-10-09-m6-3-a/README.md；2026-10-09-m7-1-a/README.md | 服务端事务及因果历史已接受；不依墙钟排序。 |
| T18 verify scope/回执/latest attempt | 2026-10-09-m7-1-a/README.md；2026-10-10-m7-1-b1/README.md；2026-10-10-m7-2/README.md | 已接受；同调用重试和跨进程旧 key 冲突不同，未承诺持久执行器 journal。 |
| T19 状态分离/环境 error/当前有效性 | 2026-10-09-m6-3-a/README.md；2026-10-09-m7-1-a/README.md；2026-10-10-m7-2/README.md；2026-10-10-m7-3/README.md | 已接受；有限58图 pass 非数学证明，环境 error 不否定算法。 |
| T20 dsh/Pi 生命周期/可选 RPC | 2026-10-09-m4-3-b/README.md；2026-10-09-m4-4-b/README.md；2026-10-10-m7-4-a/README.md | dsh 固定 plugin/HMR 与 Pi SDK 生命周期有限接受；未实现/启用的 optional RPC 不冒充通过，不把 upstream 全部 CLI/profile 能力升级为产品任务。 |
| D01 完整确定性协作旅程 | 2026-10-10-m7-2/README.md；2026-10-10-m7-3/README.md | 已接受真实六角色/重启/封存/固定检查/后续异议。结束 C v2 superseded 含 open_challenges，旧 v1 accepted 保留；原 A 反例不假关闭；无模型增益证明。 |
| D02 四真实 harness 最短会话 | 2026-10-09-m4-3-b/README.md；2026-10-09-m4-4-b/README.md；2026-10-09-m4-5-b/README.md；2026-10-10-m7-4-a/README.md；当前 C verification | 原始“先无模型，再最小真实 Agent 会话”未全部满足。当前禁止模型，不自行补跑；SDK/no-model 不等价真实模型会话。 |

## 当前核心与有限交付结论

独立核对没有发现接受链中仍开放的具体核心功能缺项或已知未修复核心业务缺陷。历史 build/fixture/selector/生命周期失败均须保留其修复和限定证据，不能把历史失败直接当当前核心缺陷。当前 C 有真实实验脚本事实缺陷（候选/确认投影和清退证明边界），见 native-first-review.md；root 已接受 v2 的候选登记与 absence 安全修复真实证据；normal 仍安全失败，不是论坛业务核心回归。

当前 C 已有限闭合：首 native 失败保留；v2 唯一 normal 修复复验约4.335秒仍 failed，phase=group-match、same_worker_group=false、mcp_registered/ack=false，工具矩阵未执行，无 deadline。capture 真实记录1个候选，coverage 与独立 positive candidate absence 均成立；root 接受该次登记/清退证据，不把旧 first 的缺口倒写成已证。现有同 workerPGID 接入要求保持，未放宽策略或授权不同组 signal。Codex 工具会话仍未认证；这是已收口的有限兼容失败，不是 pending 成功或核心缺陷。证据见当前包 verification/codex-native-v2-result.json、同名.capture.json 与 native-v2.receipt.json。后续 C.1 仅官方固定 spawn 语义只读评估，未授权实现、重跑或弱化 policy。

M7.4-A 的核心 full 是一次967/967、155文件；M7.4-B 是五文件23/23和三个 shell 块有限 doc smoke，没有 B/C 新 full。Docker 三 COPY 是静态 production closure，不是当前镜像运行认证。历史 M5.3 Linux/schema2/有限20进程证据与 M2.4-C2 规模基准分别保留，均不能外推 schema6 当前 Linux。

## 阻止原始完整 M0–M7 宣称的精确条件

- **兼容出口**：T10/D02 原要求四锁定宿主实际工作流及最小真实会话未齐。dsh 为有限官方接入链，Pi 为真实 SDK（非 CLI/模型），Claude 原8工具有限链及新checks未认证，Codex 当前实验未完成 catalogue/工具调用。不得宣称四宿主 full。当前无模型边界覆盖了原 D02 的模型会话部分，需要另有明确授权与真实依赖才能评估，不因此阻塞已可用本地核心交付。
- **环境/交付证据**：本地 builtCLI 私有 init/token-file/serve/独立普通身份及恢复指南已有接受；clean install、最低 Node22 新环境、远程 CI、当前 schema6 Docker/Linux未新认证。源 CI 自动维护 tests 与静态布局不是上述实跑。没有发布授权，v0.2 是本地工程目标，不要求 npm/公网发布。
- **许可证**：docs08 M0.5/M7 交付清单仍有维护者许可决定；仓库 private/dev 版本不是公开授权。不得擅选许可证或改版本来制造“完整交付”。
- **已取消/独立范围**：后续 M5 前端已明确取消，现有历史实现保留；M8 真实研究价值评估独立，无模型脚本身份不证明 AI 研究收益。它们不成为当前额外开发/实验清单。

结论可支持“已接受范围内的有限本地工程交付”，不能支持原始所有 T/D 出口、四宿主 full 或完整 M7 已通过。只保留上述具体差距，不新增泛化执行器、宿主全能力认证、浏览器任务或无风险依据的重复大压测。
