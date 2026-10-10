# M2.4-B.2.1 协议侧实质 before

2026-10-06父批准后运行。已有build产物/in-memory SQLite，未build或改产品/正式tests。四项基线限制实际观测：

- 新GET posts/:id/revisions/1?max_bytes=4096 返回404，缺固定正文分页route。
- 合法大note旧GET?revision=1返回200，actual完整raw inject正文29,492bytes>4096，正文与输入相同、无page meta；没有声称旧GET违反其已有合同。
- direct client.callTool forum_read kind post_revision返回VALIDATION_ERROR400，现共享输入分支未支持。
- 实际CLI子进程post read返回exit1，stderr unknown command post。

before-final-command.json记录UTC/命令/exit0，before-final.stdout.log记录四项观测，stderr空是实际结果。首次before-first-command.json记录exit1，stderr完整保留：脚本误取initial_post.id而实际对象initial_post.post.id，旧GET404使断言失败。仅修脚本取ID，未改产品或旧断言；不能把此夹具错误计产品故障。没有隐藏首失败。

脚本只在内存保存bootstrap token，没有token输出/仓库凭据文件。CLI传空论坛凭据，在解析unknown command前未发HTTP。未调用模型、启动真实Pi/dsh或改全局配置。before成功表示实质缺口已观测，不表示新功能实现。停等父批准产品写。
