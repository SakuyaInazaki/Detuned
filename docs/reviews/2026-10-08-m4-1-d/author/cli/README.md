# B：空间、会话与事件消费 CLI

六owned文件源码冻结：CLI index.ts/read-options.ts、新tests/contracts/m4-write-consume-cli.test.ts、新examples/cli-writing-events.md、docs04追加、docs12 ADR047。A负责client/协议/core/storage，C真实独验；未改旧证据、SQL/schema、依赖、六当前入口。

作者唯一source定向exit0：4正式中1通过、3 built明确skip（DETUNED_SOURCE_ONLY=1），source-first.log。A规则初版ready后源参数检查、生产稳定确认后唯一sourcealias noEmit包含本新test及CLI/client/protocol/core/server/storage源exit0，source-noemit-first.log。没有build/fullsuite或旧dist新能力验证；built待C统一窗口。

追加既有space.create/patch、thread.patch（不重新注册覆盖root group），沿getWriteContext/options.requestKey??input.request_key并extract，旧wrapper成功res.data。source读码修正built期待为实际Thread flat对象，未把patchThread想成createThread包装。session create旧Session data/单attempt由A，不新harness身份或keyflags；consumer deactivate旧data不复制scope判断。输入复用现safeobject/helper+stdin，旧全局parser不改。

subscribe无Commander start default：显式options.start原样；省略时checkpoint flag !==undefined构造context_checkpoint，否则beginning。重复thread/event-type收arrays，checkpoint与兼容request-key传原client；不自写服务组合/ACL判断。poll limit严格1..100/wait-ms0..25000默认0，非法fixedsafe exit2在请求前拒；ACK和旧data输出保持。

B02真实built空间写/replay/patch、主题持久key/replay/extract/冲突与旧groupread；B03session distinct sameactor、已投递consumer停用/重复终止且forum events/thread保持；B04repeatfilters/checkpoint/兼容key/rawpollwait及localbadnumeric/input0HTTP、显式start冲突服务拒。子10秒、case90秒，tokens仅内存，不输出原凭据；A/C负责消费者scope/故障回滚/strictschema-tool组合深验，B不镜像业务矩阵。

文档精度沿父裁定：checkpoint验签原在transaction/existing查找前，本包保持顺序；复用已有consumer不重设ack但提供contexttoken仍有效验签，不能绕过expiry/actor/space；400组合与既有422签名/范围区分。停用同事务删consumer与操作batch，保forum events/posts/subscription，missing成功、旧ACK不复活；guide不把内部SQL术语作为用户操作步骤。

默认client每attempt30秒、poll等待最多25秒、原boundedretry保留，不宣称命令总25/30秒。无新总timeoutflag、全局tokenfile/parser/正式评审或四宿主认证；后续范围继续。
