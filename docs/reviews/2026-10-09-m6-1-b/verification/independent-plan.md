# M6.1-B 独验设计（未执行）

范围按封存M6.1-A任务书及当前task-boundary。A/B接口与DDL尚未完整READY，不盲跑stub/旧dist，不预填通过。

| 真实证据旅程 | 有判别力的oracle |
| --- | --- |
| 普通申请资格与固定名单 | 当前AuthService+真实membership；目标author/contributor或maintainer可申请，普通非author拒；required人数/agent-human/active/eligible/contributor历史编辑排除/group。实际同actor两个session不能变两reviewer名额；不称认知独立。 |
| 原子事务与typed幂等 | 私有SQLite临时触发器仅在末段idem插入报错，五表+events+idem总变化零；正常创建snapshot/items/headv1/versions/assignments同事务。私有trigger来源明确，不是生产faultflag。 |
| 真并发与重开库 | 两独立Node子进程/两SQLite连接同一个WAL file，barrier后同时真实create，同key只有一份、不同key同target两唯一递增round；不能用同步Promise.all冒并发。child只在最终build后加载实际dist，私有token走内存管道，不输出。 |
| 固定历史重放与取消资格 | policy/reviewer资格变化、later cancel、reopen后旧create key返回exact v1；cancel key返回exact不可变version/reason/time，events/idem不增；cancel者为requested_by或维护者，目标作者不能取消他人申请；fresh新key version/phase拒，旧key changed payload409。 |
| 当前ACL/材料保密/持久损坏 | 撤权/跨space先拒；target/artifact红删410不泄manifest内容，private404；修改snapshot raw/hash/items/ref头逐一RESYNC_REQUIRED，授权错误优先，不修补DB，不靠schema mock。 |
| public事件/线程与logical隔离 | 请求/取消仅metadata事件，真实EventService按target thread过滤、另一thread不见；公共10族export不含五表/正式内容/固定名单。合法source1/2组合与未来混配反例完整hash重算后语义拒。 |

维护独验在verification受控探针，正式D文件 `tests/integration/m6-review-requests-independent.test.ts` 聚合服务旅程。fixture只owned tmp真实SQLite/文件；历史合成研究材料与trusted SQL seed明确标注，不冒HTTP写/CLI。新维护API若用CLI，必须实际短寿命built子进程，不以Node调用冒CLI。

- true source2由冻结historical-v2完整DDL配方或冻结旧schema2 bootstrap生成，不由current3删5表伪造。保存源DB/附件/manifest前后SHA与classification；copy upgrade只新stage。
- old format1/schema2 backup拟由独立冻结旧schema2原backupAPI真正产出；新3 backup用新API，含实际create/cancel历史五表数据。restore分别新目标，核研究内容/历史/identity reset/源原bytes保留。旧运行输入需完整静态闭包防穿透new3，补捕获时序/fresh命中记录；仅旧backup目的，不旧serve/init或部署认证。
- wire1/source2/not_enabled由真实旧固定export-worker产出或精确现兼容输入，wire2/source3/excluded用新真实export；schema版本/状态组合不宽union，chain完整性不放松；新import五表空、来源actor disabled。

统一门禁等A/B最终freeze与主代理窗口：必要build→typecheck/lint→core，一次新D source noEmit。旧current25静态scan已存，不执行旧8398文件或修改它们。预计#12–18/#20–26涉及伪造logical-v1、旧serve auto升级或current V2生成，实际必要adapter逐个列原SHA/原assertions/新compat语义，并先报根范围；#9真实legacy低层bootstrap原义仍可能无适配。不凭rg命中声称失败，不先批量改所有探针。

首失败完整保、修后仅受影响复验；token/CSRF/研究正文不进入safe receipts，日志只固定stage/status/count/hash/退出事实。children finally有限终止/回收、DB关闭后rm私有root。无VM/Colima/容器/新常驻环境/安装/模型/浏览器/用户配置。
