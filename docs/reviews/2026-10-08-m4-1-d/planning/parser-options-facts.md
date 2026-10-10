# M4.1-E parser/options 辅助事实（未选路线）

只读当前声明与安装 Commander13.1.0；无CLI执行/测试/真实env或凭据读取。D产品冻结不动。

## 当前声明与原生语义

- CLI index.ts根仅长flag --url <url>、--token <token>、--json，自动 -h/--help、-V/--version。当前用户自声明无短alias、无可选值[name]、无variadic值/positional、无.enablePositionalOptions/passThroughOptions；重复thread/event-type只是单值option解析回调累积数组。
- 子命令含固定必填positional（space-id/thread-id/actor-id等）与长值option，还有boolean --offline/--page、negated --no-request-logs；多数option重复名(input/limit/space等)跨group含义一致。没有command alias/外部executable子命令。新增token-file预计required单值但尚未声明。
- lib/option.js:13–17 required=flags含<、optional=含[、variadic按...识别；mandatory是.requiredOption必须出现，不能与required值混为一谈。scanner可从已声明Command.options/commands导出arity，避免手工维护全部flag表漂移。
- lib/command.js:1745 --停止option解析；1759 required option无条件吃下一argv，即下一项是--json/-1/--也会当值（只undefined缺值报错）。1766 optional只吃不以-开头的下一项；当前没有这种声明。
- 1782短bundling依次拆boolean，required短flag把同token余部整体当值；当前仅自动help/version短flag，无短值option。以后新增短option需扩scanner不能假定永远只有-h/-V。
- 1801 known long=value只在required/optional flag接受值，整token值不再扫描，所以--token=--json不应视JSON；--json=value不是合法boolean旗标。负数对required值是正常消费后再由业务parser校验；不能用.startsWith('-')判断value是否存在。
- 1814遇未知option只把后续归unknown，但root仍继续识别自身knownoption。**因此root.parseOptions不是跨子命令值安全探测器**：子命令--input在root未知，后面的--json可能被root先识别，而leaf本应拿它作required值。全树值保守scanner的JSON判断可刻意比root识别更安全，不能称完全复刻Commander。
- _copyInheritedSettings():94–98复制output配置与exitOverride；父globaloption再由root/subcommand解析链处理，并非每个child.options都含父flag。optsWithGlobals是解析后值，不解决parser错误发生前的raw输出或值被误识别问题。

## 两种受限候选

- 原生：全程序声明后configureOutput安全化+exitOverride，parseAsync捕获；合法parse可用program.opts().json或getOptionValueSource。但parse失败前可能尚未设json，且root提前消费子option值；单纯argv.includes/parseOptions二次探测不可满足所有值保护。parseOptions有side effect/发option事件/可报错/helpversion退出，不应对生产Command再预parse。
- 有限扫描：从实际完整树收集required-value长option表（若同名arity冲突须明确拒/按command路径解决）；argv去node/script后单遍，遇--结束；known required option吃下一项无条件，known --flag=value消费整体；只在非值位置遇exact --json才标记，未知option不擅猜其arity，余下普通positional不当JSON。例 --token --json、--input --json、--token=--json 与 -- --json均不标；--json --token X标。
- 当前无可选/variadic/短值使此有限scanner可审；可提前断言声明不超支持grammar以防未来新增。未知option后exact --json是否仍标、unknown可能占值是否保守拒识别、nestedgroup外option是否认可由父冻；不是通用shell/Commander parser重实现。
- Help/version仅真实非值位置可视显式帮助；保Commander成功stdout/exit0代码 commander.helpDisplayed/commander.version，不能因argv里值是--help/-V提前成功。help子命令与root/group帮助优先原生实现；--json+help/version输出是否仍文本由父明确（方向保成功文本）。
- parse():1071丢弃_parseCommand返回Promise；parseAsync():1100 await该链。当前async actions各try/catch处理主体，少数同步parser错误在action外；改parseAsync+顶层catch可观察漏出的async rejection，不应将旧handleError的process.exit包装成重复输出。并不证明现每个action必有unhandled。

## token校验兼容界线

- 仓库生成：bootstrap.ts:626 detuned_adm_+randomBytes24hex，admin-service.ts:41 detuned_tok_+24hex，offline-backup.ts:266恢复同adm前缀；都是ASCII无空白。logical import/upgrade复用recovery发行。生成形状不是AuthService接受token的公共白名单（authenticateToken对输入trim后hash），不能据此强制仅两前缀/长度。
- examples/cli-reading.md:3约定token文件应私有、沿fallback；examples/cli-writing-events.md:3复用--token/env/envfile。docs06:18明确禁止同时两个token来源静默选择、要求冲突报错；当前getClient优先属于实现与规范不一致。未见显式空token、文件具体uid/mode/size/UTF8或拒symlink的公开细则；新强检查不能称完全无兼容成本。
- 当前getClient显式token??env；falsey才envfile，envfile.trim/读错忽略。新显式--token-file严格失败不fallback、私有sameFD有界读取、空白/权限等是父需明示的新增边界；env兼容是否保旧、二者同时显式如何处理仍待冻。

推荐供父：优先有限声明驱动扫描仅服务安全JSON模式判定，真正语法/帮助仍Commander；用parseAsync顶层观察与安全outputError避免先raw输出。未知flag与未来grammar边界必须先定；本记录不实施。

补核：docs04:247禁止错误输出token/私有评审/DB绝对路径/栈；未找到token来源覆盖优先规范。integrations dsh/pi/codex-claude只是单一TOKEN_FILE接入示例，没有双来源覆盖承诺。examples/cli-reading.md:3说明当前文件读取失败fallback，是已接受现状说明而非授权双来源静默选择；writing/admin/artifacts指南列可用来源，没有相反冲突规则。父候选四来源冲突拒、显式空无效、0来源匿名、help/version不读文件；文件不新增mode/owner强拒、建议0600，64KiB/严格UTF8/regular/nofollow/nonblock仍待最终冻结。
