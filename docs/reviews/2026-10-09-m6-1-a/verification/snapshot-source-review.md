# M6.1-A 快照独立源审

2026-10-09，B只读审查。对照 planning/root-contract.md；A manifest SHA5495b8bfd74e833b8c170bc8bc7c12ff260a2e3975c96ba004e52a309fe84dab。五项实际源码/测试/合同hash均与manifest匹配。未运行作者测试/全门禁或复现，未修改A/B生产文件；不使用或管理任何外部VM。

被审产品：modules/review/src/index.ts SHA8d014785247f6cad29570ba2dbe5db40d21af1df52ee29dd03d3bd5dbdd90d5b；protocol/review.ts SHAba570190ff1ad4e55de5dc88caa3861d191aeb51f5b4a063717609f0e264062c；protocol/tools.ts SHA448faabfd6d3e0f6605272a0b8bfbdd5faa354dcfce6246a0bf408f105873e61。作者test SHA07f8e07e0e7429e14af7edf3a4a01821bc334d4f1d11a9b8acbafe3e36b8ff90。

## 结论

在根已批准的“有限材料构造、无资格/持久化/正式服务”范围，未发现新增阻断。此结论来自实现逐段阅读，不以作者日志充当独立运行证据；未宣称任意自定义StoragePort、恶意Proxy或磁盘材料的完整隔离证明。

- 同一readSnapshot包住入口全部逻辑（index:43–134）；先refreshContext并observer空间访问（44–45）后校验请求/读取。标准组装要求AuthService与ReviewModule共用该storage，构造器类型不能自行证明任意宿主传入同一连接；本包作者组装22行确实共享。
- policy先安全整数、expected冲突（54–56），以policy_revision读真实SpaceRevision（57）；不读space.current_revision/pinned_refs进入manifest。required_checks去重、非空、最多32（59–61），profiles仅required项；64hex/config、≤128互异verifiers、空名单允许（62–68）。policy数组copy后排序（122），没有旧pinned hash变化或未要求profile进入摘要。
- target/dependencies同空间、active/current、redacted单独410、固定修订/hash有效（86–106）；target仅claim，复用严格新写parser（98–102）。返回target四字段/assumptions和ref均copy（117–118），不重写历史或调用旧canonicalJson。
- contributors包含作者与全部metadata历史页editor及申报（69–85）：每页100、after逐项严格下降，has_more空页拒；总扫描10000/贡献者4096到界后拒而非截断，历史正文不加载。依赖最多32，重复ref和target重复拒，故不存在因同ref重复扫描错误集合。
- 附件同空间且space可见，ready/有效64小写hex、安全非负bytes才纳入（107–114）；私有或不存在统一404，missing409/redacted410。该行为只是DB元数据绑定，未伪称当场磁盘hash验证。
- code key三元组去重/source_artifact_id必须显式附件（50–51），DTO逐项严格限制（review:35–49），集合UTF16 tuple排序（120）；artifact/contributor/check集合排序，目标assumptions意义数组保序。所有嵌套返回数组/对象已按实际schema完全copy；没有可变输入或storage引用遗留。
- materialRead仅把JSON SyntaxError固定转400（30–32）；原auth错误保持；typed parser错误固定400（101）；canonical byte413、depth/nodes422、其他400（128–132）。无法凭正常入口触发含研究文本的错误透传。系统/driver未知错误仍抛原异常，不能将此内存模块误称HTTP全局error renderer。
- ToolReviewRequestOpSchema引用CreateReviewRequestSchema.properties（tools:195–200），没有复制旧fields；HTTP DTO没有request_key，新顶层复现/code附件字段与工具同源。工具未新增进八工具广告，不提前开启正式评审。

## 作者测试阅读范围与剩余运行证据

RS01（32–42）检查单readSnapshot调用、无数据库变动/输入变动、集合置换hash稳定及意义数组变化；RS02/03（44–63）覆盖撤销凭据、生命周期/非current、policy冲突/code重复/附件状态；RS04（65–76）检查required配置、emptyverifiers、pinned稳定/策略指针及超byte；RS05（78–85）205历史跨页编辑者与10001总扫描拒，正文读取只目标/依赖。

作者RS01的spy次数本身不是多连接T0并发实证，RS05 fixture是私有SQL历史构造而非万次业务写；独验应按其已有边界提供真实SQL/事务证据。没发现需要另开复现的可达反例，本审未重复成功测试，也未将本包范围扩到reviewer资格、请求持久化、封存或finalize。
