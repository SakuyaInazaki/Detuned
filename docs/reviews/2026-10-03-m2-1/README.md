# M2.1（含R1）：附件本机工程验收通过

**父 Agent最终裁决：M2.1附件包通过本机锁定环境工程验收；M0/M1当前core与C.3-GATE继续通过，B保持验收。** 最终独立正式测试210/210、18文件，build/typecheck/lint通过。原29命令真实28/29；原R21 AD02的JSON-only探针无法处理合法multipart，原失败记录保留，版本化media-aware AD5/5完成补偿。AC6/6、原AD4/5、AE5/5、U8/8；六组独立真实FS/SQLite/HTTP验证6/6。

## 用户现在可用的能力

- 三个认证HTTP附件端点：流式multipart上传、metadata读取和受授权字节下载。必须先上传ready附件，再由thread初始帖、普通post或revision关联固定artifact_id；附件与内部证据须同空间、ready、space可见，重复/跨空间/脱敏引用原子拒绝。
- 增量SHA256/bytes，默认单文件25MiB、空间1GiB，所有artifact记录计入配额，同key重放不重复收费；不同key同文件不做hash去重。全multipart读完并验证后才提交，默认4活跃上传并保持finally清理。
- 服务生成安全存储key、0600stage、fsync后无覆盖hardlink发布，再短SQLite事务提交ready/事件/幂等。失败/重复清本次额外blob；崩溃孤儿只在CLI持DirectoryLock、DB协调完成后、listen前清理，buildApp与运行中不GC。
- DTO不含storage_key或原filename，下载采用安全artifactID名、attachment/nosniff/private,no-store和认证相对URL；missing404、redacted在ACL后410，新请求重新鉴权。GET不自动改DBstate，进行中已授权下载不承诺瞬时撤回。

CLI serve配置真实FS并可调整file/space/upload限额，capabilities既有module/limit按配置同步；尚无专用CLI/MCP上传工具。使用 [HTTP/curl示例](../../../examples/artifacts-http.md)，占位token与ID须替换；该示例不是伪造运行输出。

## 独立发现与R1修复

原实现定向17/17及首次全套209通过不抹去。独立检查发现：metadata原始4097bytes在text/plain为400，在application/json却因安装multipart解析器返回406。父 Agent限定非法metadata统一VALIDATION_ERROR400，R1先固化正式失败，再仅映射`FST_INVALID_JSON_FIELD_ERROR`，保留file413及其他错误。最终两种Content-Type原始4096→201、4097→400，拒绝后无半DB/file状态；见 [原406反例](verification/observed-metadata-encoding-second.json)、[R1交付](implementation/fs-http/r1/README.md) 与 [最终metadata结果](verification/r1-final/observed-metadata-encoding.json)。

原R21 AD02假定每个requestBody有application/json，合法multipart触发TypeError；这是探针适配缺口，不能把28/29写成29/29，也不能伪造JSON body或移除附件路由迎合。父 Agent授权保留原探针/失败，新增版本化检查：完整35操作、19JSON+1multipart请求、全部实际JSON schema/path及media声明结构，版本化AD5/5通过。[覆盖映射](verification/ad02-v2-coverage-map.md)说明与原断言的对应；binary结构编译不等于自动multipart校验，实际HTTP测试验证字节。六条ignored date-time warning保留，不声称日期格式值已验证。

## 稳定证据与限制

[最终验证](verification/r1-final/verification.md)、[原29命令](verification/r1-final/commands.json)、[独立命令](verification/r1-final/independent-commands.json)、[覆盖统计](coverage-audit.md)、[完整性](verification/r1-final/integrity.json)。来源快照为 [stable-before-r1](verification/stable-before-r1.json) 与 [stable-after-r1](verification/stable-after-r1.json)。最终执行111产品/config/test/material与31当前docs不变，1508旧review/probe/log证据含R23以及四项冻结SQL/archive保持；storage schema/profile源哈希不变，HEAD不变，未删/取消追踪已全量跟踪内容。

此前独立harness的两次timeout与协调中断日志保留，没有把强制关闭当优雅关闭证明。额外零字节/非空完整下载后，等待有界50ms服务端settle再普通app.close分别67/75ms完成；支持没有已证实持久正常下载关闭故障，不声称排除所有瞬时关闭竞态。中断请求的owned临时测试socket强制关闭仅为harness清理。

实际Node26.3.0/pnpm11.7.0；Node22、干净安装、远程CI、四真实宿主认证与模型研究未运行。评审私有/check附件、Web、正式评审、完整M2与v0.1/v0.2仍未完成；没有剩余已证实产品阻塞不等于全部产品可用。

用户无需手工转交提示词。下一包由主代理分派sol6.1实现 [M2.2-A：三入口统一类型化写入与固定证据](next-task.md)，[只读事实](next-step-facts.md)作为输入；知识视图M2.2-B后续，M2.3/M2.4尚未完成。本次只交付文档，不自行开启下一包。
