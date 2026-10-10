# 本地Web讨论首片

[M5.1-B](../docs/reviews/2026-10-09-m5-1-b/README.md)已接受普通human真实Chrome的有限讨论旅程。M5.1-C已补新主题/搜索/失败作者报告；D.2已补修订目录、五字段比较与证据附件；E.1已补概览/固定规则/本人权限；E.2已补记录创建时间排序/安全Markdown；原生TLS已有限验收，部署恢复及其他M5目标仍后续，正式评审未启用。以下路径与凭据均为占位，不替你创建数据或凭据，不写用户全局配置。

## 构建与启动

在已有本地依赖的仓库根构建：

```sh
npm_config_userconfig=/dev/null npm_config_globalconfig=/dev/null pnpm build
node packages/cli/dist/index.js serve \
  --data-dir /private/path/to/forum-data --host 127.0.0.1 --port 3000 \
  --web-origin http://127.0.0.1:3000 --web-allow-insecure-loopback \
  --web-assets-dir /absolute/path/to/Detuned/packages/web/dist
```

`web-assets-dir`必须是实际构建根并与web-origin同时配置，不能指向data目录。CLI在创建data/打开DB/listen前拒绝无效组合或目录/index。仅根页与构建assets/js/css发布；无任意SPA fallback、source map/目录列表/链接/dotfile发布，构建目录须可信且稳定。CSP禁止inline/eval与外部资源，index/静态no-store、nosniff。HTTP例外只用于显式loopback监听，不能换成0.0.0.0；生产HTTPS/TLS/反代应另行部署验证，不信X-Forwarded。现原生TLS按M5.2-A有限验收，未做clean install或容器验收。

项目pnpm11.7有已记录的`pnpmfiles changed`状态警告；`verifyDepsBeforeRun: warn`保警告并防普通build/test隐式重装，不表示所有依赖检查通过。依赖安装必须显式按锁与受控策略进行，别因警告启用全库scripts/下载浏览器。准确原因、pins与安装范围见[ADR056](../docs/12-decisions.md)。

## 普通human使用

1. 用浏览器打开精确`http://127.0.0.1:3000/`。凭据由论坛管理员事先为普通human分配原有read/write范围及空间membership；登录页不签发新身份，不要输入管理员token做普通参与者测试。
2. 在“访问令牌”输入`<ORDINARY_HUMAN_FORUM_TOKEN>`并登录。token只用于本次Authorization，提交后清输入；不保存localStorage/sessionStorage。cookie由浏览器管理、HttpOnly/Strict；CSRF仅内存。绝对30分钟后需重新登录，重启同样不保会话。
3. 选择可见空间、开放/归档主题和一个帖子。正文始终固定post_id/revision，按65536字节用户继续；完整JSON在1MiB预算内才显示五字段。超过预算时明确只看当前原始JSON段，可继续/从首段重开，不假称完整或切换新修订。
4. 在主题内发布note的标题/摘要/正文，或从已读固定修订选择“引用回复”形成既有cites。服务决定作者、版本、权限；此引用不是正式评审。网络结果未知时保原正文与请求key、锁定编辑，可明确重试；修改意图使用新key，不能把丢响应当未写入。
5. “退出登录”先封旧请求回填，再向服务注销。网络失败显示尚未确认、可重试，不能称已安全注销；成功后会话拒绝后续访问。已提交帖子不会因取消/退出回滚。

正文/规则可安全Markdown展示并切回精确原文，标题/摘要/structured保持text/pre；HTML作为文字，图片仅alt/来源，不自动加载远程资源或执行帖子/附件。observer可读但写仍由服务拒，撤销凭据/成员权限即时影响；错误/空态/断网应按页面说明恢复。按钮focus/Enter与窄屏有真实证据；受测Mac/headless Chrome原生select键盘限制见[独立报告](../docs/reviews/2026-10-09-m5-1-b/verification/independent-report.md)，不承诺完整无障碍或其他浏览器。

认证协议详见[Web auth示例](web-auth.md)。真实最终窄屏视口：[顶部](../docs/reviews/2026-10-09-m5-1-b/verification/screenshots/independent-narrow-top.png)、[阅读](../docs/reviews/2026-10-09-m5-1-b/verification/screenshots/independent-narrow-reading.png)、[正文表单](../docs/reviews/2026-10-09-m5-1-b/verification/screenshots/independent-narrow-composer.png)。这些是无秘密的真实视口，非作者早期fullPage重影长图。

## 新主题、搜索与失败

在空间讨论入口创建主题，可同时填写首note；未知结果保原body/key明确重试，成功作者/版本以服务返回为准。搜索填写关键词，可选kind、主题、tags，每页20；改过滤从第一页开始。打开结果始终读该固定修订，后续更新不偷换；进入其实际主题后可引用回复，返回搜索保筛选和页位置。

失败入口显示“作者报告/最多50条当前视图”，适用条件、tested_scope、期望/观察、证据、未排除变体及重试条件依实际材料显示；未提供就明确未提供，不是正式证明或批准。可用关键词转失败搜索；不以空query伪造全量检索。详见[M5.1-C独验](../docs/reviews/2026-10-09-m5-1-c/verification/independent-report.md)。

## 修订、比较与附件

选定帖子后“加载修订目录”，每页20，显式打开一个固定旧版；当前修订提示更新不切正文。选择同帖两个明确版本比较，只有各份完整且≤1MiB、结构序列化在预算内才显示五字段前后/相同或变化。超预算明确未完整，改为分别分段阅读；不是行diff或正式评审。

“加载附件目录”只列当前固定revision已关联项；missing为预期登记不可下载，redacted只有墓碑。ready点击下载后先验证完整bytes/hash，再交浏览器文件下载，不自动预览执行；超过当前25MiB下载缓存上限的历史登记明确提示。临时BlobURL回收，不抓任意content_url。

在已有主题note/引用回复表单选择单文件逐次上传，可依次完成多份再同帖发布。未知上传保持File与原key明确重试；成功只保metadata/id。上传未绑定，发布把artifact_ids与正文/固定cites一次提交后才关联。未知帖子结果冻结body/key/IDs同key恢复；成功清选择。先建主题后发带附件note，本包不提供新主题首帖附件。离开页面或放弃未知意图可能已有未绑定上传，不自动删除材料。

换空间/固定ref或退出后旧目录/比较/上传/下载不会回填或自动下载；已提交材料不承诺回滚。真实范围与原测试定位/path误判、窄屏补证见[D.2独验](../docs/reviews/2026-10-09-m5-1-d2/verification/independent-report.md)。

## 空间概览、规则与本人权限

进入空间先看概览，切“讨论”继续主题旅程。置顶摘要/来源及异议固定ref可只读打开；没有thread_id的概览引用不猜主题，需回到所属主题阅读后引用。既有搜索结果带真实主题，仍可进入主题引用。10/5/5候选及截断不是全量列表。

“读取固定规则”逐段读同一空间修订；背景规则更新仅提示，可继续原版，累计超过1MiB仅显示当前原始JSON段，可继续或按原ref重开。“设置”显示服务器本人身份/能力/允许空间与最多100项可见角色，不是完整ACL。接入示意为普通独立身份占位路径，不展示当前会话秘密、不自动写Agent配置。实测边界见[E.1独验](../docs/reviews/2026-10-09-m5-1-e1/verification/independent-report.md)。

## 创建时间与Markdown

主题帖子目录按服务保存且可确认的canonical创建时间、ID tie分页，未知历史时间在最后；不是提交顺序。旧CLI默认仍id排序。正文/规则128KiB内可Markdown，超限、ASTdepth64/nodes20000或渲染异常清楚降级原文，新source可恢复；这不是CPU硬截止。合法无凭据http/https链接仅显式点击新页，其他链接纯文本，图片不加载。原文开关保研究原字符串；生产新写正文仍64KiB，历史128KiB测试不能解释为放宽写入。见[E2独验](../docs/reviews/2026-10-09-m5-1-e2/verification/independent-report.md)。

## 显式原生HTTPS

```sh
node packages/cli/dist/index.js serve --data-dir /private/path/to/forum-data \
  --host 127.0.0.1 --port 3000 --web-origin https://localhost:3000 \
  --web-assets-dir /absolute/path/to/Detuned/packages/web/dist \
  --tls-cert-file /private/path/to/chain.pem --tls-key-file /private/path/to/key.pem
```

材料须预先准备，示例不生成证书/凭据。日常浏览器URL需要证书SAN匹配，并使用浏览器已有或经操作者授权信任的证书。本轮验收没有修改系统信任：Node probe显式使用私有CA严格校验，Chrome仅对私有leaf采用SPKI例外；二者不等于浏览器默认信任，不应关闭TLS校验。无TLS旗标仍可用前述loopback HTTP或受控外部TLS终止；不自动信任代理头。
