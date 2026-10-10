# A→B 读取CLI与guide只读互审

范围本包新增CLI/parsePageLimit、guide/ADR044与冻结，未改B产品、未运行tests。A source noEmit一次exit0（protocol/client sourcealias）。新增read commands直接sharedclient，无服务端业务或凭据规则复制，无新增endpoint。

- me/capabilities/diagnostics、health live/ready均输出data；health用原optionaltoken构造，未新增匿名框架或tokenfileflag，ready503沿error/exit1。diagnostics权限留server；没有本地猜admin。
- space/post/thread各复用唯一现group补list/revisions子命令，原read/posts仍在；列表完整data/meta。threadstate固定枚举与limit严格整数只输入契约；view固定三name输出data无伪meta。
- search默认res.data不变；options.page或options.cursor!==undefined输出整个page，空cursor也按存在性传server处理；thread→thread_id，tags逗号原语义。limit strict1..100在请求前验证，拒尾字/小数/越界。cursor没有decode或签名业务判断。
- handleError与既有exit mapping保持；本包新增SERVICE_NOT_READY不另改成false成功。匿名可用不代表配置token时强制删除token，原env/filefallback未改。旧read/context/chunk/目录格式未覆盖。
- guide健康alive/ready shape、受保护diagnostics、default搜索/data整page区别、未统一Commander parse错误边界与ADR044一致。

仅文档精度建议已报B/父：guide第17行“签名、绑定、过滤和权限”位于通用列表段落；legacy revision目录cursor实际修订号文本，不能让读者理解所有列表已有search签名机制。建议改为“各接口现有游标/过滤/权限由server，CLI不decode”，搜索签名绑定另按已有合同。没有产品缺陷，A不越权编辑B文档。

两healthwrapper类型取现schema Static单源，A三个freeze文件逐hash仍匹配，零mirror tests/无build/fullsuite。最终门禁由C与父裁定。
