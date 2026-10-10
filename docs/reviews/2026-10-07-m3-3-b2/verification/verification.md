# M3.3-B.2 独立验收（2026-10-08，父已接受）

开工目录保留 2026-10-07；实际最终执行日期为 Asia/Shanghai 2026-10-08。最终必要完整回归已执行：436/436、51/51 通过。最终 current29 为组合证据 29/29；父于 2026-10-08 正式接受本包有限本机工程范围。

## 实际执行与首失败

统一 workspace build 一次 exit0，新增三个正式文件首次定向 22/22、3/3 通过（A12、B6、C4），typecheck 一次 exit0、lint 一次 exit0。首次完整 suite 为 435/436、50/51，通过数量不能代替完整成功；没有 unhandled rejection。唯一失败是作者 FIFO regression 在启动整个 pnpm/vitest 子进程的 2 秒 watchdog 下被杀，目标操作尚没有独立 readiness 起点。定向时该项 1242ms 通过；父裁定修夹具计时设计，分别限制启动、ready 后实际调用和退出回收，产品不变。原失败 stdout/stderr 与 commands.json 保留，不能把它泛化为 FIFO 产品错误，也不能抹掉真实失败。修正后 startup 15s、ready→go 到 done 的 operation 仍 2s、reap 15s、case 35s；实际最终 suite ready=true、done=true、killed=false、operation 7.060ms。业务与 source FIFO/target 不存在断言保留。

25 个保留探针全部 exit0，所以首 current29 组合是 28 通过 + 1 fullsuite 失败。父批准 test-only 计时修正后，第二完整 suite 436/436、51/51 exit0，无 unhandled。build/typecheck/lint/25 探针没有重复，最终组合 current29 29/29。未再运行 600 秒负载、模型、外部网络推理、跨宿主、额外 40MiB 实验。完整 suite 两次均包含已有导出 640×64KiB=40MiB case：两次 wire 42,399,852 bytes，receiver 样本 55/42、server 样本 9/10；仅有限样本与机制佐证，不构成硬 RSS 上界证明。没有新增独立大材料实验。

## C 四项独验的实际范围

- 真实源服务与客户端为独立进程，经 shared HTTP client 完整导出、built CLI 在新进程离线导入，再启动恢复服务。核对稳定 ID、中文与 Unicode 历史正文、投影和重新计算的本地 hash、版本 ID 反序的关系历史、墓碑无 FTS 正文、附件 ready→missing 与元信息保留、新事件、provenance 和 integrity/FK。来源 actor 禁用且无凭据、membership、session；来源 token 401。新 human admin 成功创建新普通身份、授权和签发凭据，该普通身份实际 POST 新研究成功。
- 九种输入分别由真实 CLI 处理：重复修订、缺当前修订、孤儿 thread version、跨空间对象、已知引用字段缺目标、关系 terminal action/state 不一致、重复 resolution/version、未来 wire version、末尾截断。业务负例重算完整 SHA 链，仍 INVALID_INPUT，源导出文件字节与目标不存在保持；未来格式和截断属于协议负例。
- 合法被过滤的 resolution 历史可导入且 history_complete=false；source_content_hash 为不可信来源 provenance，不能替代重算 local hash。未知 structured.pinned_refs 保持普通研究数据。合法 ready artifact content_url 指向真实本机 trap，请求计数为零；本地 metadata 不含该 URL 或研究正文。输入末段软链、旧目标、现有源目录均拒绝且原物保留。
- 固定 IPC helper 真实进程在首 staged record 取消，目标未发布；在 import-transaction、destination-created、publication、file-sync、readiness 注入故障，源导出文件不变，已存在的部分目录被 init/serve readiness gate 拒绝。post-unlink 双失败使用真实 chmod 不可写父目录使 marker 重建失败：错误准确说明完整目标可能可启动、durability 未确认；目标 DB integrity/FK 与研究历史完整，调用方没有收到 token，保留输入可另新目录成功导入。这不是半成品正常启动反例，也不是保证所有失败都会留下 gate。

所有 token 只在内存或私有临时目录使用。CLI 成功 stdout 在内存解析，断言仅非敏感字段或布尔，未归档原 token 输出。helper 只有 server/client/import-worker 固定模式与有限操作/stage，没有任意 shell 或函数执行面。失败和取消均由 finally 回收进程和目录。

## 独立代码审查与作者证据

独立核对 same-FD O_NOFOLLOW/O_NONBLOCK 后 fstat、唯一 decoder 的完整 EOF/链校验、逐 record staging、bounded metadata、rowid keyset validation、首 FK 违规 get、完整校验后事务提交和无覆盖 publication。没有全空间对象数组或跨 await 的源主写事务；本轮小 fixture 读入数组仅用于测试重算坏流，不构成产品存储策略。同步 SQLite 单步不能由 JS deadline 硬抢占。

作者初版 iterator 期间写 FTS 引发 SQLITE busy 的 3/6 失败是开发期真实产品缺陷，已改 rowid keyset，后续 12 source formal 通过。B 互审发现 FIFO O_RDONLY 在无 writer 下挂起不可取消、全 FK violation array 不符合 bounded，两项均实际修复；FIFO 旧版本受控 child 1507ms 被杀、修复后作者定向约 979ms 完成。B 开发 noEmit 的临时 config 找不到 node types 属环境编译问题；修后 sourcealias 检查通过。以上原证据保留，不混为产品执行成功。

## 完整性与限制

基线实际 HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44，source/config/tests 181、docs40、mutable5、全部旧 review3763、SQL/archive4、schema2、dist tracked208/untracked92。首次门禁期间 capture 的 source187 是授权新增6、修改5；docs41 是新 example 与四契约文档；旧3763/SQL4/schema2/mutable5/HEAD 全部原字节。dist 为唯一 build 的预期改动，tracked208、untracked100。详见 integrity-first.json；after-gates-capture.json 名称沿记录保留，其实际采集在首次 suite 运行期间，不误称成功后快照。

cleanup-first.json 核实 C helper 残留进程0、C/FIFO 私有目录0。本包101份归档文本有限 minted token 形状扫描0命中；此检查不证明任意研究文本自动脱敏，不扫描所有 DB 敏感数据。schema2、不迁移旧版本、仅 source v1、manifest 不恢复附件 bytes；没有网络抓取、签名可信来源、正式评审资格继承、原消费/session/权限恢复等承诺。

最终 capture 与 integrity.json 核实首次 capture 后仅作者获准 FIFO test 时间设计发生变化；其余 product/docs/dist 全部一致。旧3763证据、SQL4、schema2、mutable5、HEAD 原字节。cleanup.json 最终核实独验/FIFO 残留进程0、私有目录0；本包111文本有限 minted token 形状扫描0命中。
