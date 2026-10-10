# M3.3-A 独立验证记录

2026-10-06，单元C。父已接受M3.3-A有限本机工程范围；最终门禁通过：393/393正式测试、45文件；新增20项已含总数，current29最终组合通过。统一build首次成功，诊断窄补后必要storage增量build成功；typecheck前/后补项两次成功、lint与fullsuite最终各一次成功。所有首失败与授权中间delta保留。范围限当前schema2、物理format1、offline backup和新目录restore；完整M3.3/T12、结构化导出导入、升级迁移与M3.4另包，未调用模型/四宿主完整认证/600秒负载/外部发布或push。

## 基线与before

新baseline.json：HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44、165源码配置测试、38当前docs、5mutable、3491旧review（含整个M3.2）、4SQL/archive、2schema、208tracked+60untracked dist。原baseline/旧证据没有覆盖。Node/pnpm/OS及dirty完整记录。

C最小before实际旧built `backup --help`返回0但展示旧全局命令表（无backup）；旧built真实backup命令返回1 unknown command，未到dataDir操作。它是准确命令缺口事实，不是不存在新API的导入/编译失败反例。B另记录before命令与旧init/serve正例；不把重复before数量累加为正式场景。

## 初轮实际结果与运行期授权delta

统一build-first exit0。三新文件定向原19项：17通过、2夹具失败；A10全过，B BKCLI02 lexical `/var`期待与API canonical `/private`不同，C把全部membership更新为同absent actor先撞UNIQUE未成功构造FK坏库。C仅改单actor行的FK破坏，B父授权仅两路径expected用realpath。修后只B+C再定向9/9通过，A10不重复、产品不改。

B canonical修正于23:09:55首测试运行期发生，A按父授权修docs07/ADR的epoch与不额外收集凭据表述也在首窗口中发生；不声称该窗口source/doc零变化。记录stable-before与stable-before-corrected-new-formal，以及作者freeze/首失败原输出。C原FK失败原样保留。

typecheck-first在父新补项暂停通知前已启动且exit0，适用于前补项snapshot；没有lint/fullsuite/current29。父随后授权A精确修post-unlink最后parent-sync与重建marker均失败的诊断，增加1正式case与docs修正；C暂停等待freeze，后需有原因的第二build/定向与最终门禁，不把首次typecheck伪称最终版本证明。

## 独立C恢复闭环证据（初轮已成功）

真实独立source server/client进程、CLI backup/restore、恢复后新server/client PID不同。活跃source持DirectoryLock时backup拒绝；停服后CLI备份包含一致DB与登记ready附件，排除未登记objects/staging/logs/client-key-store/锁。backup本体init/serve均拒INCOMPLETE_DIRECTORY且其inventory原字节保持；新目录restore保留空间/规则/成员会话/主题版本/帖子修订/关系/附件引用/events/idempotency/consumer/pending账本。ready附件下载bytes精确相同，原source重启后旧普通token仍可用。

恢复库所有旧credentials撤销、新独立human recovery admin、token_secret不同、原disabled actor仍disabled。旧admin/普通token分别401。new recovery admin给**同一个原actor**重发普通新token，GET /me确认原actor成功后，旧checkpoint422、旧ack409 ACK_INVALID、旧fixed-post/space/search cursor拒；正常newpoll恢复原pending batch与同events，获得不同newcursor且ack成功。备份前fixed-post/space/search续页各真实HTTP200、oldcheckpoint可创建另一consumer；pendingack只验证原secret HMAC及未过期，不提前ack。故不是用旧token401、过期或ACL变化代替cursor secret rotation独立验证。

C其它成功case实际覆盖坏manifest额外字段/hash/duplicateID，变造DB与更新manifesthash后的FK坏库、symlink及已有目标覆盖拒；原backup不变。fault六stage为copy/file-sync/recovery-transaction/destination-created/publication/readiness，记录命中stage与MAINTENANCE_FAILED，原source/backup不变，已有partial目标真实CLI init/serve拒且inventory不变。非ready:redacted存在物理bytes完整复制，missing/redacted合法缺失保DB墓碑/presentfalse；ready缺失与已存在错hash拒绝，未自动修状态或字节。

## readiness边界与补项归因

sidecar reservation先O_EXCL、完整fsync/parent同步，再mkdir目标/DirectoryLock，完整staging材料写入并同步后移除sidecar、parent同步完成才ready。init/serve在mkdir前及获锁后DB-open前门禁；backup-manifest长期拒runtime。DirectoryLock为协作式本机协议，不阻止恶意无锁writer或同uid恶意目录替换。成功checkpoint可能正常改变源主DB物理hash，不用不合理原hash不变判成功失败。

B授权双故障小probe证明：最后parent-sync失败且marker重建也被文件系统拒写，可留下**已完整材料**、marker absent、gate允许；DBintegrity/旧credentials撤销/newhuman成立。不是半套数据损坏，也不是after-ready-token-lost被误报产品故障；需要错误/文档准确说明目标可能完整可启动而durability未确认、凭据可能尚未收到，改用原backup另新目录恢复。父限定精确诊断补项，不重设计协议；原证据保留。


## 最终执行窗口、签收与互审

A诊断窄补冻结后，从stable-before-diagnostic-final重建窗口。storage增量build exit0；新增diagnostic单项实际1通过+10跳过；typecheck-diagnostic-final、lint-final、唯一fullsuite-final均exit0，实际393/393、45文件。A11+B5+C4共20新增正式项已包含393；定向、作者执行与probe不另相加。current29剩余25旧probe逐一唯一exit0，build最终组合使用首全workspace build加必要storage增量build；不称只有一次build或一次typecheck。

171 source/config/tests、39 docs、5 mutable在最后补项后执行窗口前后逐hash完全稳定，HEAD不变。3491旧review材料（包含完整M3.2及H-R1/C2/M3.1）、4SQL/archive、2schema、历史tests/fixtures原字节保持。baseline→final仅6新source/tests/helpers、现CLI/storage index与docs07/ADR/新example获准变化；normal tracked dist6文件变化、新storage dist8产物，无其他dist删除或修改。见integrity.json，check-integrity实际exit0。父接受后导航状态收尾另立窗口，不能混入零变化声明。

A→B互审明确canonical路径fixturefinding，B→A互审发现post-unlink双故障诊断并由父限定修复；两份互审及B只读closure保存implementation目录，不当成额外测试重跑。独立C核读source checkpoint/manifest/layout/current-only/inventory校验、staged credential+secret事务、O_EXCL sidecar发布与CLI两位置gate，当前有限范围没有未关闭业务故障。双故障为明确限制：完整target可能可启动但final durability未确认，不使用该target，应保原backup换新目录恢复。

父批准的一次known-secret probe：固定CLI init→backup→restore，一次性stdout只内存解析；两枚实际原/新raw管理员token扫描backup2文件、restored1文件及当时新包63归档文件，0命中。原token_secret仍预期位于私有物理backupDB、restore轮换，新credential值为hash；仅保存计数/布尔。该fixture不含其他任意敏感研究文本，不能泛称物理DB脱敏或所有秘密不存在。

actual cleanup只读核对精确owned helper/backup CLI测试进程与已知私有temp前缀，0进程/0目录残留；没有清理任何全局状态或用户目录。B双fault/A正式case都finally恢复私有parent权限，C工作进程和临时fixture finally关闭/删除。原before/newformal首失败、作者定向与双fault最小反例均保留。

没有再运行600秒规模实验、模型、四宿主完整认证、结构化导出导入/legacy升级或M3.4检查；未commit/push/reset/clean/安装/变更全局Agent配置。介质耐久性/跨平台与恶意同uid无锁writer防护没有认证；备份时点以后数据不由本包恢复。下一包按父选择单独推进，不据此称完整M3.3/T12/M3完成。
