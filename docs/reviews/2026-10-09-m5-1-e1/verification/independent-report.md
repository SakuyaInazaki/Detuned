# M5.1-E.1 独立验收

结论：本包有限空间概览、固定规则和本人权限范围具备独立真实 Chrome/SQLite/HTTP 正反证据，未发现可行动产品阻断。父代理已实际查看桌面概览、390px 概览和本人权限三张最终视口，接受所示可读性及纯文本呈现。本报告供父代理正式验收，不宣称完整 M5、生产 TLS 或其他浏览器通过。

## 实际执行与版本

B4 冻结 SHA `83f122ac39bf671a00278cac323f7ff21a5ba1588fbe2c8a56b9c9d40988ab01` 四产品文件最终均匹配，运行期间未修产品。Web build/typecheck/lint 各首轮 exit 0，实际用时分别 2.235/1.130/0.978 秒；七 browser 源文件及 source aliases 所依赖源码最终 noEmit exit 0。完整 stdout/stderr 已审阅，命令、时长、退出码与日志 SHA 见 [gate-output-audit.json](gate-output-audit.json)。pnpmfiles 状态 warning、543.84kB bundle 提示和 Playwright 色彩环境 warning 均保留；没有安装或全局配置修改。

真实浏览器 **10 unique = 首轮 9 passed + 第三次 E101 passed**，不是一次全绿：首轮 exit 1/36.660 秒，E101 广域 `.body-text` 命中概览三节点；第二次仅 E101 exit 1/7.350 秒，虽 locator 已收窄，键盘 Enter 仍早于概览刷新完成的按钮 enabled。首失败不应仅归为 locator 并推称正文已打开。第三次仅 E101 exit 0/2.656 秒，以 enabled→focus→focused→Enter 和精确固定 R1 HTTP 响应作为就绪条件，原固定正文断言保留，不 sleep 或放宽断言。前两次完整日志和现场均原样留存；其余九条成功未重跑。

下层 source/config/tests/SQL/schema/lock 未变，因此明确复用 [D1 core 684/101 与 current29](../../2026-10-09-m5-1-d1/verification/independent-report.md)，本包未执行根 core/full/current25。所选旧六旅程为 author 正常读写/引用/退出、BI03 未知发帖同 key、BI04 失败注销与晚响应、C02 固定搜索旧 ref 正确主题引用、D202 上传/发帖双未知结果及完整下载、D204 各类跨代隔离。其余旧浏览器旅程未运行，不称全 browser suite 通过。

## 四条新增独立旅程

- **E101 普通/空概览与有限材料。** 私有合法 HTTP 建 summary/source 多修订、12 条真实 challenge 和 6 条 strict failure，再真实 PATCH 置顶旧 R1。浏览器 HTTP 返回 10/5/5，页面明示候选及预算非完整索引；置顶和来源的更新提醒保旧版本。恶意 HTML 仅文本，无执行/远程资源。先保留真实讨论 thread，再从概览键盘打开旧固定 R1：不会借旧 thread 引用或发业务帖子，返概览正常。390px 概览/设置导航、focus/Enter 与水平宽度实测通过。
- **E102 省略规则与固定续读。** 普通 100 条非 ASCII 规则经真实合法 HTTP PATCH 接受，累计约 100KB，浏览器通过既有固定空间修订端点逐页读；核真实 UTF-8 段长度、连续 offset、space/revision 及 opaque cursor。中途更新 head 仍完整读旧规则；刷新概览只提示不同版本，不替换所选固定规则。超 1MiB材料另为明确的 **synthetic historical seed**：先合法 HTTP 建空间修订，再在浏览器接入前仅 owned SQLite 替换为 1200 条历史规则；不是生产 HTTP 接受巨材的证明。后续读取走真实 HTTP，超限显示当前原始 JSON 段、不宣称完整，能继续和按同一固定 ref 重开。
- **E103 服务器权限事实。** 普通 observer 的 `/me` actor/capabilities/allowed IDs/visible role 与页面对应；即使凭据含 write capability，真实发帖仍被 ACL 拒绝，DB 业务计数不变。真实撤 membership 后刷新本人权限不保留旧 role，实际 context 404，明确可见最多100不是全部 ACL。cookie/localStorage/sessionStorage 的可读秘密检查以布尔断言，未输出私有凭据。
- **E104 晚响应。** 私有 HTTP proxy hold 实际已经产生的 context 响应，再换空间，旧结果不回填；hold 固定规则响应后真实注销，释放旧响应不重建 workspace。新登录+另一空间请求作为恢复屏障。见 [scope-cancellation.json](browser-selected-browser-first/scope-cancellation.json)。所有新增旅程无自动 poll/ACK。

概览 context refs 本身无 thread_id。父明确裁定仅只读固定正文/返概览，不追加 legacy 全文 getPost、不猜归属、不继承旧讨论 thread；没有可执行引用按钮是这一输入契约的准确实现。已有带服务器 thread_id 的 search/failure 引用继续真实 C02 回归，并非将有归属的引用能力一并禁用。

## 差分、保护与资源

[完整保护核对](integrity-audit.json)：source/config/test 310→312，仅新增 `space-overview.tsx`、`m5-e1.spec.ts`；已有改动为 B app/content/styles 和 D 七个 browser 文件中的六个现有文件。B4 全匹配；D7 最终 SHA 已绑定。十三份 exact-before 均与 fresh 哈希一致，实际差分存 [exact-before-diffs](exact-before-diffs/)。旧四 spec 仅插入“进入空间后选择讨论”导航，原行为断言与证据目的保持。Fixture 仅加私有合法 seed/历史材料/安全 query 观察，config 仅新增 testMatch。

旧 review **7381**、SQL/archive **4**、schema **2**、锁文件、HEAD、59 current docs/5状态文档均无变；208 tracked dist 无变，251 untracked dist 仅 Web JS/CSS 资产替换与 index.html 引用更新。HEAD `b8dacd56779a007a2e7045b682bca0c036fdfc44`，lock SHA `49c72b4c1b0a127c9715e96d4eef06b99d645440e2aaf3de13b3fd86be4fa006`。

**12 个 fixture**（首轮10、第二1、第三1）proxy/app/db closed 与 temp absent 全真，独立检查 owned temp 实际不存在。Chrome 非持久私有 context，未读用户 profile；trace/HAR/video/storageState 关闭。下载回归仅私有 temp，SHA/bytes/BlobURL create1/revoke1及文件删除见 [download-verification.json](browser-selected-browser-first/download-verification.json)。未读用户凭据或调用模型。

## 静态差分结论与视口

独立核 app generation/abort、overview/me/rules 写回门禁、换空间清代、权限刷新先清旧快照；content 固定 ref/UTF-8 连续偏移/meta 一致、仅完整且≤1MiB解析；space-overview 只保存显示字段而丢 checkpoint，明确有限列表/缺失，并以 React 纯文本呈现。无 legacy API/服务权限规则/幂等实现漂移。另有 [A 独立窄源码审阅](../review/source-review.md)，仅为静态辅助，不代替上述浏览器实测。

最终三张真实 viewport，非 fullPage 拼接，父代理已实际接受：

- [桌面概览](browser-keyboard-browser-third/screenshots/e1-overview-desktop.png)
- [390px 概览](browser-keyboard-browser-third/screenshots/e1-overview-narrow.png)
- [390px 本人权限](browser-keyboard-browser-third/screenshots/e1-settings-narrow.png)

未提前修改当前 metadata、写 finalization 或采下一 fresh。下一范围仍由父按规划与本次接受结论裁定。
