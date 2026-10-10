# 空间 public 研究材料 NDJSON 导出

首包仅支持实际WAL模式的文件数据库；不支持`:memory:`/DELETE模式，GET不会改journal mode。使用当前有空间读取权限的普通凭据或管理员凭据：

```sh
DETUNED_TOKEN_FILE=/path/to/private.token detuned --url http://127.0.0.1:3000 --json export --space SPACE_ID --output ./private-output/space.ndjson
```

`--url`是现有全局参数；私有凭据文件通过现有环境变量`DETUNED_TOKEN_FILE`读取（没有`--token-file`参数）。示例路径为占位路径，请替换为自己的私有凭据文件。

output父目录必须已存在，目标必须不存在，包括空文件/符号链接。文件0600；CLI先写同父目录私有临时文件，完整验证header、序号、末行hash/计数与EOF后fsync，再无覆盖发布；stdout仅输出文件路径与export_id/record_count/bytes/sha256_chain摘要，不输出研究全文。`--timeout-ms`默认120000，允许1–120000，覆盖HTTP headers、正文与写盘背压；取消/失败不发布半成品或覆盖已有文件。

HTTP接口为 `GET /api/v1/spaces/SPACE_ID/export?format=ndjson`，format可省略默认ndjson；空、其它值、重复或未知query拒绝。Content-Type为application/x-ndjson; charset=utf-8、private no-store与nosniff。只有附件manifest，没有附件inline bytes或复杂options；附件下载仍走当前授权API，不抓任意外链。

NDJSON v1是header、连续seq从1的record、complete end，每行LF结尾。header声明来源空间/schema2/snapshot高水位与空间修订，身份仅source actor IDs；formal_review_status与formal_check_status都是not_enabled，普通review/decision帖子不是正式批准。end包含record_count、bytes_before_end与sha256-chain-v1摘要；链从32零bytes开始，每步SHA256(previousRaw32 || exactUTF8LineWithLF)，header/record入链、end不入链。校验checksum不建立来源真实性或导入信任。

共用client用独立 `exportSpace(spaceId,{sink,signal?,timeoutMs?})` 方法，sink逐行收到包含LF的Uint8Array（含header/end），这些仍是provisional；只有Promise返回 `{header,end,bytes}` 才表明完整流+EOF验证通过。不自动重试或拼接partial stream。原JSON请求timeout/retry契约保持。

源研究材料来自独立一致只读snapshot；当前身份/权限与空间脱敏变化仍在每个输出边界检查。服务端已发headers后错误会中断连接，不发送JSON或成功end；客户端拒绝缺尾/extra、非法UTF8、CRLF/空行、seq/hash/count错误。撤权/脱敏导致无完整成果，不能借旧snapshot继续取得新交付。

默认上限：raw候选最多1MiB（数据库候选材料，不含NDJSON行LF），实际编码行最多1MiB（含LF），总wire含end最多512MiB，业务record最多200万，同时最多4个活导出；HTTP不能调高。服务进行120秒截止检查；单次同步SQLite调用不能被JS计时器硬抢占，长快照可能延迟WAL截断。大小/并发/取消错误明确可见；未完成流不能充当完整导出。

导出只投影当前空间public白名单，不含credential、token_secret、session内部密钥/cookie、消费batch/cursor或幂等内部材料，不导出actor个人属性；脱敏材料只墓碑，withdrawn历史保持可读。白名单不能识别用户粘贴在可见研究正文中的任意秘密，导出文件仍应私有保管。

若link已经成功但父目录fsync失败，文件内容完整而发布持久性未确认，CLI报失败并保留final，不能当命令成功或盲删既有成果；应检查目标后另行重试到新文件。逻辑导入、完整迁移、M6/M7与其它M3.4运维仍待后续，无自动ack或宿主/全局配置更改。
