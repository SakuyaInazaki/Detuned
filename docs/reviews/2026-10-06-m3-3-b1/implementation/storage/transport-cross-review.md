# A → B 只读交叉审查

范围：B frozen protocol/export.ts、server/routes/export.ts、server/app.ts 的导出接线、client/export-stream.ts/client.ts、CLI exportToFile、六项新 contract case 与 examples/space-export.md。仅静态阅读；未改 B 产品、未新增实验、未运行 build/fullsuite。

结论：本轮范围内无具体可达阻断 finding。

- server 使用同步 nextLine→Readable.push；pending 通过 setImmediate 让出；流 destroy/请求 aborted/响应 close/preClose 均收 reader，背压保留至多一个候选输出行。首行在发送 headers 前取得，后续失败销毁流，不包装成功 end。
- client 对 exact UTF-8 LF 行做版本 schema、连续 seq、计数、wire bytes 和 raw32 hash 链校验；end 之后 extra、缺尾、非法 UTF-8、CRLF、空行拒绝；只有 end 加 EOF 才返回成功。sink 是 provisional，无重试；取消/超时 race 覆盖 fetch/read/hash/sink，并观察后来 rejection。
- CLI 通过共用 client，不重复 ACL/脱敏规则。0600 临时文件 fsync 后 hard link 无覆盖发布；旧目标包括 symlink 不覆盖；未完整流不发布；父目录 sync 失败明确完整文件保留但命令失败，stdout 只摘要。
- protocol 白名单与父冻结十族、两项 not_enabled、来源身份语义相符；post_revision 的 projected/source_content_hash 互斥规则有额外校验。附件只有清单，示例区分未知研究正文可能含用户粘贴秘密。

证据限制：以上是只读结论，不替代 C 统一构建、真实 HTTP/CLI 与独立安全闭环。A 的同步 SQLite 单 SQL 不可硬抢占限制与 B 提出的 relation_resolution keyset 成本候选属于 reader 侧，已交父裁定，不在本审查中伪称修复或已扩大规模验证。
