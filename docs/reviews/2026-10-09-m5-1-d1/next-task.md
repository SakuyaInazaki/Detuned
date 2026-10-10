# 下一任务：M5.1-D.2 Web修订、证据发现与上传绑定

根已选定本范围。D.1已获父正式接受；下一fresh后实施本任务；本文不代表浏览器能力已通过。D.1下层接口提供有界元数据，D.2复用现HTTP/sharedclient，不新增业务规则、SQL或渲染/路由依赖。届时B负责Web src产品，D负责真实browser/fixture独验，A负责文档；精确路径在fresh后分配。

## 用户行为与边界

1. 已选帖显示显式修订目录，调用D.1 typed metadata API，20/page、max_bytes65536，使用opaque续页。点击固定ref沿已有分段正文入口读title/summary/body/tags/structured。当前版本背景变化只提示，不替换已选post/revision。
2. 比较同post两个明确revision：分别沿固定正文入口读取，单份累计不超过1MiB；只有两份完整且在预算内才显示五字段的相同/变化与前后内容。这是字段对比，不是行diff或语义等价证明；不用O(n*m)文本算法。展示纯文本、有限序列化，结构无法安全比较时明确状态。任一版未完整/超预算，只允许分段阅读，不能显示完整对比成功。
3. 固定revision附件目录沿D.1新API，opaque下一页；ready/missing展示登记的state/owner/mime/bytes/hash等，redacted只墓碑。missing只是预期登记信息、不可下载。仅列该revision已关联附件，不称完整space附件或未绑定uploads目录。ready下载必须显式点击，复用downloadArtifact固定路径、完整bytes/SHA验证，不信任任意content_url。浏览器只下载文件、不自动预览/执行；临时blobURL用后回收。实际browser传输缺口须报根再冻结窄修，不能从client已有方法推断浏览器已通过。
4. 已有主题的note/引用回复composer增加单文件逐次上传，复用uploadArtifact。每次意图持不可变File与key；未知结果锁定同意图、同key显式恢复。成功后只保metadata/id，不长期攒File bytes。选择或上传不等于已关联：createPost须把artifact_ids与body/refs一次提交，成功才算绑定。可先逐个上传多份再同帖发布；post未知结果冻结body/key/已选ids，成功清UI选择。不自动删除已提交但未绑定artifact。不扩新主题首帖附件表单，可建主题后发布带附件note。
5. auth/space/ref变化与logout统一cancel+generation，旧目录/对比/上传/下载不能跨代回填或触发浏览器下载。权限仍server判断，不复制ACL。无rawHTML、自动外链、自动ACK；键盘/窄屏及局部错误提供可恢复反馈。

## 必要真实验收

- 多修订分页、旧版固定打开；两明确版本五字段差异与超预算诚实退化，不把未完成当完整对比。
- 真实上传后一次发布绑定，SQLite核artifact/ref/owner；提交后丢响应再同key恢复只有一份副作用，上传与帖子分别遵守自身key。
- 真实浏览器显式下载，完整hash/bytes正确，无自动执行；blobURL实际回收。
- missing/redacted与私有材料拒绝/不泄漏，墓碑不恢复旧元数据。
- 换space/ref或logout时晚响应不回填、不自动下载；核心键盘与窄屏旅程。

若仅UI/test变动，复用D.1已接受下层gates，运行必要Web build/type/lint、新及受影响browser；保现11关键旅程中受影响检查，不为包号机械全量重复。首失败与实际复验组合保留，无HAR/trace/storageState/凭据快照，使用已装Chrome独立非持久context与自有真实SQLite；可保存无密视口截图。若实际要改sharedclient/server，先报根具体缺口与额外文件边界。

## 后续仍必需

本包不完成空间概览/本人权限设置、安全Markdown、真实主题创建顺序保证、单服务容器/教程/干净安装恢复或完整M5；M6/M7正式评审仍未启用。保留[剩余清单](../2026-10-09-m5-1-c/planning/m5-remaining-pages.md)与[概览/排序事实](../2026-10-09-m5-1-c/planning/m5-overview-order-facts.md)，后续由根分包，不用本包scope把目标静默省略。
