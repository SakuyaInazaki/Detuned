# M3.4-A.2 独立验收（2026-10-08）

状态：父已于2026-10-08接受有限主库分配页与全状态登记附件配额范围。最终485/485项、60/60文件通过，新增18项包含总数。current29组合29/29：四门禁加24原保留探针与A.1已批准第11适配；不重跑旧默认seed，不把旧原第11改称成功。

## 真实执行与首失败

workspace build、typecheck、lint、完整suite各一次exit0。首三新file定向17/18：A10及C4全部通过；B RSB04新建resource_fixture表，既有严格current结构预检先拒exit2，未达到quota断言，属于测试材料错误。父授权B仅改既有instance_metadata非保留扩展key有限2MiB字符串，先验证current_initialized与实际pagebytes>1MiB；原507退出1/no SQL回显断言保持。B仅该case定向1pass3skip，后完整suite全部通过；无产品变化、无重build，不重复A/C专项。全部原日志保留。

作者A首9/10为将真实FULL注入挂到未调用createPostRevision，改正确createPost路径后10/10及sourcealias0；Bsource首沙箱EPERM为环境故障，授权本机source3pass/1builtskip。均不得混作本轮运行期产品缺陷或删除首证据。

## C四case真实进程验收

固定server/client IPC，无任意函数、SQL或shell执行面，built CLI真实子进程，tokens仅内存。C四case在首定向及完整suite各实际执行一次：

- 1MiB主库真实max_page_count按page_size生效；最多32次、每帖60000 UTF8字节合法研究正文自然触SQLITE_FULL。失败前后posts/post_revisions/events/idempotency_records/artifacts计数相等，连接读仍可用；标准client完整507(false)仅一次fetch，无自动重试、无副作用。
- 两个真实multipart upload竞争global bytes10或objects1，均一201一507；胜者key replay复用id，仅1登记/事件/幂等结果、1物理对象。服务关闭重开重apply后新上传仍507，原key可replay，真实登记额度不靠运行期累计。
- 明确手工私有fixture登记1025个missing，每条MAX_SAFE_INTEGER，累计超JSsafe与SQLite signed64；运行重开确定QUOTA_EXCEEDED，CLI非零明确quota而非SUM500。startup前后十个研究/身份/权限表各SHA摘要相等，不输出credentials。此断言是logical材料不变，不承诺主文件/WAL/SHM/lock mtime/hash不变；未将协调副作用当产品反例。
- 固定TEMP BEFORE INSERT artifacts触发器在本调用真实文件已publish后，向既有instance_metadata分配zeroblob2MiB，在1MiB页上限触真实FULL。明确测试注入边界，不是自然payload也不新建official业务表。backend publish/discard成功计数各+1，登记/事件/幂等计数及文件库存回到原值，主错507与read可用。CLI四类非法配置exit2先于mkdir、不回显secret-like输入。

A正式另覆盖连接重开/页取整/SQLite实际抬高反证、mutation/event/idem精确真实页分配阶段与所有状态/iterator释放；B覆盖transport安全映射与配置。组合证据不是所有磁盘/临时资源耗尽形式认证。

## 完整性、清退和实际范围

integrity.json：HEAD不变，4139旧review证据、SQL/archive4、schema2、mutable5全部原字节不变；source204→211，7新增/8变更均授权；docs43→44。唯一build后dist208tracked/128untracked，产品freeze之后仅B测试oracle改变。final-freeze-check.json A11/B7hash匹配。cleanup.json owned worker/private fixture目录0；新包文本已知token字面模式0，不宣称所有研究内容脱敏。

继承B1约40MiB正式case随唯一suite实际一次，body41943040、wire42399852；receiver47/server6 heap样本，仅有限佐证非硬RSS保证。无额外大材料、600s、模型、多宿主或公网实验。

主库运行额度默认1GiB，实例登记附件4GiB/10000，服务新连接显式重apply，不持久header、不迁schema、不影响offline维护。只限主DB有效页和登记声明，全状态计费；不约束WAL/SHM/temp/log/backup/staging/orphan/全目录物理硬cap。原空间/upload429与A.1meter、既有client retry规则不改。M3.4-B完整运维仍未完成。
