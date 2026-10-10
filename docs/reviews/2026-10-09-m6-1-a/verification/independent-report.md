# M6.1-A 独立验收

2026-10-09，D。有限评审快照材料与 canonical JSON 范围可接受，待主代理裁定。A/B 最终七项冻结核匹配，静态差分及真实 SQLite 独验未发现本包可行动阻断。不是完整 M6 评审认证。

## 实际验证

| 检查 | 结果 | 实际时长 |
|---|---|---|
| root pnpm build | exit0 | 9.869s |
| root pnpm typecheck | exit0 | 10.154s |
| root pnpm lint（现脚本为 workspace tsc noEmit） | exit0 | 6.501s |
| root pnpm test 首次 | exit1，716通过/1失败，108 files | 89.361s |
| 唯一旧 backup 超时用例定向 | exit0，1通过/10未选，原5000ms预算 | runner3.652s / case1936ms |
| D 独立 source 首次 | exit0，6/6 | runner1.906s |
| D 新源 standalone noEmit | exit0 | 1.843s |

核心结果为 **717 unique / 108 files 组合**：首次716通过，加旧 backup 单用例定向通过；不能称完整 suite 首次全绿。首次唯一失败是 `tests/integration/m3-backup-recovery.test.ts:71` 的5000ms超时（5119ms），无断言差异。主代理批准仅原case复验一次，原源码、预算、断言完全不改。其余成功项不重跑。新 M6 三文件 **18 case（B7/A5/D6）在最终完整 core 首次全通过**。

完整 stdout/stderr、exit 和字节hash见 [gate-output-audit.json](gate-output-audit.json)，各原日志在 [gates/](gates/)。pnpmfiles 依赖状态提示和 Web667.69kB/500kB bundle warning保留，没有安装或为消警告改源码。D launcher首次目录缺失发生在测试执行前，见 runner-first-setup-failure.json；修本包证据目录后首次真实6组通过，不伪称行为首次失败。开发source测试先于最终A freeze，最终core才绑定最终字节。

current25按主代理明确批准复用 [已接受M5.2-A结果](../../2026-10-09-m5-2-a/verification/current25-results.json)，八广告工具及现endpoint未变，新DTO与future op由本包正式测试覆盖。旧25包含获准#11/#27/#28/#29适配；本包 **没有执行current25、没有声明新一次current29全跑通过**。绑定旧结果hash/命令见 [current25-reuse.json](current25-reuse.json)。

## 独立关键证据

- MI01真实文件SQLite普通observer+read凭据，完整manifest字段、SHA256 UTF8串、输入和输出彻底分离；reader total_changes与业务表计数不变；旧Hasher canonicalJson禁止调用。只绑定ready/space附件DB hash与bytes，不冒当场物理blob验真。
- MI02 pinned-only/current_revision变动保持hash；policy实际修订变化拒旧expected并换hash，required配置变化生效、非required配置不进入摘要、缺配置固定400。
- MI03真实第二WAL连接在readSnapshot期间提交新policy和post hash；同次生成保持整套旧读视图，下次看新状态并拒旧expected。既有AuthService和模块共享同一真实storage，无把mock当WAL一致性。
- MI04撤销凭据/成员撤权即时拒，private、missing、redacted附件及损坏历史claim/config给安全typed错误；拒绝无写。
- MI05历史metadata100条DESC分页，不读旧全文；总10000修订/4096contributors精确界允许，10001/4097拒422不截断。历史author/editor/declared union都纳入。数据为owned trusted SQL合成历史，不声称万次HTTP写。
- MI06独立补B未覆盖反例：own `__proto__`/constructor数据不污染prototype、parsed integer ECMAScript实际值、特殊Unicode无正规化及getter不执行。B已覆盖RFC数值/UTF16排序/密集array/descriptor/limits，未以作者自报代替本包运行。

逐段源审与精确before差分见 [independent-source-review.md](independent-source-review.md) 和 [product-existing-exact.diff](product-existing-exact.diff)。canonicalizer不承诺恶意Proxy隔离；未知driver错误不是HTTP renderer证明。

## 保护与资源

[最终integrity](integrity-final.json)：仅获准3现有源码改变、4新增源码/正式测试；A/B finalfreeze匹配。旧8272 review没有变更、删除或新增路径，SQL/archive4、schema2、lock ea84a370…、HEAD b8dacd56…、旧Hasher f81d4ff9…不变。当前61 docs/5状态入口尚未修改。git diffcheck0。

现package dist是实际build输出：8 tracked/1 untracked既有文件改变，1旧Vite资产移除（新hashed资产替换）；不称dist守恒。module-review/dist未列入fresh原package-only dist库存，最终实际hash另记录，不能补造其before。

D tests全部owned temp SQLite，afterEach关闭两连接并await rm；没有D服务/后台子进程。完整core使用仅本轮caffeinate，命令已退出。本包不启动、使用、管理或清退Colima/Docker VM，不触用户profile/凭据/global配置、dsh保留目录，不安装/浏览器/模型调用。先前被拒清退的VM仍按用户最新禁令保留不动，不归为本轮新创建环境。

本包不包含评审资格、持久化请求/封存、checks提交、finalize或HTTP接线。下一步须主代理接受后才做metadata收口；没有提前写finalization或建下轮fresh。
