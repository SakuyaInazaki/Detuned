# M5.1-C 独立功能验收

结论：当前冻结实现可接受本包的主题创建、搜索、失败作者报告及固定结果引用范围。真实 Chrome 浏览器 **11 条独立旅程组合通过**：首次执行 10/11 通过，加 C02 第三次定向通过。前两次 C02 测试字段误判和 D 首次类型诊断完整保留；不声称首次全绿。父已实际查看三个当前截图并接受视觉范围。

仅复用上一 M5.1-B 已接受的 **core 675 tests / 99 files、current29 29/29**；本包没有执行这些 gate。下层源码/配置/测试、精确 lock、SQL/schema/封存与全部旧 review 均未改变，符合父批准的 UI/test-only 验收范围。

| 当前实际执行 | exit | 证据与边界 |
|---|---:|---|
| Web build | 0 | [完整输出](gates/web-build-first.stdout)、[stderr](gates/web-build-first.stderr)，1.941s；包含 Web tsc 与 Vite |
| Web typecheck / lint | 0 / 0 | [类型 receipt](gates/web-typecheck-first.receipt.json)、[lint receipt](gates/web-lint-first.receipt.json)，1.001s / 0.903s；包脚本均为 tsc |
| 五个 browser 源文件 source noEmit | 0 | [最终 receipt](gates/browser-source-noemit-after-c02.receipt.json)，0.913s；首 TS18048 是 D 可选 query 断言 guard，修后通过 |
| author1 + 既有 D5 + 新 C5 首次 | 1 | [完整 stdout](gates/browser-first.stdout)、[stderr](gates/browser-first.stderr)，35.303s，10 pass / C02 fail |
| C02 第二次 / 第三次 | 1 / 0 | [第二次](gates/browser-c02-second.stdout)、[第三次](gates/browser-c02-third.stdout)，2.349s / 2.663s；其余已过十条未重复 |

[完整门禁清单](gates.json)记录所有命令、时长和逐次 receipt。标准项目 pnpm 入口使用空 user/global npm config、CI 和原 HOME；真实 `pnpmfiles changed` warning、Vite 515.74kB 提示及 NO_COLOR/FORCE_COLOR warning 保留，没有安装、浏览器下载或人为隐藏警告。

新 C 五条实际断言：

- **C01** 普通 human 真创建空主题；另一个主题与可选首 note 同一 HTTP 请求创建。四次实际提交后丢响应耗尽默认有限重试，再显式同 key 重放；五个实际 POST key 一致，真实 SQLite 只增加一个主题和一个首帖，作者/空间/主题/修订 1 正确。
- **C02** 真实 q、kind、thread、tags 联合过滤，20→2 结果及 opaque cursor；改过滤移除 cursor。结果背景更新到修订 2 后仍读固定旧正文/修订 1，再明确进入实际结果主题并引用，真实 DB 新帖属于正确主题且 cites 旧修订；返回保原第二页与筛选，无额外搜索。两次失败均为 D 传输字段期望问题：首次误用 `tags`，第二次过快按通用 CSV 描述修改；准确核 client.ts:882 后改为 `tags_json` JSON 编码，未改产品。
- **C03** 合法 HTTP 建真实 failure，再在浏览器接入前仅自有 DB 置一条 synthetic historical 缺失/null 材料并按 stored 规范重算 hash；不放宽新写校验。不冒历史 seed 为正常 HTTP 新写。真实失败视图 43 条与超过 50 后上限 50、作者报告/范围/证据/未排除/重试字段、null/missing 诚实展示；恶意标题/观察材料只作纯文本，无 img/script 执行与远程请求；失败关键词切实际 search。
- **C04** 真实 query 响应已完成但被私有 proxy 持有，切空间或退出后释放不回填；撤成员在实际服务授权前持有请求，释放后真 HTTP 404，不展示旧材料。没有把撤权前已授权响应冒充撤权后服务请求。
- **C05** 键盘操作 nav、submit、固定阅读与返回；默认四次连接失败耗尽后不冒成功，显式恢复真实搜索；390px 窄屏无横向溢出，保无密 viewport 截图。既有六条同时通过，继续覆盖 Cookie HttpOnly/Strict、无 local/sessionStorage、权限拒绝、固定 UTF-8 分页、真实幂等、晚响应注销及 1MiB 历史退化。

独立先发现搜索/失败 reader 永久禁用引用的静态缺口，交父裁并由 B v2 修复；[静态事实及实际修复验证](static-citation-finding.md)。最终 [B v2 freeze](../author/web/freeze-manifest-v2.json) 六文件 SHA 全匹配，D 四文件见 [独验 freeze](independent-freeze-manifest.json)。

[保护汇总](integrity-before-metadata.json)：source/config/test 302→304，仅 app/styles、三个旧 browser 文件、测试 config 六路径变更，新增 knowledge 与 C spec；main/content、下层和根依赖配置不变。旧 review **7006**、SQL/archive **4**、schema **2**、HEAD `b8dacd56779a007a2e7045b682bca0c036fdfc44`、lock `49c72b4c1b0a127c9715e96d4eef06b99d645440e2aaf3de13b3fd86be4fa006` 全守恒；tracked dist208 全守恒，untracked Web index 和两 bundle 替换，其他 dist 不变。[九份 before bytes 核验](before-byte-audit.json)全部匹配 fresh hash，[准确源差分](source-delta.patch)可独立审阅。

共 **13 个实际 fixture finalizer**，proxy/app/DB 关闭、temp 删除全部 true，见 [浏览器结果](browser-results.json)与各 run cleanup JSONL。Chrome 使用既有 channel、非持久 context；trace/video/自动截图关闭，无 HAR/storageState，凭据仅 Node 私有内存，安全截图均为已登录公开研究材料，不含 token/cookie/CSRF。测试 evidence 统一显式 `DETUNED_WEB_EVIDENCE_DIR`，每次 run 独立目录；未设落普通 test-results/web，不回写封存 review。

视觉材料：[桌面搜索](browser-first/screenshots/c-search-desktop.png)、[窄屏搜索](browser-first/screenshots/c-search-narrow.png)、[失败报告](browser-first/screenshots/c-failure-desktop.png)。父已查看并接受，不据 Node HTTP 或截图冒充浏览器安全执行。

限制与下一步：当前是 Chrome155/macOS/headless/private loopback 的有限范围，未验生产 TLS、其他浏览器或完整 M5/M6。失败视图是最多 50 条作者报告，不是完整索引或正式证明。附件此页只列证据引用；有界修订目录与附件发现仍留下一 M5.1-D，随后 M5-E、M6/M7 按冻结任务继续。当前 metadata 尚待父正式接受后作者收口，D 不提前改入口或采下一 fresh。
