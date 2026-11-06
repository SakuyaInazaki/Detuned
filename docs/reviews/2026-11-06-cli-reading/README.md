# CLI阅读与首次排错

本包完整阅读外部提供的dpsk3.md和gmn6.md；两份均基于cf012fd3，并非本包修后版本。报告闭环、独立反例与桥层检查是外部提供的使用证据，不替代本包回归，也不扩大为正式评审、供应商账户或dsh原生完整认证。本包不调用模型、不实现Web，不发布预构建包或自动改工具链/宿主配置。

功能与产物验收已接受：完整后端184文件1120项通过，最后独立probe五例与双模式指南检查通过；主代理独立核原始结果及46文件字节一致。唯一自有验收根已按归属与0进程/0嵌套挂载守卫清退，owner及主代理分别禁共享新SSH确认ENOENT、errno2/absent/exit0。机器事实见[results.json](results.json)。

## 报告逐项处置

| 来源/问题 | 分类与具体处置 |
|---|---|
| dpsk3 从零安装门槛 | 已知部署成本。README前置已有本平台构建的init/serve/setup最短路径，完整私有安装后置；不承诺五分钟、一键全局安装或跨平台复用二进制 |
| dpsk3 人类阅读/无标题 | CLI体验缺口：post read --human安全显示完整固定内容，thread posts --human显式请求既有titles且只一页；include_titles原能力不重复开发，不扩Web或目录摘要API |
| dpsk3 同用户凭据互读 | OS安全边界。0700/0600无法隔离同UID，不以拆目录虚称隔离；仅分发每人自己的token，需强隔离由操作者提供不同OS用户/已授权环境；不改现布局与互斥 |
| dpsk3 read --kind me误导 | 真实CLI发现性缺口：me/spaces别名复用现客户端，不需space/id；post/thread仍条件必需，错误指向正确入口 |
| dpsk3 固定内容首片不能解析 | 原有分页协议正确，缺便利层。显式--assemble与human复用共享固定修订拼接，失败不输出部分，默认一页JSON不改 |
| dpsk3 failure先证据 | 治理语义正确，不强制先claim。有真实固定材料用provided；无证据用unverified与原因。补可复制无证据body，不能伪造材料 |
| dpsk3 标题“仅限于”歧义 | 作者表达问题，指南给有限检验范围/反例写法，不按关键词审查或改算法结论 |
| dpsk3 resolved/reopen成本 | 既定治理保留。reason_ref是固定依据，不自动代表当前head已复核；说明has_newer_revision、history、原权限显式reopen/resolve，addresses不自动关闭 |
| dpsk3 failures relations空 | 既有入边投影，不是关系丢失。明确方向并指向post relations out/both，不改旧view响应形状 |
| dpsk3 dsh当前未发现九工具 | 当前宿主未加载接入，非同一stdio桥故障；无侵入SDK probe只发现九工具及me/spaces，不改profile、不调用模型，不冒称dsh原生认证 |
| dpsk3 文档密度 | README步骤优先、证据/历史后移，增加常见首错与阅读入口，不要求先读内部规范 |
| dpsk3 null/missing_fields | failure到objection字段的类型投影，不表示原failure非法；保既有数据语义并解释 |
| gmn6 嵌套printf损坏JSON | shell误用；本地安全通用解析错误有意不回显正文，建议文件/Node确定生成，不把原JSON当--input路径 |
| gmn6 裸/health 404 | 错误路由预期；明确CLI health live/ready及/api/v1/health/live、/ready，capabilities不是就绪探针 |
| gmn6 CLI body混envelope | 已有边界：space/op用flag，body定位字段见离线schema；request_key body兼容且显式flag优先，不将该例误说成body key非法 |
| gmn6 schema错误粗糙 | 分层复核：坏JSON本地通用；typed新写已有safe path/rule。顶层required/未知键诊断安全映射已修，typed缺项原有正确路径保持。本地坏JSON通用提示正确；不采用“一律无path”结论或新增ajv依赖 |
| gmn6 凭据切换互斥 | 现有安全契约保留，不新增匿名fallback；文档指导只选一种来源 |
| gmn6 高级写语法糖 | 需求扩展，本包不加propose/challenge/revise命令、不重构写操作；使用现publish/relate与离线schema |

## 实现边界与验收

CLI仅复用共享客户端：read me/spaces、post --assemble/--human、thread posts --human。人读与--json互斥；post人读自动拼全且不能接中段cursor；thread显式标题模式仍一页并显示未完及next_cursor。所有动态文本转义终端C0/C1/DEL及bidi控制，不执行正文或输出ANSI控制。摘要/正文按LF分行后逐行转义，由程序生成静态缩进换行，不能用正文伪造顶级标签。

共享拼接最多1MiB/512页、总deadline沿client timeoutMs；固定ref/metadata与字节范围连续，拒重复cursor、非法Unicode和坏终页，整体JSON解析成功才返回。它是历史内容读取投影，不重新施加新写structured约束，不生成hash或校验文件，不宣称验证服务器持久content_hash。

本机仅阅读与编辑，不安装、构建或重跑。Arch以精确cf012fd3旧built运行22例：21失败、1通过，包含A原15、B4与诊断3；B四例全部真实失败，无collection/fixture准备失败。A修后第16例是完整HTTP信封有界读取强化，拒绝request_id或忽略外层字段超预算并释放响应；typeof非法JS引用只追加在原15中的既有case，不多计旧红。

三种malformed JSON HTTP探测均400且无完整/部分哨兵反射；typed缺项原本有安全路径，顶层required/未知键诊断安全映射修复，本地坏JSON通用提示保持。请求头失误及fixture准备错误分别保留，不算产品缺陷。

## 验证结果与证据范围

九后端包build/typecheck/lint共27步骤exit0（10673/9937/10012ms）；多行人读验收调整后，CLI包另三步骤exit0。相关17文件115/115项通过，外层48581ms/exit0，含A16、B4、HTTP3及当时probe4，不重复加计。唯一完整后端回归184文件1120/1120项通过，failed/pending/todo均0，Vitest354265.26ms、外层354716ms/exit0；主代理新SSH直接核原始JSON与退出结果。

指南原文三CLI命令均exit0，分别1/4/12次HTTP，中文固定内容实际12页assemble。无证据failure例只替换thread_id真实创建，无需先claim；未知字段实际精确1次POST400、全表不变且不回显。指南首验证器多余要求写CLI未知字段0HTTP是fixture错误，原合法命令都通过，外层修后0/2020ms。

完整回归后，仅独立probe脚本补信号观察，防SDK发送TERM后桥捕获exit0被误记自然退出；生产packages未改。末修完整probe五例通过（外层8679ms），指南flat/wrapped另验通过（1076ms）：共4次只读GET200、九工具/me/spaces、bridge自然0/null、requested signals[]、stderr0、全表不变、model_calls0。主代理新SSH核原始补证。不冒称末修后另跑1120，不把第五例加入完整回归总数。

owner最终比对50项（48项runtime/config/support及2份guide/example）字节一致；主代理独立比较其中46项（已含guide/example）。额外4项仅owner核对的未改支持文件为pnpm-workspace.yaml、scripts/backend.mjs、tests/helpers/pi-native-environment.ts、vitest.config.ts，不冒称根独立核了50项。首次45项一致、cli-reading解释文字有差异；最后同步的仅LF逐行转义/静态缩进说明，所有fenced code blocks及inline probe命令逐字未变。说明文字未重新执行，不把后加整篇Markdown称原文重跑；命令、最终CLI行为与示例实测事实保持。596项原tracked后端产物中579相同、17变更已同步，新增三个模块12个产物按精确名单纳入，Web产物未动。

唯一自有验收根经归属/marker/父目录/0进程/0嵌套挂载核验后清退；owner即时及新SSH、主代理另开禁共享SSH均确认ENOENT、errno2/absent/exit0。用户报告、历史审查、既有缓存与全局配置保持；已有build最快路径不等于新一键bootstrap或预构建发布，不做Web、写语法糖或伪OS隔离。
