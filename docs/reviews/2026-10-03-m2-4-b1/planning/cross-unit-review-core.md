# 核心单元对协议单元的窄交叉审查

2026-10-06，只读源码审查；不是自身 core 独立验收。未运行新 tests/build，未修改产品、正式测试或规范。以 planning/interface-freeze.md 为准，核查 protocol spaces/search/tools/OpenAPI、server app/spaces、client/client.ts 与 CLI index.ts。

本次静态核查未发现与冻结接口不符的具体缺陷；这不能替代 HTTP/SDK/CLI 独立运行证据。

- search.ts:199–219 的 included/omitted 完整 data 分支拒绝半 null；omitted 完整 page 分支要求 truncated=true、next_cursor=null。spaces.ts:134–140 的完整 page/envelope union 对应 complete=false→true/nonempty cursor，complete=true→false/null。
- tools.ts 的 space 分支必需 space_id/revision，无 id；仅 space 接受 cursor/max_bytes。post 可选 revision、thread 无 revision，两分支均拒 cursor/max_bytes；artifact/review 不进入发现 schema。root object 保留 Union/anyOf；direct callTool 在 client.ts:785 调共享 validateToolReadParams，不仅依赖 SDK 预校验。
- spaces.ts 文档 encoder 只生成固定顺序 objective/rules。route spaces.ts 固定 revision 路径经 safeinteger 严格解析、query 白名单、共享预算政策，将 req.id 传 core 后直接发送同源 compact serializer，未二次裁材料。OpenAPI:181–191 发布固定 route、query 与完整 envelope schema；app:78/114 注入同 signer/secret/clock。
- client.ts:425 保留 data/meta；getContext/getSpaceRevision 静态返回完整 page；forum_context 与 forum_read space 沿此路径，不丢 meta。post/thread 仍保留旧 data 返回，属于批准兼容面。
- CLI:254–268 的新 space read 必需 revision，严格正 safeinteger，整 page 输出；context:272–284 同样输出 page 并明确 focus 未支持。旧 read post/thread 保持原合法输出，没有为 B.1 趁机改其参数或输出。

已知保留边界：client 对这些 page 的相关 union 是服务端保证的静态合同，不新增运行时响应校验；成功 compact HTTP cap 不覆盖 SDK/CLI pretty 包装、header 或错误正文。旧 post/thread CLI 的 parseInt 与 thread 忽略 revision 不属于本包批准修改面，已记录为 B.2 冻结前事实，未当作 B.1 新回归。

停止写入；最终是否接受 B.1 由父代理依据独立验证决定。
