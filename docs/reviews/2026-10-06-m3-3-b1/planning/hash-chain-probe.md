# hash-chain 小型方案实验（非产品验收）

2026-10-06，父明确授权，执行一次，无网络/模型/新依赖/产品或build。脚本hash-chain-probe.mjs，结果hash-chain-probe-results.json。

Node v26.3.0 globalThis.crypto.subtle，固定20000条约1KiB合法NDJSON record另加header；初始32零byte，next=SHA256(prevDigestRaw32 || exactUtf8LineWithLF)，header纳入、end不纳入。实际完成20000 records，20417875 bytes，200.516084ms，未触15秒停止门禁。最终digest `51f0107317c2b6b12161f098a173ff819de056ce34bc26664e0a49b01f0dce1b`。

起末内存完整记录在JSON：rss 49168384→64012288、heapUsed4164664→7202080、arrayBuffers71933→1102565。循环代码只保留prev/current line/joined buffer，不保records数组；内存delta不是有界内存证明，也不代表真实网络/SQLite/背压性能或其它Node/browser认证。本实验仅说明当前安装环境逐line WebCrypto链开销可行，不扩大规模或自动重复。

短查protocol/src无global crypto.subtle或SHA helper；现sha256仅字段schemas/投影，core/server有其Node hasher实现但不能使基础client强制依赖Node。若父选择该协议，可在protocol新增无Node依赖异步链helper或将算法常量在protocol、各端按同字节定义实现；具体归属由父冻结。

严格schema最小建议（非冻结）：

- header：type='header'、format='detuned-space-export'、version=1、source:{space_id,snapshot_event_seq}、hash_algorithm='sha256-chain-v1'。如需created_at/source identity必须由父定，不能用token_secret或其摘要冒充实例来源身份；space_id及eventseq本身只表单源局部定位，不建立后续导入信任。
- record：type='record'、seq正safeinteger、kind枚举、data为A确定白名单schema；additionalProperties:false，seq从1连续。
- end：type='end'、complete=true、record_count非负safeinteger、bytes_before_end非负safeinteger、chain_sha256严格64小写hex；additionalProperties:false。bytes_before_end明确含header/record所有exactUTF8+LF，不含end，避免self-referential计数/hash；header/record序号及schema检验后，end必须匹配累计数值且后续EOF无额外字节才成功。

格式建议所有行LF结尾，client禁止空行/CRLF替换/非法UTF8/截断最后line，wire按实际UTF8字节计算，不重序列化hash，按父限额拒绝过大单line与总流。hash链不是服务端业务hash或权限验证，也不把checksum当来源真实性签名。父最终选完成协议，未写schema/解析实现。
