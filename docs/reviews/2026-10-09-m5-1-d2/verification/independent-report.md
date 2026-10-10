# M5.1-D.2 独立浏览器验收

结论：本包修订目录、明确版本五字段比较、附件发现、真实上传绑定与显式验证下载的有限范围通过。实际为 **9 个唯一浏览器旅程的组合通过**：首轮7通过，第二轮D201通过，第三轮D204通过；第四仅D201为父要求的遗漏比较视觉材料复跑通过，唯一场景数不变。不是一次全绿。产品B四文件冻结后没有修复或放宽。两类失败均为D测试自身定位/故障路径错误，原输出保留。

## 实际执行

|检查|实际结果|证据|
|---|---|---|
|Web build|0，1.984s；最终B四文件|[receipt](gates/web-build.json)，完整stdout/stderr同目录|
|Web typecheck / lint|0 / 0，0.919s / 0.943s|[type](gates/web-typecheck.json)，[lint](gates/web-lint.json)|
|六个browser源及导入源noEmit|首2：新spec局部TS7022；显式响应类型后0；locator修后0；最终path修后0；视觉截图增补后0|[首diagnostic](browser-source-noemit-first.log)，[最终log](browser-source-noemit-final-visual.log)，[配置](browser-source-tsconfig.json)|
|首真实浏览器|exit1，46.227s：7通过/2失败|[receipt](gates/selected-browser-first.json)，完整stdout/stderr同目录|
|第二仅D201/D204|exit1，63.284s：D201通过，D204超时|[receipt](gates/locator-browser-second.json)|
|第三仅D204|exit0，3.168s，1通过|[receipt](gates/path-browser-third.json)|
|第四仅D201视觉补证|exit0，4.296s，1通过；不增加unique场景|[receipt](gates/comparison-visual-fourth.json)|
|唯一最小DOM诊断|exit0，3.320s，1诊断；不是新增功能旅程；独立TSnoEmit0|[receipt](gates/minimal-dom-diagnostic.json)，[诊断noEmit](visual-diagnostic-noemit.log)|
|全输出/资源清退|读完整stdout与stderr；14个fixture全部proxy/app/DB关闭、owned temp不存在|[audit](gate-output-audit.json)，每run的browser-fixture-cleanup.jsonl|
|下层核心/探针|复用D.1已接受684 tests/101 files及current29，**本包未重跑**|[D.1报告](../../2026-10-09-m5-1-d1/verification/independent-report.md)|

正式脚本使用本项目已批准的 `npm_config_userconfig=/dev/null npm_config_globalconfig=/dev/null CI=1`，HOME原值；每次显式独立 `DETUNED_WEB_EVIDENCE_DIR`，沿现Playwright配置的installed Chrome channel、非持久context、单worker、0 retries。没有依赖安装、下载浏览器、访问用户profile、HAR/trace/storageState/video或模型调用。pnpmfiles changed警告真实存在；530.32kB Web bundle大于500kB提示保留，没有冒称无警告。

## 九个唯一旅程的关键事实

- **D201**：真实HTTP创建24个修订，目录首20/次4（4→1）；opaque续页实际使用。选24后换页再选1，真正五字段标题/摘要/正文/标签/结构化内容均显示变化和实际前后值。按钮通过focus+Enter激活。打开1后后台创建25，重新加载目录只更新当前提示，正文仍是旧1。390px无横向溢出。合法HTTP note后仅自有DB扩为多字节历史结构约1.2MB（超过1MiB），真实分段请求比较拒绝完整成功，五字段结果0并保继续阅读入口；此巨材不是合法新写入能力。
- **D202**：真实浏览器File上传；代理每次先让真实服务提交，再丢4次响应耗尽默认有界重试。UI锁定文件、显式同key恢复第5次，SQLite只有1份artifact，真实human owner、space、bytes、SHA正确；上传尚未给源帖建立关联。第二份实际上传后，带两id及固定源ref发帖也丢4次真实提交响应，未知意图锁正文、第5次同key恢复；SQLite只有1帖、两关联与cites revision1，上传/post使用不同意图key。发帖成功清待绑定选择。显式下载真正触发1个Playwright download，私有context下载文件完整bytes/SHA匹配、suggested filename固定id，HTML材料不执行。实际URL计数create1/revoke1，下载文件通过download.delete清退，[非秘密receipt](browser-selected-browser-first/download-verification.json)。
- **D203**：真实HTTP上传，浏览器接入前在owned SQLite构造明确历史关联/state/private/cross-space fixture。23个可见关联分页20+3；两个非公开/跨space材料不出目录，直接真实浏览器GET metadata均404。redacted整个真实wire对象严格只有id/state，UI两页均不含该残余hash；missing/redacted无下载按钮。observer可读，随后真实撤成员，目录重新请求404并显示错误。状态不代表实际下载成功。
- **D204**：真实response先由服务产生再hold：revision catalog换space不回填；固定comparison换ref不显示旧结果；upload已经SQLite提交后换ref不回填待绑定，提交但未绑定artifact仍存在且不自动删除；download content已由服务读出后logout不自动触发download，旧workspace清退。release后真正fresh login/讨论读取作为可观察屏障，无定时sleep推断。
- **受影响既有5条**首轮均真实通过且未重复：author普通human读固定版→note+cites→logout；BI03未知post同key；BI04注销失败不假成功/旧响应；BI05 UTF-8固定分页与1MiB诚实退化；C02旧搜索ref进入真实正确thread引用并返回保页。旧断言和源文件未改变。其他6个既有browser旅程未运行，理由是父批准受影响子集；不能把11条全称本包执行通过。

## 首失败与更正

首D201/D204在 `getByLabel(...,exact:true)` 处超时。包裹label的文本包括select options；实际页面snapshot的combobox可访问名字正确。D仅换 `getByRole('combobox',{name,exact:true})`，未改产品或断言。

第二D201通过；D204 fault matcher误写 `/posts/:id/revisions/1/content`，实际sharedclient固定正文路径是 `/posts/:id/revisions/1`（附件download才有/content）。entered不发生，60s deadline结束；原timeout与cleanup保留。修前有限核D204全部matcher及发生阶段：GET/revisions/catalog、GET/revisions/1、POST/artifacts、GET/artifacts/:id/content。仅改这一字符串，再仅D204通过。没有将超时称产品bug或无故重跑全套。

末核辅助diff脚本曾将before manifest键误用path，snapshot及delta已成功后退出1；纠正为真实original_path，[事实记录](audit-helper-first-error.txt)，没有产品改动或额外gate。

## 独立差分与保护

[完整delta](integrity-delta.json)，[最后截图后hash snapshot](integrity-after-visual.json)，[D三源freeze](independent-source-freeze.json)，[B freeze核验](source-freeze-audit.json)，[十一份精确before核验](before-files-audit.json)，五份有变化before diff均保本目录。

source/config/test308→310：仅B app/content/styles修改及新增revision-evidence；D fixture/config修改及新增m5-d2.spec。main/knowledge、旧author/independent/m5-c源、所有下层/client/server/core/protocol/storage、依赖配置与lock不变。B4 SHA均匹配正式freeze `48f9ba0773761c4793d9d8bae756816d82e219cdc5b727f436179f63f0d43588`。old review **7270**、SQL/archive4、schema2与HEAD均完全不变；当前文档尚未metadata收口。dist仅Web index及两bundle替换；tracked208无变化，untracked251总数相同，其他dist不变。git diff --check0。

实际源码审阅：app固定ref目录/跨页明确版本、sharedclient调用及generation检查；上传File/key和发布body/refs/artifact_ids独立冻结，scope变代清UI但不删除既有上传；download固定client/fullhash验证后才创建Blob，finally移除anchor/revoke。content按TextEncoder字节预算/连续固定ref累积，只有两个完整document可比较；结构遍历有nodes/depth/bytes预算。revision-evidence纯文本，无rawHTML、外部content_url、自动预览或墓碑元数据恢复。实际browser验证补足即时revoke与晚响应边界。当前没有可行动产品阻断项。

## 截图与范围

无秘密的真实390px viewport：[修订目录项](browser-locator-browser-second/screenshots/d2-revisions-narrow.png)，[已绑定附件与显式下载按钮](browser-selected-browser-first/screenshots/d2-artifacts-narrow.png)。前者是长目录的中段视口，不能宣称整页或比较控件截图覆盖；无拼接/修图。父查看并接受这两项布局后，授权仅D201增补[完成比较桌面](browser-comparison-visual-fourth/screenshots/d2-comparison-desktop.png)与[390px比较](browser-comparison-visual-fourth/screenshots/d2-comparison-narrow.png)真实viewport。桌面五字段/前后读法清楚，窄屏转上下列且实际全页宽度不溢出；窄图底部重复标题绘制外观已如实报告父，此轮未采该heading DOM计数，不能直接归因捕获。父随后批准唯一最小DOM/视口诊断，两个短版本、resize/scroll后两次requestAnimationFrame：[完整几何](browser-minimal-dom-diagnostic/comparison-dom-geometry.json)，比较heading1/region1/字段5，三位置document坐标一致、字段无几何重叠，scrollHeight5588、scrollWidth390等于innerWidth。另[正文/标签视口](browser-minimal-dom-diagnostic/screenshots/d2-comparison-diagnostic-body.png)、[结构视口](browser-minimal-dom-diagnostic/screenshots/d2-comparison-diagnostic-structured.png)清楚且没有重复字段。当前原图重复标题外观与真实DOM/布局不符，限定当前受测Chrome的捕获表现，不推广所有浏览器，也没有无限试flags或修改产品。

这不是生产TLS/全浏览器/完整M5或M6/M7验收。未完成空间概览、本人权限设置、安全Markdown、主题创建排序、容器/教程/干净安装恢复等仍按父后续分包。真实下载只核本fixture文件与现Chrome组合；没有自动执行、外链抓取、任意文件目录或真实模型参与。等待父读本报告并裁当前范围接受，再做metadata收口；不继续更广gates。
