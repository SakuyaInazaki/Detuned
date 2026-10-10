# B transport/decoder/CLI 交付（待统一built验收）

纯protocol decodeSpaceExport由现client parser窄抽取，固定最多1MiB行buffer，逐exactLF行复制交callback、不按碎片重复拼接整个已收行；WebCrypto raw32链/schema/seq/count/end+EOF沿B.1wire不变。onLine await背压且provisional，signal与挂iterator/sink race及时退出、观察迟到拒绝，finally移listener，iterator.return只尽力观察不阻塞。限额只允许缩小三个公开编码/total/count值，不更改raw业务候选限额。无Node/fetch/本地权限业务依赖。

HTTP adapter保认证fetch/ContentType/HTTPerror映射、既有timeout/用户Abort分类和独立reader；expectedSpaceId仍首header绑定，decoderinvalid映射ClientProtocolError，其他transport错误沿原类型，不retry。HTTP finally原reader.cancel().catch/releaseLock与controller.abort仍存在，timeout覆盖body/hash/sink。现有B.1正式挂sink取消测试不改；本包B05真实adapter控制fetch检查wrongspace、timeout及调用数，没有扩大业务ACL。

CLI本地import仅校参数、Abort信号与稳定ImportError退出码，A importSpace负责同FD输入/业务/staging/发布。直接输出A六项snake_case结果，token只一次成功stdout，无getClient/tokenfile/URL/网络/模型。SIGINT/SIGTERM转Abort，完成/失败移监听；默认/最大120000ms，名称trim≤128码点。source actor/provenance/附件转换在A，不在CLI复制。

before-cli.log/.exit-code是真实旧built未知import命令（exit1），说明新能力尚不存在，不作为旧命令业务漏洞或missingimport编译反例。source decoder-first四项通过，追加HTTP第五项后decoder-http五项通过；两轮不累加成独立case。正式新文件当前6项，其中B06真实built CLI闭环及拒绝/nooverwrite/symlink待C统一build运行，不能称已通过。

source-noemit-first为/tmp配置未能自动定位仓库node类型导致已有与新文件环境types报错，原日志保留；补绝对typeRoots后source-noemit-second exit0，范围protocol/client，无CLI/A未导出的API；不是产品修复或全量typecheck通过。最终微小runtime未知limit键拒绝已冻结，未预防性重复定向。源码别名config归档供复核；没有build/fullsuite/install/git/旧tests或旧证据修改。统一build后由C运行正式6项与独验，必要真实修复再授权。
