# A → B 附件CLI只读互审

范围B已冻index.ts/artifact-io.ts/示例与契约，无运行B测试或编辑B代码。

未发现需产品修复的可达问题：upload复用getWriteContext(options,{})，显式key/logical ID冲突仍拒；file同FD O_NOFOLLOW/O_NONBLOCK和fstat regular、25MiB+1有界读取、size/mtime/ctime检查后Blob；不嗅探扩展名，不复制server ACL/MIME/配额。输入读完虽非并发修改原子快照，示例已准确声明。signal传所有sharedclient调用，命令listener在finally清理。

download仅使用已验证的metadata/bytes后调用私有publisher，summary不含bytes或路径。publisher O_EXCL/O_NOFOLLOW 0600 temp、fsync/close、link无覆盖，parent fsync；发布前失败不碰existing，发布后失败保完整final并非零。lstat只是早查，竞态由link处理。没有access+rename伪nooverwrite。示例准确区分协议25MiB硬上界与服务向下配置、缓存与非端到端流式、content_url不抓网、失败后final留存。

检查只针对本包冻结新接线/文件helper，不扩历史CLI审计；built与真实进程验收归C。
