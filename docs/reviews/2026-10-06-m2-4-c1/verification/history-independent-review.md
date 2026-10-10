# H-R1 独立材料审查（执行前）

2026-10-06，父授权核心单元独立审查历史工作线。本文与自有check-history-independent.mjs是本单元产物，不改作者生成器/fixtures/formal或产品，不调用作者测试assertions。当前只读文件/真实Git对象/hash/SQLite与node --check；作者7/7是既有自验，本文不冒称已独立HTTP验证。统一构建/父信号后再运行自有probe。

## 已独立核实的来源与归档

- 固定source_commit为b8dacd56779a007a2e7045b682bca0c036fdfc44。以git show逐192个source_file_sha256核对，0不匹配；legacy.db/expected.json/recipe.json三个fixture hash实际全部匹配。只读SQLite integrity_check=ok、credentials count=0、token_secret count=0。
- generate-b8dacd5.mjs:26–42从该Git对象导出四内部package.json/dist；:32内部symlink只能指向隔离旧树，:36–40内部ESM realpath必须在oldRoot且hash等导出旧树。provenance列6个真实解析（core/storage/server→core/protocol）；外部:33仅链接已装外部dependency，版本和诊断realpath记录，不将现外部环境称当年环境。无需当前内部dist/schema充历史。
- :47–51实际HTTP创建space及三case且逐次assert201；第五次真实生成记录三case201及192files/6ESMchecks，非作者手工新schema伪写。三payload为initial failure缺evidence_state、proposal assumptions:[42]、proposal修订同历史值。ThreadService当年initial规则与PostService当年规则可不同，旧代码真实接受是依据，不能反向用当前validator模拟。
- :55–62关闭old server、checkpoint、事务清空credentials/token_secret，业务行精确前后比较后VACUUM INTO新archive，扫描原token/token hash/secret字节；归档SQLite实测无这两身份材料。expected/provenance也显式扫描已知token/secret，不记录明文测试凭据。这里确认代码+档案，不声称再次生成或可证明任意未知秘密扫描。
- 232原capture比较仍111匹配/97不同/24缺失，provenance/README明确这是新真实旧版本来源，不是原丢失M2.1DB/同版环境恢复；三遗失原fixture的原字节replay仍not_run。

## 固定hash/ref与新formal是否有实质断言

只读独立按递归key排序compact JSON计算三payload SHA256，均等stored idempotency request_hash：initial 3d841433…4a12dd2、newpost 8c1a1e7c…3b4b9a349、revision 655c56bd…bf74211。result_ref明确thread initial_post=pst_hr1_0005/rev1与thread_version1，newpost=pst_hr1_0007/rev1，revision相同post/rev2；这些是固定映射，post当前head已为2属于动态metadata。自有probe还将独立用当年title/summary/body/structured拼接算法重新计算raw content_hash。

historical-http-replay.test.ts:43–56从持久archive复制新临时DB，给同historical actor新随机credential及新secret，普通测试不调用Git、旧tmp、网络或generator。:36–42只显式调整current_revision至档案finalheads，revision/title/summary/body/structured/hash/editor/time及Thread固定版本没有宽松删除。:73–85精确record/response与业务snapshot比较，fresh initial/newpost400；revision先因旧expected_revision409，随后调整当前head的新key400明确检验strict typed拒绝；同key改body409 IDEMPOTENCY_CONFLICT。:88–91重启三旧key重放；:94–106墓碑精确全部字段、rawstored content_hash仍原值，重放不得恢复；:110以后撤cred三旧key401先验。7正式项真实日志保留首失败及修正，未把重复运行算新增项。

作者snapshot仅列12个业务表，不是全库所有表/凭据不变保证；这不是对上述精确业务断言的削弱，但独立probe将从sqlite_master枚举全部非sqlite系统表（含FTS/credentials/instance_metadata/consumer等），每阶段按rows canonical排序比较，特意覆盖作者窄列表外的副作用。

## 已报告的持久交付风险

`.gitignore:15`的*.db使`git check-ignore tests/fixtures/history-b8dacd5/legacy.db`实际命中。当前本机文件真实持久且hash已核，但未来普通Git收集可能漏掉ordinary formal必需的archive。已先报父，等待作者按父授权给这个唯一已清理归档精确例外/纳入方案；不自行改.gitignore，不commit或借此全局允许DB。其它本轮指定材料未发现具体真实性/合同偏差。

## 自有执行准备与边界

check-history-independent.mjs已node --check exit0，尚未执行产品。独立样本使用当前最终dist、仅archive/expected/provenance，独立canonical request/hash、raw当年content_hash/ref核验，三旧key201/新key400或409+修正400/同key409，全表不变，重启201、墓碑rawhash不变、撤cred401。临时凭据只内存/自有临时DB，清理仅自有临时目录，产出JSON不含token/hash/secret。HTTP通过实际Fastify inject，不能称真实socket/模型或原失落fixture重放。父最终接受仍须统一构建后该probe通过及C.1全suite结果。


## 包装修复及统一构建后的独立执行结论

父批准作者根.gitignore只加 `!tests/fixtures/history-b8dacd5/legacy.db`，已冻结v2；只读check-ignore -v --no-index命中该精确负例外，归档可随仓库收集，未git add/commit。原七交付内容保持，无需重新生成DB；本次核v2八路径SHA256全部保持，记录在history-independent-command.json。原忽略发现保留并关闭。

收到统一pnpm build exit0通知后，运行自有check-history-independent.mjs首跑exit0，真实stdout/stderr及history-independent-http.json保留。此probe完全独立于作者正式test assertions，从归档复制新临时DB，用新随机token/secret给相同历史actor认证；当前新dist真实app.inject执行：

- 三类旧key均201，完整固定revision内容/hash/editor/time与精确Thread creation元数据匹配，仅post当前head按档案final head显式投影。三canonical请求hash/record/ref逐项核；独立按真实旧代码title+summary+body+canonical structured算法重新计算raw content_hash也匹配。
- 新key initial/newpost均400 VALIDATION_ERROR；revision原expected_revision先409 REVISION_CONFLICT，随后把expected_revision置当前head仍400 VALIDATION_ERROR，明确检查严格写validator而非只测版本冲突。三同key改body均409 IDEMPOTENCY_CONFLICT。
- 关闭当前app/DB后以真正新Node子进程重新开同临时DB、重放三类旧key均201，并在父进程重开再逐项核。子进程认证只经stdin传递不输出、不写归档。重启不是仅复用作者进程或旧tmp。
- 当前HTTP对两个unique Post脱敏后，三旧key均201墓碑，title/summary/body/tags/structured/hash精确墓碑，固定post/revision、编辑者/时间不漂移，SQLite原stored content_hash保持。当前HTTP撤销新凭据后每旧key均401 UNAUTHENTICATED。
- 每上述成功/拒绝/冲突/重启/脱敏后的重放及撤权后的重放都枚举全库非系统表并canonical排序比完整前后行指纹，含作者窄业务列表之外的表，均无附带写入（有意的setup/redaction/revoke分别单独设屏障）。自有临时DB/凭据目录已finally清理；归档/作者8路径hash保持。

独立首跑无失败、未重跑正式suite或生成器、未额外build，不将此样本累计为7之外新增正式test。结果限定当前新真实b8dacd5归档的兼容重放工程范围，实际HTTP是Fastify inject非socket/宿主/模型；仍未恢复原丢失M2.1DB、原三fixture字节重放仍not_run。作者旧源在现external dependencies环境生成，不能称当年完整环境再现。建议父可接受H-R1有限可重复历史兼容覆盖；C.1最终全suite仍由主独验负责。
