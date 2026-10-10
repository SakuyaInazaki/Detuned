# M3.4-A.1 独立验收（2026-10-08）

状态：父已于2026-10-08接受有限标准buildApp/serve进程内范围。最终 467/467 项、57/57 文件通过；新增 18 项已包含总数。current29 最终组合 29/29，其中旧第11探针原命令未通过，使用父批准的精确高量夹具适配后其8场景通过。

## 实际证据

一次 workspace build、一次 typecheck、一次 lint 均 exit0。三新文件首跑17/18：C将现有隐藏空间scope404误期望403，且并发IPC等待器产生MaxListeners警告。仅C oracle及单dispatcher修正后4/4通过；真实角色/对象403与撤销401仍有独立断言。

首完整suite464/467、55/57。旧B12的25修订seed及D07/D08 seed命中新默认20burst；父授权作者仅对应case显式高限，全部业务断言保持。作者整文件source定向82/82与8/8通过。无产品变更、无重build，必要第二suite467/467、57/57通过。两次原日志均保留。

25保留探针原版实际24通过；第11在U07高量初始化429而未达到审计断言。原旧文件与输出不改。本包adapters精确副本仅主buildApp显式60000/10000及四相对包路径重定位；原hash、小diff、理由见adapters/manifest.json及adaptation.diff。适配8/8通过，不是新正式test，也不把原命令写成成功。

## C 独立范围

四正式case使用固定server/client真实子进程和builtCLI，controlled Clock与IPC屏障：默认60/min、20burst及999/1000ms边界、时钟倒退精确Retry-After6秒、巨大跳时仅回满20；同actor跨token/space共享，不同actor独立；鉴权404/403/401先于429；replay/冲突免收费、admitted revision冲突消耗、schema无效不消耗；SQL核post/revision/event/idempotency唯一副作用，read/poll/ACK免预算，session/subscribe/admin/deactivate按明确mutation收费；CLI坏配置先于mkdir且不回显，真实sharedclient同key429→1秒有效等待→成功仅一次写，超既有RetryAfter预算不重发。

A/B作者首失败分别保留：B不存在GET夹具与误跑old dist为测试准备错误；A wall rollback提示已在产品freeze前精确修正并定向通过。早期C freeze清单形状误读未启动build，保preflight错误。没有将未跑检查计pass。

## 保护、清退与限制

integrity.json：旧4008review证据、SQL/archive4、schema2、mutable5及HEAD原字节不变；source197→204，全部delta属已授权产品/新测试/三个局部旧seed/benchmark；dist208tracked+116untracked来自唯一build。cleanup.json：本轮owned worker与私有fixture目录无残留；仅新包文本已知token模式扫描无命中，不声称研究内容全面脱敏。

继承B1约40MiB正式case随两次suite实际运行两次；实际body41943040、wire42399852 bytes。首receiver45/server3样本，末receiver43/server7样本，非硬RSS证明。未额外大材料、600s、模型或多宿主实验。

此包限流是进程内actor桶，重启重置，不是持久容量quota或跨server聚合。标准buildApp共享meter；手工组装需显式同一limiter。A.2另包规划，未实现。
