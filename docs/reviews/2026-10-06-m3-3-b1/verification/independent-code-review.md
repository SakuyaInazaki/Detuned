# 独立代码检查范围（最终门禁前）

C 检查新 snapshot/service、server Readable、client export parser、CLI publisher，并以真实进程结果相互补充；此文件不是未运行的测试通过声明。

- SQLite export reader 使用独立 file-backed readonly/query_only WAL 连接，BEGIN 后读取 space/highwater 建立 T0。每族以 keyset + LIMIT 1 先测 raw byte 长度再载入一条；不构造空间全部内容数组。主连接仅用于同步短 auth/epoch/redaction range guard，跨异步等待的 export snapshot 属于专用 reader。relation_resolution 原无 composite index 的排序成本候选由父授权改为现有 id PK 顺序，等待 A 新 freeze/定向证据，不新 schema。
- 服务端逐候选字段白名单，post/artifact tombstone 最小字段；原 actor IDs 仅来源归属。四个已知 structured 引用字段以及 SpaceRevision.pinned_refs 过滤，未知研究字段不递归识别。redaction 检查按十进制 string 高水位和 BigInt 边界推进，不修改旧 event API。
- Readable highWaterMark=1、每次 push 一个 line；pending 通过 setImmediate 让出，destroy 关闭 session。paused/deadline、onError、connection close 与服务关闭路径释放 reader。HTTP/socket 自身缓冲和一条大 line 仍会使用内存，HWM 不等于端到端硬 RSS 上限。
- client 只保存一个待拼接 line、一个 transport chunk、header/end 和32byte chain；sink 可不收集材料。每行 exact UTF8+LF schema/seq/hash 检查，end 后必须 EOF；sink 已收到的全部 bytes 在 promise resolve 前均 provisional。Abort/timeout 与 hanging sink 的等待竞争，原 promise 被观察；export 无自动 retry，base client 新逻辑无 Node builtins。
- CLI 使用同目录私有临时文件与完整 FileHandle.writeFile，再完整 client 验证、fsync、nooverwrite hardlink 和 parent fsync。错误只清自身 temp；已 link 的完整 final 不能因最后 parent sync 失败被称作未发表，报告 durability 未确认并保留完整文件。内容不送 stdout。

实际首轮大材料为640×64KiB stored fixture，wire42,399,852 bytes；receiver25个20ms样本、server仅1个样本。server采样不足，不能据这些值证明 memory ceiling。它与真实 complete/取消/资源释放结果、逐 row/line 机制一起支持有限流式工程判断。最终fullsuite会按同一formal再执行一次，需分别记两次实际数据，不临时skip或缩小。

限制：长 readonly snapshot 可妨碍 WAL 截断；同步 SQLite VM 不受 JS timer 硬中断。链证明流完整性而非身份/来源认证。未知正文可能人为包含秘密，不宣称导出全部研究文本脱敏。未运行600s负载、模型宿主、介质灾难或 import。
