# 下一任务：M4.1-E CLI 安全错误出口与显式凭据来源

本任务书记录父冻结方案。[M4.1-D](README.md) 已于2026-10-08获父接受有限本机范围，最终569项/79文件与current29通过；首失败和第二门禁证据见[独立报告](verification/verification.md)。E 自动衔接，但必须先由 C 保存 fresh baseline，随后才能开始产品实现。

## 目标与非目标

使 CLI parser/action 错误保持稳定、安全的输出，增加显式 `--token-file <file>`，保留全部合法成功 data/page、一次性凭据成功 stdout 和原退出码映射。HTTP 服务仍负责业务授权。

不改变服务业务、shared client 重试、SQL/schema、MCP/Pi、模型调用、全局配置或文件发布时序；不统一所有 init/serve 长期运维日志，不宣称完成整个 M4。不得读取用户真实凭据/env/config，不安装、推送或发布。

## 文件所有权

| 作者 | 范围 |
| --- | --- |
| A | 新 `packages/cli/src/token-source.ts`、`tests/contracts/m4-token-source.test.ts`、docs04 的 E 契约节、docs12 ADR048。 |
| B | `packages/cli/src/index.ts`、新错误/argv 窄模块、必要 artifact IO/export 安全错误标记、`tests/contracts/m4-cli-errors.test.ts`、`examples/cli-errors-credentials.md`、docs06 token 来源说明及现有读取/写入/管理/附件指南的必要同步。 |
| C | `tests/contracts/m4-cli-boundaries-independent.test.ts`、必要固定 helper、新包 verification/README、统一 build 与验收。 |

旧审查、归档、用户 dirty 与其他作者文件保持原状。共享接口或范围变更由父裁定。

## 凭据解析契约

`resolveCliToken(options:{token?:string;tokenFile?:string}, env:{DETUNED_TOKEN?:string;DETUNED_TOKEN_FILE?:string}):string|undefined`，env 由 CLI 组合根显式注入；getClient 只调用此 resolver。

- 两种 flag 即使显式空值也算提供；env 仅 undefined/空字符串算未设，空白算提供。四来源超过一个，哪怕值相同，也固定 VALIDATION_ERROR、exit2、零 HTTP；零来源允许匿名。
- 所选来源失败不得 fallback。trim 后须非空、无内部空白/control；不限制凭据前缀/长度，不做 Unicode 规范化。
- 文件最多 64KiB 原始 bytes。O_RDONLY|O_NOFOLLOW|O_NONBLOCK 打开，同 FD fstat regular、strict UTF8、有界读取至上限+1、前后 stat 检查、finally close。错误不包含路径、内容或 FS cause。
- 不新增 owner/mode 强制拒绝或 chmod，指南建议0600；不承诺防同 UID 恶意改文件或祖先 symlink。help/version 和真正离线命令无需读取 tokenfile。

## Parser 与诊断模式

Commander 在创建 child 前配置继承：阻止 raw outputError/writeErr 先输出敏感 argv，启用 exitOverride，通过单次 parseAsync 观察 rejection。仅真实成功的 helpDisplayed/version 保文本 stdout 与 exit0（包括 --json）；其他 parser 错误固定安全 VALIDATION_ERROR/exit2。

JSON 保原 `{api_version:'1',error:{code,message,details?}}` 输出 stdout；文本错误写 stderr。诊断模式 scanner 从实际命令树声明收集 required-value flags：已知 required flag 无条件消费下一项（包括值为 `--`），`--flag=value` 整项消费，真正 `--` 停止；仅非值 exact `--json` 启用 JSON。unknown flag 不猜 arity，其后 exact --json 可识别；其他命令同名 known-required 保守按值处理。当前无 optional/variadic/short-value；若加入不支持 grammar 必须显式失败。scanner 只判断安全诊断格式，不重实现 Commander；help 由原生解析触发，不预扫提前退出。

## Action 错误与兼容边界

- 保真实 server public DetunedError 的既有 message/details 与出口，不把任意 duck-typed code/message 当可信。RequestKey/offline 类仅保已核固定安全文案；逐个核可达动态来源。
- ClientTransport/Protocol/Timeout/Abort 按真实类型固定安全文案，保 code 与原 exit；未知 raw 错误用 UNKNOWN_ERROR/固定安全文案，不输出 details、cause 或 stack。
- publish/relate 使用安全 JSON object 输入边界；unknown op 不回显用户值。artifact/export 仅增加必要 typed 安全标记，保 final 已保留、持久性未确认等关键诊断，原发布/清理/重试顺序不变。
- 保原各 exit mapping、成功 data/page；credential/adminToken 的合法成功 stdout 不删、不自动写文件或日志。init/serve 长期诊断不全局重写。

## 验收与执行顺序

1. C fresh baseline 后 A/B 在所有权内实现。A 用私有 fixture 验普通/边界/超限/坏 UTF8/空/控制字符/来源冲突/缺失/软链/FIFO（平台支持时）及 FD 清理。
2. B 验真实 CLI unknown/required/value/`--`/help/version、旧写输入与退出码、敏感 marker 不回显；不以函数名 spy 代替行为验收。
3. C 用真实 CLI+本机 HTTP 独验零/一/冲突来源、selected-file 失败零 HTTP、JSON 解析边界、无重复输出/unhandled，以及合法敏感成功输出保持。既有回归覆盖发布成品保留。
4. A/B 必要 source 定向与 noEmit 后冻结清单/hash；C 唯一统一 build、必要专项、四门禁与 current29。保首次失败、真实 exit、旧证据与归档；仅因必要失败复验，不扩600秒规模或40MiB专项。

验收后衔接 M4.2 stdio 桥，先另做事实核查与契约冻结；其余 M4–M7 未完成范围继续保留。
