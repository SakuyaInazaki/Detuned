# 本地新实例逻辑导入

导入完整校验的detuned-space-export wire1/source2/not_enabled或wire2/source3|4|5/excluded空间研究文件，严格拒混配，不合并现有实例，不迁移身份权限。先使用[空间导出](space-export.md)取得完整私有NDJSON，再执行本地维护命令：

```sh
detuned --json import --input /path/to/private/space.ndjson --data-dir /path/to/existing-parent/new-instance --admin-name 'Local administrator'
```

输入末段不得为软链，打开后的同一文件描述符必须指向正规文件；父路径采用受信canonical边界，允许祖先alias。目标父目录须已存在，目标必须不存在（包括空目录或软链），无覆盖。名称trim后1–128Unicode码点；`--timeout-ms`默认120000、允许1–120000，SIGINT/SIGTERM取消。命令不调用HTTP、读取客户端tokenfile、抓取content_url或正文URL，不调用模型或修改全局配置。

成功stdout一次JSON包含data_dir、space_id、admin_actor_id、admin_token、import_id、record_count。admin_token是敏感一次明文，请私有接收；不会写入日志、manifest或provenance。输出丢失无法保证凭据已接收，可保原文件并另新目录重新导入。参数错误exit2，其余本地导入错误exit1。

成功接收并私有保存管理员凭据后，可启动新实例：

```sh
detuned serve --data-dir /path/to/existing-parent/new-instance
```

校验UTF8/LF、strict行schema、连续seq、SHA链/count/bytes、end+EOF及总量，再校验稳定对象/修订、重复、同空间引用和版本关系；逐行背压落private staging SQLite，不读取全文件到数组。继承导出1MiB编码行（含LF）、512MiB总wire与200万record限额。本地导入额外限制每条 provenance/summary 元数据 JSON 最多 16 KiB；即使 wire 合法，过长来源 ID/header 也可能触发 INVALID_INPUT。这是本地导入限制，不改变导出 wire 上限。单次同步SQLite不能被JS计时器硬抢占，不宣称硬CPU时限。

稳定研究ID及历史保留，来源actor禁用、无凭据和成员/评审资格；新本地human管理员独立生成。所有修订重算本地内容hash，来源hash/projected仅作不可信provenance。墓碑合成空字段，不恢复原文或进入FTS；未知可见研究正文仍可能含秘密，链校验不是来源认证，普通review/decision不变成正式批准。

附件不恢复bytes：源ready转missing，保清单元数据；redacted/missing保墓碑，不伪造可下载ready，不保留content_url。provenance有界记录来源header、转换、projected/hash及合成字段，不保存正文/token/URL。缺失的consumer/pending/幂等/events/正式资格不能从此文件恢复；导入只产生一条新的本地space.revised审计事件。

发布采用独占预留、目录锁、数据持久化和readiness门禁。失败或取消不部分成功、不覆盖原文件/目标；保留半目标门禁，不盲删marker启用。若最后同步与重建门禁均失败，可能留下完整但持久性未确认且未交付管理员token的目标；不要启动，保留原文件并换新目录导入。物理备份恢复、逻辑导入与离线复制迁移不同，分别使用相应维护入口。

新导入目标schema5，七formal表为空，provenance保源实际version/schema/status；导入研究材料不继承正式批准。来源身份禁用、ready附件变missing与新human管理员规则保持，missing登记不是当次物理bytes验真。
