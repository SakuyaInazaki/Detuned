# 单元B交付：负载驱动冻结

2026-10-06。新增runner已实现，正式600秒尚未运行。文件所有权仅scripts/scale/run*.mjs、scripts/scale/README.md、本包planning/load.md与implementation/load；未改产品/旧tests/规范或build。

[冻结参数](../../planning/load.md)：单主空间、20独立普通actor、2logical/s/client闭环、30秒warmup→真实checkpoint+新建20consumer→600秒→30秒drain→固定H+120秒catch-up；六类及子比例、4/12/64K、prefix目录与完整内容续读、一次retry/5%写幂等重放、10%revision预定409均按父v1。公开账本无token、checkpoint原串、cursor原串；write仅hash/ref。私有初始化0consumer/20普通read/write，无admin；/me真实校身份/caps。

## 已运行证据

- 首隔离prepare exit0；[首smoke](smoke-first/operations.jsonl)因sandbox loopback listen EPERM exit1，[server原错误](smoke-first/server-log.jsonl)保留。取得本机loopback执行授权后旧seed v1接口预检exit0：400逻辑、587HTTP、582成功+5预定409、意外0，仅1k/10k。
- 最终gated smoke实际用core因果v2-a1 manifest（rules拆分和miss池改版之前），20clients/1kposts/10kevents，正式测量10000.309ms，401逻辑，592HTTP=587成功+5预定409，意外0；[原始summary](smoke-v2/summary.jsonl)、[requests](smoke-v2/requests.jsonl)、[consumer账本](smoke-v2/consumer-ledger.jsonl)、[operations](smoke-v2/operations.jsonl)、[资源](smoke-v2/resources.jsonl)。所有client实际checkpoint10015→terminalH10084，各69事件由独验与DB核。两个gate由独验真实只读HTTP-only旅程控制，原gate前后fingerprint无写。HTTP成功p95与逻辑成功p95仅烟测值，不能外推100k/1M/600秒或目标硬件。
- 最终四个node --check各exit0，stdout/stderr为syntax-final-*.log；没有产品tests/build/fullsuite。独验重算归独验作者，新证据不冒称作者自验。
- 唯一full v3 seed931,082,240B已复制到新私有runtime并初始化20普通凭据，prepare-full exit0；未启动server或600秒。源归档保持，无删除。

## 最终driver窄完善与烟测适用范围

首v1测量完成后修可清timer的within辅助，避免已解决drain race仍留30秒空timer。gated v2完成后最终源码加：实际q字符数/汉字分类，actual max_bytes与cursor hash/retry_attempt字段供独立预算/限额核；full模式必须full manifest且>=100k/1M；严格due<window end与到due才发意图，防亚毫秒timer提前造成额外tick；H/catch-up移postflight前避免窗外源变更混入负载目标；明确SIGINT/SIGTERM停止/取消/flush；run-config环境/当前driverhash/manifest counts。这些是本包driver和账本完善，非产品行为变化。401是原真实smoke数，不改写为400；v2 raw当时没有max_bytes字段且短词按manifest类别统计，不能拿它认证全部load预算或真1/2/3字miss。父决定不为miss/rules元数据或这些窄driver完善再重复烟测；最终源码四项语法通过，真实最终门槛将在full preflight与600秒独验完成。

## 下一次唯一正式命令（待父放行）

```sh
node scripts/scale/run.mjs --manifest /private/tmp/detuned-c2-seed-full-20261006-v3-a1/manifest.json --runtime /private/tmp/detuned-c2-load-full-private-v3-a1/runtime.json --out /private/tmp/detuned-c2-load-full-v3-a1 --mode full --gated true
```

私有live.json将写/private/tmp/detuned-c2-load-full-private-v3-a1，普通20token只在私密文件；verify另外私密controller，不发loadclient。preflight.ok/postflight.ok由verify创建，各120秒，扫描与tests不与600秒并发。free<6GiB或seed archive+运行DB-WAL-日志合计>8GiB立即停止。所有原stdout/stderr/JSONL归档且不覆盖，真实run目录与DB保留，默认不清理。下一次正式命令需loopback权限；禁止改配方、无授权重测或借小烟测宣称正式通过。

[freeze-manifest-v2.json](freeze-manifest-v2.json)记录当前最终六文件hash，保留原[freeze-manifest.json](freeze-manifest.json)；[commands.json](commands.json)区分prepare/check/三次真实smoke，非正式测试计数。最终driver版本与v2 smoke版本差异以上明确，不将旧版本试验包装为最终相同bytes运行。

## 容量独审窄修（freeze v2）

父批准唯一修复resource容量表达式：先stat冻结seed archive并核manifest.database_bytes与prepare所用路径一致；合计seed_archive_bytes+runtime_files_bytes，两个分项和combined_bytes公开，超过8GiB停止。full seed931,082,240B与当前runtime约同大小，合计约1.86GB，未触容量失败。未修改负载参数/其他源码；新node --check exit0，不重负载smoke。
