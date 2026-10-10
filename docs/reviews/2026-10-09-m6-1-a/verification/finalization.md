# M6.1-A 最终封存

2026-10-09，根已接受有限材料快照/JCS（acceptance.md），A最终 metadata v2 与B全部planning停止写入。未重跑任何成功代码门禁、未执行下一包或创建fresh。

[finalization-check.json](finalization-check.json)核最终14文档及4 planning hash（任务书与文档清单重叠一项）全部匹配；manifest SHA4d9d2b10d70c3a079e5bee19ce79a38b5750a3a7c2514ef1bf42a60b40dbad04。305本地Markdown链接无缺失，核验时34 JSON有效，git diffcheck0。v1历史freeze保留，不以其旧hash要求当前v2匹配。

当前入口/ADR064如实写717/108＝首716+唯一旧backup原5000ms case1936ms定向通过组合；新18在最终完整core首过，build/type/lint0、D6/noEmit0；current25复用非本轮执行，没有完整M6或首全绿声明。原完整失败/成功日志及hash未变。功能报告SHA1098e1cda88a1ff1dfffdcee1639f85434b301c4cc270f8b47f0248729b6ce5f保留。

AGENTS只补最新用户环境边界，精确before在功能接受后补取得，SHA57fd1b0b…命中fresh原状态hash；不是fresh时字节备份，见supplement-before-agents.json与agents-exact-before.diff。未经用户明确许可不得为验证创建VM/容器守护/常驻后台；原Colima保留不操作、不擅自删除，本地短寿命owned测试可继续。本轮文档末核无任何环境操作。

A/B源freeze七项与D正式独验源均保持功能验收字节；仅获准3现有源码+4新源码/正式测试。旧8272 review、SQL/archive4、schema2、旧Hasher、lock ea84a370…与HEAD b8dacd56…守恒；当前docs修改仅授权11既有入口/契约文档及包内材料。dist保持本次已验build输出，不能宣称fresh后完全不变，详integrity-final.json。

下一任务书明确 **未来** M6.1-B schema3普通serve/init拒legacy1|2，与现实旧auto1→2不同；blank只init，migrate只新stage。这是兼容行为取舍，未实施/验证。ReviewRequestService位于modules/review，core仅metadata/port/idem/eventfilter；9旧测试逐项授权非批量替换；historical-v2SQL完整DDL/recipe新fixture不假造TS。

根另明确下一正式dispatch精确解释：申请者为目标作者或当前maintainer/owner；取消者为request.requested_by或当前maintainer/owner，不是所有目标作者能取消他人请求。现任务书综合错误段“非作者/maintainer403”不据此放宽取消者；该细化由下一fresh task-boundary记录，不回改历史planning，不触发代码/冻结循环。

whole包（全部planning、任务书、before、首失败、报告、作者源审/日志、metadata及本finalization）将由finalization-manifest.json绑定。主代理读取后才授权新fresh；本包此后进入旧保护，不修改既有证据。
