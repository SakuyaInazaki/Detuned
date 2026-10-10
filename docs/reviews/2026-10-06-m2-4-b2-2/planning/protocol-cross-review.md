# M2.4-B.2.2 核心单元对协议单元的只读交叉审查

2026-10-06。这是冻结后的协议实现静态交叉审查，不是核心自验或第三方独立验收。仅阅读本包相关源码、冻结合同与协议交付记录；未执行产品、测试、build、Pi/MCP/CLI。只新增本文件，发现不自行修改。

## 具体发现：HTTP cursor 政策提前于当前 ACL/归属

`packages/server/src/routes/threads.ts:27–29` 在调用 service 前，以默认 `parseStringQuery` 拒绝空/空白 cursor，并单独拒绝超过4096字符的 cursor。`packages/server/src/utils/query.ts:127–132` 对空串给出通用“查询参数 cursor 不能为空。”；因此未使用冻结固定英文提示。对比 `packages/core/src/services/thread-posts-read-service.ts:26–40`，本包正确顺序是 snapshot 中 refresh身份、space observer、thread归属后，再进行 cursor 校验。`packages/protocol/src/threads.ts:52–56` 已统一空/空白/超长 cursor 的固定400非重试提示。

最小条件一：有效认证令牌、目标线程不存在或不属于指定空间，query只有4097字符cursor；route直接400，未到 service 本应优先的404。有效身份已撤销空间访问时也提前于当前权限判定。最小条件二：有权读取目标线程，`?cursor=` 或空白cursor；得到通用中文错误而非冻结固定提示。以上为源码推导，未声称本轮HTTP复跑。已先报告父；修复应由协议所有者执行并重新冻结。重复query类型解析等既有HTTP传输层政策不在此发现扩展范围。

## 已核实对应关系

- `protocol/src/threads.ts:44–66`：limit复用THREAD_POST_LIMIT、预算复用CONTEXT_BYTES、strict query拒extra、cursor4096字符、严格v/purpose/actor/space/thread/sort/after_id/exp载荷；after_id仅非空，不要求数据库存在。TTL实际绑定/当前授权在core service，不在client。
- `protocol/src/threads.ts:68–81`：读取Thread.title取消新写长度限制；Post只使用现metadata schema，不join正文。三分支精确为true+cursor+至少1post、false+cursor+至少1post、false+null允许空；完整envelope带api_version/request_id。
- `protocol/src/threads.ts:83–90` 与 `core/src/services/thread-posts-read-service.ts:47–67`：同源JSON.stringify/TextEncoder精确计完整compact envelope。service以实际request_id、真实签名cursor计量，裁尾后按最后实际发送id重签，不复用storage末尾rawcursor；原候选非空不能裁空，空线程metadata不fit也422。
- `server/src/app.ts:81,119`：shared storage/signer/auth/secret/clock接线。`server/src/routes/threads.ts:20,30–31` GET传入真实req.id并直接发送同源serializer；`server/src/routes/posts.ts:22`原POST同路径由HTTP方法区分。`protocol/src/openapi.ts:270–288`同时保留GET与POST，query/default/range及响应schema对应；末尾cursor归一化保留新route专用约束。
- `client/src/client.ts:561–570,800–810`：新getThreadPosts使用新GET、query和AbortSignal，返回data/meta整page；新kind完整page；旧getThread路由/参数及旧tool thread返回data首批保持。旧post仍返回完整data。
- `protocol/src/tools.ts:30–40,256–296`：新thread_posts分支允许limit/max_bytes/cursor且拒revision/extra；旧thread分支未加入预算/分页字段；仍8个原工具名称，object+anyOf结构与direct callTool共用validator。
- `cli/src/index.ts:254–256,284–297`：新thread posts命令不与旧read替换；数字必须纯digits、正safeinteger，业务范围由HTTP/service严格校验；输出整page；未复制权限/生命周期业务规则。
- `adapter-pi/src/index.ts:22–28,46–60`：仍从DETUNED_TOOLS注册同8工具，不丢JSON Schema union约束；执行共享client.callTool并传Signal。这里只确认源码，不将其当真实Pi宿主认证。

## 边界

除上述HTTP cursor次序/提示问题，未发现本次所核冻结关键点的新增具体偏差。协议交付日志中7/7与noEmit是协议方既有证据，本审查没有重新运行或独立确认运行结果。完整suite/current29、真实SDK/MCP/CLI、WAL及无写检查由独验负责；三遗失原历史fixture继续not_run。本包目录仍动态id ASC元数据目录，不等于聚合全文、focus、100k或完整M2/T06验收。

## v2 修复只读复核：原发现关闭

父批准协议所有者先反例再修复后，2026-10-06再次只读核实；原发现与原日志保留。当前 `server/src/routes/threads.ts:27–29` 已使用 `parseStringQuery(query.cursor, 'cursor', {allowEmpty:true})`，移除路由字符串长度前置，随后立即进入 service。这与既有固定读取 `server/src/routes/spaces.ts:121`、`server/src/routes/posts.ts:69` 的allowEmpty:true处理对应；冻结要求不是接受坏cursor，而是由服务端业务在当前授权/归属后统一拒绝。

再次确认 `protocol/src/threads.ts:52–56`：空串、纯空白、超过4096字符的字符串都先进入固定THREAD_POSTS_CURSOR_ERROR_MESSAGE的400/非重试分支，绝不会落generic query message；其余结构schema不合法才为generic query message。`core/src/services/thread-posts-read-service.ts:26–31` 仍先refresh身份、observer空间权限与thread归属，再调用该validator。`server/src/utils/query.ts:111–124`仍允许对重复cursor数组或非字符串先给transport shape400；新route:24仍先拒unknown query。此修复没有将上述传输结构错误混同字符串cursor业务政策。

只读查看正式D08及现有记录：repair-d08-red.command.json实际vitest定向D08 exit1，stdout为1failed/7skipped，stderr为一个测试的11条差异（非11个测试）；正确目标空/空白提示2条、非member/跨space/不存在thread各三类cursor共9条。repair-contracts-green.command.json与stdout为新文件8/8、exit0；repair-types-green.command.json为sourcealias noEmit exit0，输出为空。D08绿色新增无read capability403对照，未把该分支声称在红运行中失败。没有在本审查复跑这些命令。

结论：源码及既有红绿记录足以关闭本报告发现，可由父恢复基于v2的独立验收。此判断不是替代第三方独验，也不把原v1独验声明为v2通过。本次只追加本报告，未修改产品/tests/规范、未测试/build。
