# 离线复制旧实例后升级与回退

当前支持已核legacy schema1或完整historical schema2/3/4，复制升级到新schema5目录，保留原源实例供匹配旧runtime回退。普通init/serve现拒legacy1|2|3|4并指引migrate，这是旧auto1→2行为的明确变化；不原地覆盖。

```sh
detuned --json migrate --offline --data-dir /path/to/old-instance --output /path/to/existing-parent/new-instance --admin-name 'Local upgrade administrator'
```

停止原服务后显式 `--offline`；合作锁拒活跃持锁服务，不能阻止绕锁 SQLite writer。目标父目录必须已存在，目标必须不存在（包括空目录/软链），路径边界与附件正规文件校验由本地维护层执行。管理员名称 trim 后 1–128 Unicode 码点；timeout 默认/最大 120000ms，允许正整数，SIGINT/SIGTERM取消。操作仅本地，不读客户端 tokenfile，不调用 HTTP、模型或抓取 URL。

源只读复制到私有 staging，再执行现有迁移到schema5并复核结构/FK/integrity。登记附件按原 artifacts/objects/storage_key 检查 hash/size：最多 10000 项、单项最多 25 MiB；ready 缺 bytes 拒绝，redacted/missing 现存 bytes 校验并保留，不自动脱敏。无登记的文件、日志、密钥文件、锁或 staging 不复制。旧 fa1b35c runtime 只有附件表，没有上传 HTTP API；历史附件演练的直接 SQL/file 来源会单列，不能伪称旧 HTTP 上传。

升级撤销所有旧凭据、更换实例签名 secret、新建独立本地 human 管理员；研究 ID、修订、来源身份及其禁用状态、membership/session、幂等及未确认消费材料保留。成功 stdout 一次 JSON：data_dir、source_data_dir、source_schema_version:1|2|3|4、schema_version:5、upgrade_id、admin_actor_id、admin_token。明文 token 仅此输出，私有接收，不进入日志或清单。原外部签名 secret 不搬运；原目录回退须匹配旧 runtime、原凭据及原外部 secret，不能用逻辑 import 代替。

```sh
detuned serve --data-dir /path/to/existing-parent/new-instance
```

源主 DB、原有 WAL 与登记附件字节保持；lock/SHM，以及原无 WAL 时新增的空 WAL 属 SQLite 协调副作用，不是业务数据写入。原有 WAL 不改/不删，新增非空 WAL 不允许；不为清理源空 WAL 增加 unlink 竞态，也不保证零目录写。副本迁移保留真实旧主题 current version；schema1 没有旧 thread_versions，但完整旧成功操作缓存可以回填可证明历史，例如 create/patch 的 [1,2]，不能称所有旧库必有缺口。缺少可重建 creation 操作缓存时可能只保 current；本轮兼容夹具明确人工删除私有旧 creation cache，研究行仍为真实旧 HTTP 来源，旧 API 必需 key 且没有 TTL，不能称自然过期。再次导出/逻辑导入允许这种未保存的主题版本缺口，但已有版本必须落在 1..current、current 必须存在且 title/state 一致，provenance 明确 history_complete；space/post 修订仍须连续完整，不补造未知历史。普通评审帖子不变成正式批准。

发布先独占 reservation/目录/锁，文件和目录同步后移除 readiness 门禁。取消或失败不覆盖原源/既有目标，半目标保持门禁，不盲删 marker 启用。最终同步与重建门禁双失败可留完整但持久性未确认且管理员 token 未交付的目标；不要启动，保留源并换新目录重做。ready 后输出丢失也应保源另新目录重做。参数/缺 offline 退出2，其余本地升级错误退出1；诊断不包含研究正文/凭据/SQL。SQLite 单 native backup step 或同步查询不可硬抢占，不宣称硬 CPU 时间界限。跨平台介质灾难、完整迁移与 M3.4 后续仍待验收。
