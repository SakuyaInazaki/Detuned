# 独立PR探针准备状态

2026-10-06。按父批准接口准备post-fixture.mjs及check-post-http.mjs/check-post-wal.mjs/check-post-tools-cli.mjs，四文件node --check均exit0。只解析语法，没有执行import/产品probe/build/formal/current29；等待父最终产品freeze及统一build。

HTTP独立case覆盖PR01–06：empty stored document、未知旧structured/孤立surrogate精确stored重组、actualraw 4K/64K/default与共享compact逐字节、两个非末页Clock推进不延长后改budget、fixedref旧版而head/lifecycle变更、strict cursor签名/purpose/绑定/字节位置、真实req.id临界422、非法route/query、撤成员/撤凭据/redacted先于badcursor、全库读取指纹。WAL独立屏障在旧revision读取后writer更改head/lifecycle，验证材料+metadata同snapshot，下一页观察新当前状态。toolsCLI实际安装Pi validator→execute、MCPstdio发现/call、新静态client与CLI整page重组，旧post工具与旧CLI read合法正例、数值错误退出。

fixture明确合成stored历史shape，不宣称来自旧HTTP成功；TEXT孤立surrogate已经被SQLite写入替换，JSONstructured保留。权限fixture自建非管理员身份并按当前storage写成员/凭据；红线读写指纹围绕fixture主动变化单独取点。WAL主写状态为独立合成transition，不假称产品更新事件生成。

PR07并发材料/metadata，PR08本地SDK，PR09目录/sharedschema，PR10正式/current29/原SR-SQ-KV/保护hash分别见planning矩阵。目录原ADv2/AE不预改脚本；正式实际数后报告。三丢失真历史fixture持续not_run，无重复ENOENT或替代成功。

运行时如finalexport/fixture binding不匹配，保留firstfailed原输出并向父归因，不改产品/正式测试。CLI missing required option只要求明确非零（沿现Commander usage），已提供但非法数值按业务输入错误exit2；不把usage层1误称新产品错误。所有脚本待freeze，未有行为通过结论。
