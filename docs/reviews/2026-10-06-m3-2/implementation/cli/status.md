# M3.2 B 实施记录

旧 built CLI 的合法新 flags 首次执行见 before.stdout.log / before.stderr.log / before.exit-code，实际退出1，unknown option --request-key-dir。这证明新增能力尚未存在，不是旧命令漏洞；未创建指定 store。

本单元新增五个正式测试（KCLI01–05），使用真实 built CLI 新进程、临时 SQLite/HTTP 与文件系统。父/C统一 build 后运行；当前未将未执行测试登记成功。覆盖七分支、跨进程重放、相同正文独立操作、服务端409、旧 key优先和输入key、成对/大小/冲突拒绝、拒写不发业务请求。

CLI 只创建可选 store、传 write opts；当前actor、scope、实际operation/target由client处理。请求成功/失败后不主动清理记录。新增 examples/request-keys.md。产品/tests之外无修改，不build、不安装、不commit/push。
