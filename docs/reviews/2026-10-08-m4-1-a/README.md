# M4.1-A 读取、诊断与搜索分页 CLI

2026-10-08：父已接受下述有限本机范围。本包复用sharedclient新增me/capabilities/diagnostics、匿名health live/ready、space/thread列表、post revisions和三知识view；显式search --page/--cursor保完整data/meta与next_cursor，旧默认数组保持，--thread映射已有server过滤。两health薄wrapper与Static类型复用原schema/request。新及受影响limit严格1–100，state/view非法固定exit2且不发请求；权限/游标判断仍在服务端。

最终525/525项、69/69文件，新8（B4+C4）已含总数；build/typecheck/lint/fullsuite各1。current29四门禁+24原保留probe+1 A.1批准适配全部通过，原第11失败历史未改写。首专项4/8的Clock缺nowIso与view wire期待错误、四失败case修后4pass/4skip及最终整体回归全部保留；无产品改动或重构建。

独验真实进程证明双身份/隔离空间与列表历史连读、旧格式、三命中search续页及server cursor绑定、16坏limit零HTTP、匿名health/ready异常与admin权限/撤销/断连、三view合法材料与零HTTP参数拒绝/health preabort。仅小固定fixture，不泛称所有legacy cursor签名或跨页snapshot；客户端原重试/取消/fallback未改。

证据：[验收](verification/verification.md)、[机器结果](verification/final-results.json)、[完整性](verification/integrity.json)、[命令](verification/commands.json)、[基线](verification/baseline-summary.json)、[A](implementation/client/README.md)、[B](implementation/cli/README.md)。4491旧review、HEAD、SQL/schema/mutable原哈希保持，作者freeze匹配，owned进程/目录残留0。一次40MiB只由fullsuite继承，未跑600s/模型/四真实宿主；M4整体、全局parser错误、凭据flag、身份/附件完整CLI仍须后包。
