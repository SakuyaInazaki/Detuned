# B.2.2 覆盖与状态收尾审计

2026-10-06，父接受有限本机工程交付。数字依据[verification.md](verification/verification.md)、[coverage.json](verification/coverage.json)、[commands.json](verification/commands.json)，不把开发定向运行加到正式唯一测试总数。

| 项目 | 实际事实 |
|---|---|
| 唯一fullsuite | 311/311、32文件；本包core10+contracts8含总数 |
| current29 | 29/29；build项引用build-v2，typecheck/lint通过 |
| 独验执行 | 48命令：47 exit0+1工具probe date-time初失败；修正版通过、首证据保留 |
| 构建 | 2次：v1与route修复必要v2；core/helper未变首WAL不冒称v2重跑 |
| 原PR/SR/SQ/KV | 3+4+1+1=9，原路径均exit0 |
| ADv2/AE | 38operations/38routes；20body=19JSON+1multipart；placeholder0；36date-time ignored非格式认证 |
| 验证窗口稳定 | 129source/36currentdocs/5mutable；2492旧证据/4SQLarchive/2schema零变动 |
| dist最终 | 208tracked/48untracked，正常产物单列，不删除 |

[版本过渡](verification/version-transition.json)与[完整性](verification/integrity.json)证明v2窗口稳定；状态收尾发生窗口之后，仅以下9文档获准：AGENTS.md、README.md、docs/progress.md、docs/reviews/README.md、examples/README.md、本包README.md、coverage-audit.md、implementation/README.md、next-task.md。这些不是产品变化，也不反写原verification报告。[源只读审计](verification/readonly-audit.md)保持原证据。

开发首format/类型/symbol比较错误及[D08首红](implementation/protocol/repair-d08-red.stdout.log)、[修复绿](implementation/protocol/repair-contracts-green.stdout.log)、[独验格式首失败](verification/observed-tp-tools-first-2026-10-06.stderr.txt)全部保留；D08一个正式测试的11条差异不计11formal。工具严格日期局部registry修正版核真实ISO并恢复注册，不删完整schema断言，不冒称官方认证。

三遗失原历史fixture not_run，不能说全历史重放本轮保持。Node22/干净安装/远程CI/四真实宿主模型/100k–1M事件–20客户端长压测未跑。新目录是动态id ASC metadata目录而非主题全文聚合；focus仍400，[C.1任务书](next-task.md)已批准尚未开工，完整M2/T06及其他里程碑后续。

## 九文档最终有限检查

本轮仅9授权文档执行一次有限本地检查：Markdown本地文件链接229/229存在（只核文件存在，不把锚点或远程网址算通过）；逐行尾空白/最终换行核查通过，git diff --check仅9路径exit0。数字通过只读JSON assert核coverage正式311/32、29/29、48命令47成功1失败、2构建、AD38/20/19+1/36；integrity六类计数129/36/5/2492/4/2且全部零变动，以及stable-after-v2的dist208/48一致。当前入口链接B.2.2，M2功能表仅更新目录已通过/focus仍400，C.1空白与两端同space澄清及严格局部日期校验经验已同步。

检查结果仅针对验证窗口后的状态文档，不重新宣称产品测试/build或独验结果；没有运行产品测试或build，独验自己22链接检查是其报告范围，与本次229项分开。检查记录文字追加不新增链接。9文档完成后停写，等待父复核及最后保护hash审计。
