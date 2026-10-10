# M4.1-E 冻结契约

父已冻结 D/next-task.md；C fresh READY 后实施，不增依赖、SQL/schema、服务规则、shared client重试或宿主能力。

## A token 接口

resolveCliToken(options:{token?:string;tokenFile?:string},env:{DETUNED_TOKEN?:string;DETUNED_TOKEN_FILE?:string}):string|undefined。env仅由CLI组合根显式提供；resolver不读ambient env/config。四来源超一个即冲突（同值也拒）；flags undefined才未提供，empty仍选中无效；env undefined/空string未设，whitespace选中后校验。0匿名；selected失败不fallback。

token trim外层后非空，内部JS空白/Unicode Cc拒绝；不限定prefix/长度/ASCII，不Unicode normalize。文件64KiB原bytes；same FD O_RDONLY|O_NOFOLLOW|O_NONBLOCK、fstat regular、有界limit+1读取、strictUTF8、前后size/mtime/ctime、finallyclose。固定safe DetunedError VALIDATION_ERROR400，不回显path/bytes/cause；不新增uid/mode强拒、不chmod，建议0600。不承诺同UID恶意修改/祖先symlink防护。

## B parser/action边界

Commander创建child前output/exitOverride配置，parseAsync一次观察。声明驱动有限scanner仅决定诊断JSON模式：knownrequired无条件consume下一argv，knownflag=value整体，真正--停；非值exact--json才标；unknown不猜arity。支持grammar边界显式拒不暗猜。help/version由原生解析，成功文本stdout/0包括--json，不读取tokenfile；离线命令同样无需凭据。

action JSON沿旧{api_version:'1',error:{code,message,details?}}，保exit与成功data/page/合法一次token输出。真实public DetunedError保现server字段，ClientTransport/Protocol/Timeout/Abort与未知raw固定safe文字；不把duckcode/message当可信。publish/relate安全object输入，未知op不回显；artifact/export必要安全标记保成品与发布诊断顺序。init/serve长期运维输出不整体重写。

## 所有权与检查

A token-source.ts、m4-token-source.test.ts、docs04 E节、ADR048、author/token与本契约。B index/errorargv/必要artifactexport安全标记、CLI正式/指南/docs06。C真实独验、唯一build/fullsuite/current29。A仅私有FS7组 source定向与含新test noEmit，真实首失败保留；不读取用户凭据/env，不安装/global修改。父完整taskbook为范围单源，本摘要不增加路线。

锁取得失败的既有最终 EEXIST 路径使用 DirectoryLockUnavailableError 固定安全诊断：数据目录被锁定或无法安全取得目录锁，请确认其他实例状态后重试。CLI 仅对此真实类型保有用文字，沿 UNKNOWN_ERROR/exit1，不输出路径/PID；不把所有失败推断成活进程占锁，不改变取得、回收、释放或清理时序。
