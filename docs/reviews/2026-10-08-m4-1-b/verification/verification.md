# M4.1-B 独立验收（父已接受）

2026-10-08。父于2026-10-08接受有限本机范围；最终完整回归542/542、72/72，新17，current29组合29/29。本包只涉及附件 shared client 与 CLI 文件入口，不等于 M4 完成；无 server/SQL/schema 业务改动。protocol 增加既有 schema typeguards 与父批准已锁 ajv-formats 3.0.1 直接依赖及 lock importer 更新，不宣称依赖零变化。

统一构建、workspace typecheck、lint 各实际一次 exit0。新三文件实际收集17：A8+C5 首均通过，B3通过/B04 前置漏必需 request key，原首16/17输出保留。父授权仅 B04 metadata{}+固定 key 后定向1通过/3未运行，无产品修改或重建。

首次完整回归实际541/542、71/72：本轮17全部通过，旧 KCLI03（8输入变体×两个CLI命令=16顺序child）默认5秒超时。原失败保留。父批准仅该case显式30_000ms；16变体/零writes/目录断言/每child10s原样，一行diff及hash保留。定向1通过/4未运行2256ms，第二完整回归542/542、72/72通过，该case同全套并发窗口3224ms。25保留探针全部 exit0，即24原入口及批准 A.1 scenario11 adapter；绝不称原第11默认命令成功。首次 current29 组合28/29保留；最终采用已过28命令及第二suite形成29/29。

C五组通过真实不同 server/client/CLI 进程：贡献者 binary/empty 文件的 HTTP 原字节/SHA/0600；持久逻辑键新进程 replay、改bytes/MIME409、撤销原token/同actor新token恢复、不同actor/space键与权限隔离；已有file/symlink/directory保护、两个CLI竞争新目标唯一赢家、坏input symlink/directory/sparse25MiB+1零HTTP；固定raw content_url trap零访问及错误hash/截断拒发表文件且content只请求一次；content-entered屏障后共享client timeout/AbortSignal settle并socket关闭。最后CLI SIGINT只证明未完整接收验证、未建本地temp阶段OS断开，不冒称cooperative AbortSignal或写盘crash无orphan。

B正式已实际覆盖 no-writer FIFO 及时拒绝及真实文件link后可信syncParent故障：完整final0600保留/own temp清退，生产CLI没有此seam参数。A真正日期缺陷、草拟未接受日期方案、JSON reader取消窗口缺陷与必要定向修复原记录保留在author/client；最终built整8通过，不称source首整组绿。JSON新reader仅upload/getArtifact，1MiB本地cap、完整UTF8/EOF/JSON与取消/释放；content固定同origin路径拒redirect，metadata沿原JSON redirect规则。完整性SHA不是来源签名，metadata/content非原子快照。

有限适用边界：25MiB缓存非端到端流/零拷贝/硬RSS；WebCrypto/native同步不可硬抢占。raw loopback控制不冒称核心授权测试。没有600秒性能、模型账户、外部宿主或多平台认证；旧40MiB案例随两次完整suite实际执行两次，没有额外大材料试验。最终哈希保护检查exit0：4599旧reviews、SQL/archive4、schema2、HEAD及5状态文档不变；A8/B6冻结hash匹配，source允许delta含获准旧KCLI03单行timeout，第二suite稳定窗口零变化；dist为本次唯一构建输出。finite新归档144文本token格式扫描零命中，不是全库/任意秘密脱敏认证。owned worker/项目CLI候选PID/私有dirs均0，无广泛kill。
