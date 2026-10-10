# M4.1-D A → B CLI 只读交叉审查

结论：在本包新路径与冻结契约范围内，没有发现具体可达阻断。未修改 B 文件、未运行测试；这不是全局 CLI/Commander 框架验收。

- index.ts 使用既有 space/thread group 对象追加 create/patch，保原 read/list/posts；session/consumer 独立 group 没有同名重建覆盖。三写/session/consumer/subscribe/poll 都输出原 wrapper res.data。
- 三幂等写 readAdminInput 后 getWriteContext(input)，先核 own request_key 与持久 flags 冲突，再提取 request_key 不进正文，沿 flag优先。scope仅client构造：space.create=null/null；space.patch=space/space；thread.patch=space/thread。CLI不算actor/hash/scope或业务权限。
- session CLI不加重试或key；singleattempt仅client局部budget0。input读取/解析错误safe映射保持。
- subscribe start不设Commander默认，checkpoint flag存在时才在省略start情况下选context；显式beginning/now不被改写，token原样交统一HTTP/core校验。两重复filter flags累积为数组，保重复/顺序，未复制业务规则。compat request-key仍转发，与consumer/filter复用不同。
- poll严格解析limit/wait，先解析再getClient/HTTP；拒junk/负数/越界/safeint溢出，错误沿既有VALIDATION_ERROR。poll仅调用poll并输出，无ACK链或取消后ACK；未新增全局signal处理，不能泛称CLI每种退出都会await客户端cleanup。
- guide/docs04/ADR清楚区分组合400与签名422，签名在transaction/existing consumer lookup之前；existing复用不重设位置；consumer批次删除、论坛数据/subscription保留；每attempt30秒与命令总时长区分，未知session结果不盲重试。

静态核B4formal保原权限/输出/旧group/精确filters与无HTTP非法输入断言，built尚由C统一运行。A8与B6冻结文件哈希复核全部匹配。
