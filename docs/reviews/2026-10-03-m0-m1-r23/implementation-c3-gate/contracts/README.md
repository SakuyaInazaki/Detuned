# C.3-GATE 单元 B：共享请求政策与完整正式契约

实现范围：protocol/request-policies.ts 提取既有整数范围/默认、state/view枚举、非空字符串、传输/no-body政策；现有server query parser及分页/上下文/帖子/search路由复用。OpenAPI 保留既有body引用与匿名/订阅/poll行为，并描述CSV、重复/未知query、no-body写入口政策。Header标准字段正常允许，业务key仅在原本必需的操作表达非空；subscribe不新增约束。全部params保留string，不新增UUID/前缀要求。

正式新增 r4-c-route-contracts.test.ts：G01从实际onRoute比较完整method/path与所有body结构及params；G02整数schema/parser/HTTP；G03现行字符串/枚举/CSV与header；G04匿名/订阅/poll及三no-body政策。已有C01-6覆盖no-body非法请求和落库前拒绝。目标测试4/4通过，日志为target-tests.stdout.txt与target-tests.stderr.txt；protocol tsc --noEmit exit0。最终全套总数及29命令等待独立统一验证，本Agent未运行全量build/test。

`collect-route-policies.mjs` 应在最终build后运行，stdout保存route-policies.json、stderr分列。它从实际路由和生成规范产生每操作body/query/params/业务headers/来源/缺省/空值/重复/未知政策与正式断言指针，精确比较集合与所有body。标准parameter schema无法执行重复/未知query政策，扩展仅描述；HTTP测试负责验证。

当前文档 docs04 区分实现/规划并说明timeout覆盖body且不重试、非法RetryAfter后备及默认最多4次尝试；compatibility分最低支持与本机Node26.3.0。历史证据不改，新errata记录C2/C3误表与类型/时间说明。状态入口留父Agent最终验收后更新。

局限：core仍拥有搜索trim后长度1–256、view授权优先与未知404；OpenAPI对trim语义用description/x-trimmed-length，未在server增加不同规则。真实四宿主/Node22/干净安装/远程CI均not_tested。

下一包输入：M2.1只含stream附件、SHA256、配额、授权下载、孤儿清理。需要明确临时文件→finalize→DB ready恢复窗口与失败清理，ready前不可引用；不伪称文件系统和DB一个原子事务。上传语义应是独立上传后引用、service生成key、25MiB/space1GiB默认；评审私有附件仍M6未启用。仅记录输入，未实现附件。
