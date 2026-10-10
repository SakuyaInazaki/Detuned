# M3.2 B 对 A 的只读交叉审查

2026-10-06。审查 A implementation/store/freeze-manifest.json 指向的当前源码；没有修改产品/tests，没有运行新实验，不计作测试重跑或独立验收。

结论：在父冻结的受信本机目录与既有传输边界内，未发现可确定触发的阻断偏差。

- client.ts:515–552：准备期固定 token；开始、/me后、store返回后检查用户Abort与凭据变化。/me受原signal/timeout；store Promise.race结束后pending仍被race观察，取消不删记录、不发业务请求。最后check到request同步构headers之间没有await，当前凭据不会在该区间无提示更换。store返回前不进入业务request。
- client十个write wrapper对照core现operation：space.create/patch、thread.create/patch、post.create/revision/withdraw、relation.create/resolve/reopen。post.revision与core一致，post.create目标为thread，resolve/reopen目标为relation。subscribe保留原consumer_key语义；没有把第11个requestKey参数错误纳入业务store。
- request-key.ts：服务域使用URL origin与规范pathname尾斜线；userinfo/query/fragment明确拒绝，logical ID保留原文。scope与logical ID共同形成无正文tuple，不把session/token摘要当actor；客户端不自行做hash/权限/幂等结果状态机。
- file-request-key-store.ts:35–44：O_NOFOLLOW、真实普通文件、0600、当前uid及16KiB限制；版本/精确record键、scope与logical ID tuple、rk格式均验证。损坏可见STORE_ERROR，不退回随机新key或覆盖。
- file-request-key-store.ts:50–66：临时O_EXCL写入与文件fsync先完成，再link发布final；EEXIST读取同tuple winner，目录fsync完成才返回key。失败finally只unlink该进程temporary，未unlink已发布final；后续同scope可恢复已落盘key。私有0700目录当前uid、lstat/realpath/O_NOFOLLOW检查以及create时parent fsync存在。
- index.ts只导出client/request-key；Node文件实现经独立node.ts与package ./node出口，不在基础client入口导入FS/crypto。

明确限制：源码承认目录须防同一OS用户主动替换；路径检查不是对敌对同用户的inode固定防护。本审查不把可信目录前提误报为任意目录竞态防护。取消后已开始store写入可继续完成，仍不发送业务写入；这是保留恢复依据，不是业务取消失败。真实跨进程/丢响应/CLI五项与fullsuite结果由C统一验证另行记录。
