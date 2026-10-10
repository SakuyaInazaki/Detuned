# M3.3-B.2 新实例逻辑导入事实（只读）

范围依据 docs07 §7、docs08 M3.3 与 B.1 frozen-contract；本页不决定下一包架构，不实现。

- 输入是 v1 白名单逻辑材料：稳定对象 ID、不可变历史、关系/解决记录和墓碑；actor 仅来源 ID 引用，无账号属性。无 sessions、credentials、memberships、events、pending、消费/幂等材料，formal_review_status/formal_check_status 均 not_enabled。因此不能恢复源权限、身份验证资格、可靠消费位置或正式批准。
- schema2 的 actors 必填 kind/display_name/created_at，诸多研究记录有 actor FK；导入需要为来源 ID 建立禁用占位身份或映射语义，由父冻结。来源身份不能获得凭据/成员权限；本地新 human admin 与 source ID 冲突如何拒绝或映射须定。当前 schema 没有专用 import provenance/import status 字段；instance_metadata 是现有 key/value 存储，并不等于已存在可信导入协议。是否窄用 metadata、外部清单或另包迁移须裁定。
- projected 修订已过滤已知跨空间/缺失/私有引用，不带 source_content_hash；未投影的 source_content_hash 是源值。墓碑缺 author/title/body/hash 等当前 SQL 必填字段，须冻结占位与本地 hash/搜索不可恢复原文的处理。未知 structured 内容保持研究数据，不执行，也不承诺所有旧 stored refs 或物理数据 roundtrip。
- 附件只有 manifest，ready 没有 bytes；content_url 是授权下载位置，不是可信自动抓取指令。首包须父选：显式本地 bytes 包并校验 sha256/size/安全路径，或把缺 bytes 的 ready 明确落 missing；redacted/missing 保墓碑，不制造 ready。不得任意抓网。
- protocol/export.ts 公开行 schema/validator 与固定 hash 向量；完整 UTF-8/LF、seq/count/bytes/hash/end+EOF decoder 当前在 client/export-stream.ts，并绑 fetch/sink/abort。不存在独立可直接用于本地文件的完整 decoder；若抽取共用纯流校验，需 B 划定文件与向后兼容。
- directory-state.ts 的 maintenanceTarget/assertDataDirReady 可复用 canonical parent+sidecar gate；DirectoryLock 合作边界现有。offline-backup.ts 的 reserve/publish/private staging 是未导出的内部实现，restoreBackup 只接受物理备份，不可当逻辑 importer。其 no-overwrite mkdir、fsync/readiness及 post-unlink 双故障诊断可参考，是否窄提取由父冻结；不得 access+rename 假原子。

下一轮必须冻结：仅新不存在目录还是可证明空实例、v1/current-schema2兼容及未知版本拒绝；来源 ID/FK/墓碑/hash/provenance表示；有界 decoder 与本地 bytes输入/限额；staging事务与完成前独占发布、一次 admin 输出及失败门禁；fixture覆盖被投影旧引用/禁用身份/重复或缺记录/末行损坏/附件/每个发布故障。导入非物理恢复，完整迁移和 M3.4 另包。
