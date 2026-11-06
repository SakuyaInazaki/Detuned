# 证据读取与协作接续

本包针对外部提供的cld3.md及独立源码审查。报告实际测试a9a02c65，当前基线633c0e55已包含MCP关系/身份空间发现与setup等修复；不把报告实验称为新版本认证。本包不调用模型，不改变供应商配置或治理权限。

## 报告逐项处置

| 报告项 | 当前判定与处置 |
|---|---|
| #1固定修订证据不可达 | 实际接入缺口：既有HTTP/client附件目录未进入CLI/MCP，MCP附件仅metadata。新增post artifacts与forum_read post_revision_artifacts；artifact read/artifact_content对至多1MiB完整附件验证后有界分片，严格UTF8或显式base64；不是任意附件执行或结论认证 |
| #2关系详情 | 633c0e55已提供relation/post_relations与薄CLI，不重复修；本包补relation_history以读resolve/reopen的固定理由和当前可见状态，不把关闭理由藏在消失的阻塞列表 |
| #3身份空间 | 633c0e55已提供无space_id的me/spaces并保全局0写；沿已验入口，不解析opaque checkpoint找身份 |
| #4字段误解 | failure挑战issue/impact null/missing_fields是类型投影，不改成非法；非challenge resolved非“研究结论已解决”；provided仅可读固定证据，unverified非否定推理；anyOf历史wire兼容不放宽新action严格structured，指南和工具自说明同步 |
| #5持久订阅清退 | 真实MCP操作缺口：forum_subscribe增加显式deactivate分支复用既有DELETE；旧创建无op保持。不自动ACK/重建，lookup仍只读 |
| #6关闭理由 | 既有resolve必需固定reason_ref，可直接引用已有同空间修订；仅新增核查说明才另发note/review，不强制每次发新理由帖。本包使历史依据可读，不加自由text绕过固定引用 |
| #7工具schema体积 | 完整静态严格schema与自发现的上下文取舍，九工具保留；本包测新精确口径，不把报告42.7KB或旧实测跨口径称优化下降 |
| #8获取仓库 | 仓库完整依赖/cache/dist是用户授权保留，不能删除/停止跟踪/改历史。唯一源码获取指南给新独立partial+sparse checkout配方，保所有src/test/config/lock/fixtures/history/scripts/Dockerfile；原工作区索引/配置不改，服务端filter支持与实际范围由Arch验证 |
| #9CLI帮助 | 633c0e55已修migrate schema6/required/view枚举；request_key body兼容且显式flag优先已有准确说明，本包不重复改语义 |
| #10准备第三身份 | 633c0e55 setup支持1–32个repeatable participant，私有凭据与部分失败收据已验；不重写旧报告为已测新setup |

报告中的旧修订不可变、原质疑者关闭、作者不可自关、旧幂等重放和严格修订号均为正面证据；本包保持对应服务端规则。报告自报模型费用不是供应商认证，也不纳入本包无模型验收。

## 独立代码复核发现

以下三项为本包代码复核发现，不冒称cld3作者报告：

| 问题 | 风险与最小修复边界 | 验收状态 |
|---|---|---|
| 默认帖子目录20/50不一致 | client响应guard以20代替共享默认50，合法21–50条默认页可被误拒；复用共享默认，不改变分页语义 | 旧实现相关3例中1失败；修后3/3及相关11项通过 |
| generic附件异步窗口 | metadata等待exists/content等待open后未重验当前授权、生命周期和封存可见性；按已有专用路径重验，open后失败dispose | 新增撤权/红删异步窗口两例真实旧红；修后定向通过 |
| reopen理由校验缺失 | 新reopen动作未像resolve检查reason_ref存在/同space；在新幂等action内部补同等规则，既有成功key原payload重放保持。历史坏理由读取安全null/unavailable | 不存在理由旧实现真实红；修后定向通过 |

## 实现与验收

CLI新增三例在旧built真实3/3失败，fixture的HTTP/SQLite/blob上传/发帖/关系创建均先成功，失败发生于缺少CLI命令；不是缺失新client方法导致的测试准备错误。薄CLI现已实现，候选首绿7文件43项exit0，含真实flat/wrapped/Pi SDK无模型独验；两处候选fixture准备错误单列保留，修正后重验。最终九包build/typecheck/lint共27步骤均exit0，最终窄修后分别10623/9973/9921ms，workspace并发1；最终相关组合17文件102/102项exit0（外层20442ms）；首个完整回归180文件1093项中1088通过、5失败（外层350061ms/exit1），其后已独立重跑完整回归180文件1093项全通过（详见下节），不以候选定向绿代替完整验收；其余机器事实见[机器摘要](results.json)。

源码获取只在新的独立副本使用官方Git命令，不改原仓库完整内容，不另发源码包/release。内容读取只认服务返回并完整验证的字节，不抓外链或接收任意本地路径；每次当前ACL仍生效，封存研究资料不会因此进入公共投影。

### 源码获取实际范围

首次默认网络clone取得约1.7MiB Git管理数据后，按需取对象阶段约140秒无进展，仅终止已核归属的git子进程，记为网络准备中断，不报配方成功。相同新副本用进程级HTTP/1.1、低速限制与禁认证交互选项恢复，8秒exit0；该恢复副本安装前严格对照所有tracked路径：应有源码缺失0、排除路径物化0，两个必要legacy fixture均在。

最终指南整块另在fresh副本原文执行（仅换新目录名），15秒exit0、HEAD633c0e55，无filter不支持警告；随后固定工具安装、esbuild重建及九包build均exit0。此fresh副本未在安装前另测物化计数，不能将前一副本的preinstall指标合并成同一次，也不能把安装后生成node_modules/dist误报为稀疏获取失败。未据恢复选项断定首个停滞一定由HTTP/2造成；未来网络/服务端仍有条件限制。

### 首个完整回归的五项失败

本包首full为180文件1093项、1088通过5失败，独立保留原始结果。三项由真实新增relation history路由未同步OpenAPI造成，是契约文档遗漏，补canonical spec而不改计数断言。另一个旧consumer schema身份测试仍按单分支根定位；新deactivate union下应定位原创建分支，继续断言共享canonical对象身份。KC04的legacy_shape并不符合正式open-questions DTO，新增view响应guard拒绝它；保留该非法数据作明确拒绝回归，并须另验真实非空question投影通过。以上与上一包四个/me mock问题不同，不合并成同一原因。三文件窄修已独立审查，四个完整相关文件38/38项通过（外层10171ms），最终27包步骤再次全通过；另一次完整回归单次自然exit0：180唯一文件、1093唯一项全部passed，failed/pending/todo均0，Vitest347657.31ms、外层348120ms。不是拼定向绿；主代理已另开SSH直接核原始完整回归JSON及退出结果并接受该事实；最终rawprobe与checkout收据已由主代理新SSH核验，99项源/test/fixture/config/dist与两guide独立逐字相同，功能验收接受；唯一自有Arch根经归属/marker/父目录/0进程/0嵌套挂载核验后清退，owner与主代理分别禁共享新SSH确认ENOENT、errno2/absent/exit0。

### 最终独立接入与交付绑定

最终raw flat/wrapped/Pi SDK三模式probe实际exit0（1827ms、stderr0、model_calls0）。每模式执行指南原文三个JSON envelope，固定附件目录、五页UTF8/BOM与完整重建、base64独立片重建、真实pretty JSON预算、错误续片0HTTP、三知识view、固定理由历史、内容取消和显式停用均通过；无自动ACK。九工具保留。紧凑UTF8口径为：flat完整tools数组45921B、inputSchema数组41613B、各inputSchema单独合计41603B；wrapped分别46740B、42432B、42422B，不与cld3的42.7KB跨口径比较优化。

实际受测源/test/fixture/dist共99项及两份guide全文逐字一致，源码获取执行块仅替换新目录名；主代理已新SSH核raw probe/退出与checkout收据，并独立内存比较99项及两guide逐字一致，功能接受；唯一自有根已清退，owner及主代理独立禁共享新SSH确认ENOENT、errno2/absent/exit0。584项已有tracked后端产物中531相同、53变更已同步，新增三个模块的12个产物按精确名单纳入；未动Web产物。

所有准备/中间失败分开保留：首实现36项中1项把既有跨actor DELETE的FORBIDDEN403误预期404，只修新测试的预期；候选43项中2项为错误取getMe.actor及缺fixture私有blob目录，修准备后43全绿。它们不算产品红，也不掩盖首full真实OpenAPI遗漏。
