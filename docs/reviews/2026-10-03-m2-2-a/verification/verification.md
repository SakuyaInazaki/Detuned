# M2.2-A 最终独立验证

真实 HEAD：b8dacd56779a007a2e7045b682bca0c036fdfc44。Node v26.3.0 / pnpm 11.7.0。本报告依据源码明确冻结后的 stable-before.json、实际执行日志与 stable-after.json。验证者未修改产品。

正式测试 **227/227、20 个文件**；当前版本化命令清单 **29/29 exit 0、无超时**。先 build，随后 typecheck、lint、全正式测试及其余回归。新增 typed core 12 项、协议契约 5 项；原 B core 82 项及 M2.1 core 9 / FS 6 / HTTP 8 / CLI 4 项保持通过。逐文件数量见 integrity.json。AC 6/6、版本化 AD 5/5、AE 5/5、U 8/8。

当前清单以已验收的 M2.1 check-c-completion-v2 补偿原 R21 AD02 的 JSON-only 假设。原命令与真实 28/29 失败证据仍保留；此处 29/29 只指 current-commands.json，绝不声称原历史命令已经全绿。全部 stdout/stderr、UTC 起止时间、真实 exit 均写入新目录。其余历史夹具未发现本包语义冲突。

独立新写 HTTP 探针通过四类型 × 三入口的 12 个正反例组合；另外覆盖 provided 空证据、unverified 空白原因拒绝与合法原因接受，假帖子/错误修订、固定旧版不漂移、撤回后旧版可读、跨空间 404、脱敏新引用 410。拒绝路径比较业务表、事件、幂等记录完整快照，确认无半状态。正式新增测试补充未知字段、元素/长度/枚举、不可变 kind 和成员/能力门禁。

独立历史 HTTP 探针最终通过三个真实旧成功夹具：initial failure 缺 state、post/revision proposal 的 assumptions:[42]。旧原键 201 且 raw hash/ref/数据库不变；两个 create 入口原 payload 新键 400；revision 原样新键因 stale expected 返回 409，再仅替换当前 expected_revision、坏 structured 不变返回 400；变 payload 同键 409。三项重启后继续重放，脱敏旧结果按当前墓碑投影返回 201，撤销凭据后 401。夹具从调用前后全部 232 个 dist 哈希匹配的旧 M2.1 构建实际产生，未编造 hash 或成功记录；完整测试 token 仅临时私有目录。

历史探针三次准备错误保留：首轮误将当前 post.current_revision 投影当固定创建字段；第二轮 helper 传 undefined header，light-my-request 在 dispatch 前拒绝；第三轮脱敏请求漏必需业务 key，得到既有 400。只修自有夹具。未修改的重建管线读取当前 post 与固定 ref.revision；只允许 current_revision 这个明确动态字段，其他 post 字段及完整固定 revision/content_hash/created_at/body/structured 继续深比较。具体依据和失败快照见 probe-corrections.md。

只读核查确认：协议唯一 strict map/parse 不补默认、不改输入；兼容 wire/read/tool 保留；OpenAPI 的独立组件及 x-policy 如实表达仅新 action。core 三入口在幂等新 action 中校验，revision 使用已存 kind；同事务检查当前权限及固定版本/空间/脱敏，artifact 复用 M2.1 DB 校验，无 FS await；raw 请求继续进入未修改的幂等 hash 管线。历史重建/启动未新增 typed 新写验证。

完整性：执行前后 114 个 source/config/test/material、32 个当前文档无变化。全部 1716 个先前 review/probe/log/evidence 文件（包括 M2.1 完整证据）、4 个 SQL/archive、2 个 schema/profile 哈希与最初及稳定基线均一致。HEAD 不变。正常 build 更新 6 个 tracked core post/thread 产物、4 个 untracked artifact-reference 产物，并新增 4 个 typed validator 产物；无删除。完整 dirty status 已保存，未 commit/push/delete/untrack。

警告：版本化 AD 的 AJV 结构编译出现 date-time format ignored 提示，已保存，不声称日期值格式验证。其他非空 stderr 是包管理器命令回显。有限范围内没有剩余已证实产品故障。

未运行 Node 22、干净安装、远程 CI、四真实宿主或模型。M2.2-B 知识视图/历史分类、M2.3/2.4、M3/M4/M6 不在本包。整体验收由父代理裁决。
