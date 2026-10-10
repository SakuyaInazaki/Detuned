# M7.1-A：内部检查回执与schema6维护

开工目录日期为2026-10-09；本地功能接受与本文档日期为2026-10-10。root已接受限定内部功能，当前metadata末核/封存仍待，不能宣称完整M7或公开check HTTP可用。

## 已实现边界

CheckService与ArtifactService内部实现run创建/读取、固定snapshot及post revision、维护权限一次性受限凭据签发/轮换、receipt提交/读取、invalidate及run日志上传/metadata/content。run从已核冻结snapshot/profile取摘要；最大attempt代表该required检查当前事实。receipt与日志绑定同run/verifier，固定observed摘要、严格date-time/大小限制、全局receipt ID与每run唯一。fresh状态/历史/事件/幂等同事务，replay继续refresh权限和隐私但不重复扣fresh限流。

verify只single-space/single-capability/expiry/run绑定，允许被冻结profile指定的活动service actor无普通membership；不授普通getMe、空间/帖子发现、genericartifact、私有评审、session/Web或管理权限。同actor/管理员不绕过sealed隐私。事件含created/completed/invalidated，thread筛选安全从run到request目标。

schema6仅四新表：check_runs、check_run_versions、check_receipts、check_run_credentials。history的内部observed_request_version让decision(v)选择observed<v的最大版本，latest failed集合必须精确完整，负评优先仍可空receipt集合；终态后invalidate不改历史decision，终态request不能新attempt。fresh acceptance要latest required全pass且日志ready；当前validity有check_invalidated/check_log_redacted/check_log_unavailable，不能将历史接受当当前批准。

## 维护与真实V5

真实[V5归档](../../../tests/fixtures/m7-schema5-baseline/README.md)来自已接受旧runtime服务行为，原件只读并保原字节；测试只复制、水合freshsecret后调用维护coordinator，不SQL伪造formal成功对象。V1–V5冻结profile保持，canonical生成两次由D唯一窗口留收据。

普通serve/init拒legacy1–5；offline复制只新stage升级1–5→6，物理backup/restore严格2–6、保七formal及四check表，撤旧凭据/换secret/一次性新管理员。逻辑export仅header支持6、不增加formal/check family，日志白名单不带check_run_id；import四check与七formal空，ready日志missing、binding null，不继承可信receipt身份。

## 实际验证与限制

[独验](verification/independent-report.md)、[gate-summary](verification/gate-summary.json)及原始收据保留一次full **884/892、143/144文件**；八旧合法legacy fixture混schema6结构修共同child→parent降级helper后整个相关file **82/82**。组合证据闭合，没有第二次full，不称一次全绿。新24（A11/B3/D10）已包含892，不能相加。current仅28/29各一次，其他probe复用旧接受证据。

首build TS2322、首focused100/101的旧DF05失败及精确修复保留；相关两file13/13，最终build/type/lint/schema/noEmit通过，build-v2未运行。A/B/D所有owner最终freeze与V5保护由D核对；[cleanup](verification/cleanup.json)仅26自有PID消失与fixture teardown，无独立tmp census。无浏览器/模型/新宿主/容器/跨平台认证，app.inject不是TCP证明。metadata作者未运行gate。

## 下一包

[M7.1-B1任务](planning/m7-1b1-task.md)与[owner候选](planning/m7-1b1-owner-candidates.json)仅规划，以实际文件为准；待本包末核/seal、新fresh及root dispatch才产品写入。B1只HTTP/sharedclient，CLI/MCP后B2；外部无模型验证器、D01、完整M7维护交付仍待。不恢复前端任务。此前[C2B](../2026-10-09-m6-4-c2b/README.md)及历史封存只链接不改。
