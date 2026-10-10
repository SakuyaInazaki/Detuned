# M2.2-A 本机工程验收通过

2026-10-03。父 Agent依据 [独立验证](verification/verification.md)接受 M2.2-A；M0/M1当前core+C、B与M2.1继续通过。本结论限定 Node v26.3.0 / pnpm11.7.0 的本机锁定环境，不表示整个M2或完整产品完成。

proposal/claim/failure/summary 在新帖子、主题initial_post、修订三个入口使用唯一共享严格新写规则；仅在幂等新action执行，修订使用数据库不可变kind。字段、元素、长度、枚举及未知键统一检查；failure.evidence_state显式必填无默认，provided至少一条真实可读证据，unverified必须有非空白reason。provided不等于独立验证研究结论。固定post/revision引用检查存在、同space、当前read权限与脱敏；错误路径事务不留下帖子/修订、关系、事件或幂等半状态，artifact复用M2.1规则。

兼容HTTP/tool wire与历史读取保留，OpenAPI独立严格components和x-new-write-policy如实声明只用于新action；不迁改raw hash、历史stored/resultRef，不在transport注入默认。参见 [实现](implementation/README.md)、[覆盖](coverage-audit.md)、[类型化示例](../../../examples/typed-posts.md)。

独立正式 **227/227、20文件**；新增typed core12+protocol5，原B82与M2.1 core9/FS6/HTTP8/CLI4保持。**当前版本化29/29**：AC6/6、ADv2 5/5、AE5/5、U8/8。清单使用已验收M2.1 media-aware ADv2替代R21 JSON-only探针；原命令真实28/29及原失败证据保持，不能称原历史29已经全绿。[当前清单](verification/current-commands.json)、[执行记录](verification/commands-batch.json)。

[独立新写HTTP](verification/observed-check-typed-http-first.json)覆盖四类×三入口12个正反例组合及provided/unverified/ref边界。[历史HTTP最终结果](verification/observed-check-historical-http-final.json)覆盖三个由旧M2.1构建真实成功生成的夹具：initial failure缺state、post/revision proposal assumptions:[42]。原key均201、create新key400；revision stale原expected新key409，仅改为当前expected后坏structured400；同key变payload409。三项重启后重放、脱敏墓碑201、撤credential401也通过，raw hash不变。历史捕获前后232dist哈希保持。

独立探针三次准备错误原始证据保留：[修正说明](verification/probe-corrections.md)。分别是把动态current_revision误当固定创建字段、undefined header被dispatch前拒绝、脱敏请求漏必需key；仅修探针夹具，不作为产品故障，也不隐藏失败。

[完整性](verification/integrity.json)与[稳定前](verification/stable-before.json)/[稳定后](verification/stable-after.json)记录114产品/config/test/material、32当前docs执行期间稳定；1716旧review/probe/log/evidence、4SQL/archive、2schema/profile保持。正常build的dist变化单列，无删除、commit/push。验收后当前状态文档同步不改上述执行基线或历史材料。

Node22、干净安装、远程CI、四真实宿主与模型未测。ADv2的date-time format ignored警告保留，不能声称值格式验证。M2.2整体、知识视图/context历史缺项默认、M2.3/2.4、完整M2、专用CLI/MCP上传、Web与正式评审仍待后续。父Agent按用户持续授权编排，GPT-6.1子Agent开发、独立验证，论坛产品自身不启动参与者Agent。下一包 [M2.2-B](next-task.md)由主代理分派，用户无需手工转发；本交付不自行开启下一包。
