# M3.1 最终只读签收（2026-10-06）

父代理已接受 M3.1 有限本机工程验收。本次只核对文档、保护哈希和既有清退证据，没有再次执行产品、测试或构建。M3.2 B 任务书已批准，尚未实施。

## 保护与授权变化

相对验收终点 `stable-after-final-checks.json`，158 个 source/config/tests、3190 份既有不可变审查证据、4 份 SQL/archive、2 份 schema 和 dist 的 208 tracked + 48 untracked 文件全部保持；HEAD 仍为 `b8dacd56779a007a2e7045b682bca0c036fdfc44`。H-R1 持久材料及 C2 recipe/scale 脚本保持。构建期间产生的 9 个 tracked dist 变化已在原完整性报告归因，此处核的是构建后终点保持。

37 份 currentdocs 中，仅 `docs/09-validation.md` 是获准的验收后同步，其他 36 份保持。5 个 mutable 索引中，README、progress、reviews README、examples README 共 4 份获准更新，AGENTS 保持。本包 README 是新包收尾文件。上述合计为作者获准的 6 文档收尾；没有将它们计作独验期间产品漂移。

自有 verification.md 仅修正映射链接为 `../coverage-audit.md`，并说明当前状态文档已在验收后同步。原 stable captures、首失败和旧证据均未覆盖。

## 数字与链接

正式结果保持 354 tests / 39 files，current29 为 29/29；统一 build、typecheck、lint、fullsuite 各一次。after 命令记录为 36 次：34 次退出 0，2 次为自有 tools probe 的已归因首错误，修正版通过；before 记录另列。目录为 38 operations/routes、20 bodies（19 JSON + 1 multipart），44 条 date-time ignored 不代表日期格式认证。

9 份交付/索引/报告/任务书的本地文件链接实际 226/226 存在，包括修正后的映射链接；未验证远程链接或 anchors。限定 tracked 文档 whitespace 检查退出 0。新包公开文件的有限实际凭据样式扫描无匹配，不宣称完整秘密认证。

## 清退与限制

沿用已接受的真实清退证据：20 客户端有限三轮共 22 个自有 PID 全退出，最终待等待数为 0；MCP/内存服务在 finally 关闭，私有临时目录清理，执行末尾只读 ps 没有自有 worker/MCP 进程。没有为本次签收启动服务或再次测试。

有限 20 客户端结果不外推吞吐认证；普通读写各 n=1，不报告其 p95。权属/私密事件的防御夹具范围、未运行的 Node22、干净安装、远程 CI、真实宿主模型、T12/断电及未重复的旧探针/600 秒均维持原报告限制。

详细哈希、授权 delta 和逐链接结果见 [finalization.json](finalization.json)；验收结论见 [verification.md](verification.md)、[覆盖映射](../coverage-audit.md) 和 [原执行终点完整性](integrity-final-checks.json)。本次完成后停止写入。
