# E2-A 下层创建时间目录：作者源级交付

新增可选sort=created_at_asc，旧id默认、旧cursor签名字段与旧GET thread不变。SQLite窄分支以24chars+strftime roundtrip决定私有sort_key，valid-before-unknown/key/id及同表达式keyset，未知历史完整展示末尾，未改历史值或导入/DDL。service去除私有key，签名实际发出末行nullablekey+id、对象域/sort/原exp；完整信封预算继续裁整行。protocol canonical字段使MCP/Pi广告同源，client callTool转发，HTTP/CLI/OpenAPI接线；Web由B独占。

作者正式四组，真实SQLite+Fastify inject（不是loopback/browser）：canonical/tie/历史未知与旧默认无body无mutation；cursor缺省/错sort/thread与旧cursor；4KiB实际信封裁尾无漏页+撤凭据；真正TypeBox schema与client callTool/OpenAPI。历史日期为私有synthetic SQL seed，不称import workflow。D承担HTTP/CLI/ACL/TTL/规模性能与最终rootgates。

## 实际检查（所有原输出保留）

1. `node node_modules/vitest/vitest.mjs run tests/contracts/m5-thread-post-order.test.ts`：首收集失败，0test，root未安装MCP SDK入口；不新装依赖，改现有TypeBox Value。
2. 同命令第二次：O01/O02/O03通过，O04失败；作者误取工具字段inputSchema（实际schema）。修fixture字段，第三仅`-t O04`通过。该次尚未证明client forwarding正确，随后noEmit实际发现错误接线。
3. 首source noEmit：三诊断，client sort误落space读取、该分支无sort，以及测试Node types没有RequestInfo。修client至thread_posts分支及Node支持的input类型。
4. 第四仅O04：1pass/3skip，651ms级runner实际Duration见stdout（本次635ms）；最终同source-tsconfig含新test与CLI noEmit exit0。O01–03产品未变故未重跑；四组最终是第二3+第四1组合，不称一次4/4首绿。

每次runner直接exit写独立.exit-code，stdout含elapsed/日期；外层capture命令退出不代替runner状态。source-tsconfig复用源aliases，所有检查直接installed runner，不触pnpm自动安装。无build/full/current29/perf/browser，未新增依赖/SQL/schema/全局配置或git操作。
