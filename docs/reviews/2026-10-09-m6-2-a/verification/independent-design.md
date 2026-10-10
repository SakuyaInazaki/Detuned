# M6.2-A 独立有限矩阵

正式新文件 SD01–06 与 MD01–02 共8组，当前写完待类型与实际行为。六组用普通 human、真实文件 SQLite/WAL、合法 PostService claim 写入和 ArtifactFileStore stage/publish/discard；trusted actor/thread/space seed 来源明确，不称 HTTP seed 或生产部署认证。SD01 实际 Fastify inject 路由/metadata/content 拒绝与事件/search/export守卫，非浏览器或真实 socket 客户端证明。SD04 独立 Node 两 child 通过 stdin 只在内存接收自有 token，最终 built service 调用；不把同进程同步调用称 race。

- SD01 先 sealed payload/两私有附件，request 当前 count 与 changed_by:null，owner/另一 reviewer/普通 reader 的公开入口拒；公开 poll 无 submitted/私有 artifact/body、ack_seq0；reveal 后仅显式 cited artifact 向普通 reader 开放，unused 永远 private；原 ack replay 精确无 reveal 字段。
- SD02 先已封存的私有 evidence；分别真正 RedactionService、owned readiness missing/failed 故障，末位 reviewer 全轮守卫 privacy410/ready409，无任何新 submission/count/event/key 或 reveal，已有 sealed 仍私有。
- SD03 SQLite trigger 在最后 compact key 写处真实失败，submission/session 绑定/count/events/key 全回滚；原 key 后可一次提交，改 payload 冲突/另 session 不加人数，后来规则变仍历史 ack exact。
- SD04 同 actor 同 key 两进程单份 initial；另文件不同 actor 两进程提交，唯一 reveal、两 submission、版本3/count2，所有 child 有界自然退出/异常清退。
- SD05 observer 可独立评审但不能公开写帖；当前撤权/只读 credential/cross-space/session actor 与时间拒，无副作用。
- SD06 private artifact 最后 key trigger 故障验证物理 stage/object 清退；存储 submission 非法 JSON值和 session binding 不可借维护或在线接口绕过。合法恢复原 metadata 后 ordinary reopen 对照。
- MD01 真正历史 SQL3+原3服务 oracle rows 构成 source3，ordinary modes 拒，实际 offline newstage upgrade4，source hash 保真、assignment ID/count0、create/cancel compact bytes+response deepEqual、read DTO count 单独增加。
- MD02 actual schema4 offline backup/restore 保存 sealed/revealed/unused private blob、6表+sessions/events/compact ref 原行与bytes；旧 creds/secret 隔离，恢复后 cited/unused/sealed 公共权限仍不同。

普通正式回归只读取小历史 JSON/SQL，不依赖旧临时数据库或整个冻结旧 runtime 执行；旧 runtime 仅首次 extraction 的来源证据。old2/old3 原 backup API 的跨版本恢复及 wire1/wire2 严混配将另放有界 verification probe，不能以新4 relabel 或手写响应冒原3服务 oracle。

根放行统一窗口：新源 noEmit→必要根串行 build/type→新作者+独立 targeted，首失败分类交 owner 修；targeted 收口后再 core worker1/文件串行与版本相关 current probes。无 VM/容器/浏览器/安装/模型，不重旧成功门禁。
