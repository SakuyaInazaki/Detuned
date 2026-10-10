# M6.2-A B 存储与附件独立源码窄审

结论：本次有限只读范围未发现可证明的新增阻断。B仍在正式fixture/current V4 parity收口，本报告绑定当下产品哈希，不替代最终freeze比对或运行验证。没有运行测试、构建或反例实验，没有修改产品。

- **升级/profile与旧ref**：bootstrap.ts:594–605在旧3校验后先加count、生成assignment ID并重建NOT NULL/UNIQUE名单，随后建实际submission表、记录4，最后运行新typed校验；不会在新列前调用它。classify分支按实际marker选择V1/V2/V3/V4完整profile并拒矛盾。offline-upgrade.ts:44–55源readonly、backup至新stage，只有stage bootstrap/reset身份；offline-backup.ts:48–51按manifest源profile严格校验，:247–254仅stage旧2/3升级，源manifest未改。本次没有实跑源hash/回滚/旧3deepEqual oracle。
- **物理/公共交换**：schema.sql:306之后submission的assignment/session唯一约束与实际六formal表匹配；真实物理backup不选性丢formal表。public export仍固定公共族，space-export-service.ts:95/128/131的space可见性过滤不把assignment附件投影出来；export.ts:17–18严格wire1/source2/not_enabled和wire2/source3|4/excluded分支。logical-import.ts:46–65仅插入既有公共族，附件转space/missing，bootstrap目标4后不写formal对象。未声称运行导出或import已通过。
- **异步附件管线**：artifact-service.ts:99发布后，:103–107在同步写事务重新refresh、核scope，fresh action才再核真实eligible成员/组/collecting/未提交；历史replay不套后来的资格/phase。:124–133 finally始终尝试stage清退，失败或replay清理本次新published对象，只有新成功转移keep。由代码可得publish等待期间撤权/提交后fresh不写DB；真实故障/资源清退仍须D。当前fresh上传资格只沿本包明确规则，本审不擅自增加新policy/current-revision上传门禁。
- **own/revealed与隐私**：review-artifact-access.ts:16–34先核space/assignment/request，非owner必须有真实已revealed submission且evidence明确列该artifact；unused附件不给其它人。再读当前snapshot隐私并核artifact owner/space/redaction。内部EvidencePrivacy校验submission intrinsic与snapshot，逐post/attachment精确scope，Ready另仅fresh/reveal调用；它不授予最后reviewer读取他人sealed材料。取消不把revealed_at由null改为非null，红删/当前space ACL由调用方组合。
- **client union隔离**：artifact-transfer.ts:7仍strict isArtifactMetadata供upload；:11新readable parser仅GET用，client.ts:641–647只get/download联合返回。下载固定本origin路径、redirect:error，不用content_url；长度/hash/MIME/完整EOF与25MiB缓存约束不变，reader取消/late response观察保持。没有新增Node或依赖进入browser。

被审文件哈希见同名JSON。范围只涵盖上述B存储/维护/附件/client链及邻接公共投影，未广审所有SQL、历史业务、未来M6.3/4资格或正式搜索，也没有把源码推断当运行通过。最终B manifest若产品哈希变化，仅再读变化的相邻段。
