# R20 覆盖与交付核对

## B：功能与正式回归验收通过

`schema-generation.test.ts` 6 项与 B 集成回归 82 项已实际执行。相对 R19 的有限补项：

| 要求 | 当前证据 |
|---|---|
| 消除索引 no-op | 对真实 `idx_events_space_seq` 断言唯一匹配；改变 collation/DESC；检查 keyTerms；无 src 编译产物通过 |
| FTS 来源 | 对 body→body UNINDEXED 断言匹配与变化，生成 profile 保留 unindexed，运行时通过 |
| 允许列变化 | V2 objective.notnull=false、V1 对应字段保持 true；生成/check/运行时通过 |
| PK 来源策略 | NOCASE/DESC 在生成时拒绝；让 SCHEMA_SQL 匹配源后，同步检查也给出主键策略错误 |
| V1/V2 损坏恢复 | 分别真实 check 非零→generate 修复→check 零；冻结历史 SQL 哈希不变，编译运行通过 |
| 缺输入/标记 | 当前源、历史源、驱动、helper、V2 目标以及 BEGIN/END；明确非零、目标哈希不变、恢复后可生成/同步 |
| 完整行为回归 | AA/AB 各 4/4；全部旧 B 行为探针通过 |

这些检查已经足以关闭 R19-F01。个别重复断言可以继续改善，但不作为新增 B 阻塞，不要求再加生成语法场景或重写架构。Gate A 哈希显示仅此测试文件变化，且与最终版本一致；阶段日志符合当时仅 U05/U06 失败的门槛。

## C：13 项正式测试的实际范围

| 组 | 实际覆盖 | 本次缺口/下一轮要求 |
|---|---|---|
| C01-1～4 | relation 额外 body 拒绝；三个非法整数和一个合法 limit；core 非法枚举计数不变；合法关系状态流程 | AC01 的 query/引用/请求解析/无 body 写入口未覆盖；core 夹具只构造了早期枚举失败所需部分依赖，不能外推完整业务路径 |
| C02-1～3 | 200 截断 JSON；缺 data/api_version；null/false/0/[] 和未知扩展属性 | 未测非法已知字段、data+error、稳定的客户端错误分类或真实注册 adapter 的坏响应路径 |
| C02-4 | 预先 aborted signal；stub 延迟后检查 timeout | 未完整覆盖等头/读 body/退避取消；本轮 AC05 独立正例通过，需移入正式测试 |
| C02-5 | 请求成功后再 abort | 没有 listener/timer 计数，不构成无泄漏证据；补可观测资源断言，尤其正常退避完成 |
| C02-6 | 503/retryable=true，maxRetries=2 得到 3 次调用，键相同 | 未测 fetch cause、Retry-After、不可重试业务状态；真实等待数秒，可用可控时钟改进 |
| C03-1～2 | 命令注册和 console/notify 被调用 | 未绑定测试服务；错误路径也通过；UI 只测 forum-check。改为有控制的两命令×两模式×成功/失败 |
| C03-3 | package.json 文本等于 >=22.19.0 | 只证明声明内容，不证明 Node 22 实际运行或所有依赖/CI 环境通过 |

新正式用例不需要复制整个审查脚本。把稳定输入与可观测断言放进合适的 tests/contracts/integration 文件，可用参数化表和小 helper。不要依赖 `docs/reviews/` 来执行核心 CI。

## 正例与限制

AC05 使用可控阶段屏障，确认五个阶段的返回类别、请求次数以及操作结束后外部 signal 的 abort listener 数为 0。AC06 使用注册的 Pi 命令/tool 回调，明确 stub fetch，不调用模型或真实宿主；两条命令在 UI/无 UI 成功输出正确，损坏 JSON 的工具执行 reject。这些独立结果证明对应行为已工作，不等同于已经补齐正式套件或全宿主认证。

## 文档与证据补项

1. 逐路由清单涵盖 32 个已启用业务入口，注明 body/query/params/header 与无参数入口的实际约定。当前 [route-inventory.json](route-inventory.json) 只做注册元数据与 OpenAPI 操作匹配统计，不把 schema 缺位直接等同于无校验。
2. OpenAPI 复用 protocol 的真实约束，至少覆盖当前操作与请求参数；未来功能继续标为规划，不创建空路由。
3. 对错误分类、请求超时范围、最多重试数、Retry-After、query 空值/重复值写明契约；对应例子与客户端映射一起更新。
4. 正式 Pi 测试使用固定 fake 环境或自己的服务，恢复全局 fetch/env，不访问默认 3000 上可能存在的其他服务。不用日志调用次数冒充成功内容验证。
5. 保留现有 TypeBox 版本边界，以锁定 Pi 类型给局部转换命名并说明；不借机升级 SDK、强制清除全仓库 any 或新增模型依赖。
6. 最终运行器同时采集成功和失败命令的 stdout/stderr，真实解析计数，保存真实退出码与时间；本轮已有 stdout 不需删除或覆盖。
7. R19 的旧哈希/覆盖事实在新报告准确链接；实际测试字段和变体按源码写。当前进度与未运行检查应补齐，不能从 engines 声明推出实测兼容范围。
