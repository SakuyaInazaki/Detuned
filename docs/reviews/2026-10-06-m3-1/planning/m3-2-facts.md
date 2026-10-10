# M3.2 request_key 持久化：当前事实与两个最小候选

2026-10-06。仅窄读client/CLI、docs04§4、roadmap M3.2；M3.1源码/tests继续冻结。未实现M3.2、未运行测试/build/模型或安装；本文件的候选接口不是已批准契约。

## 现有API和真实缺口

`packages/client/src/index.ts:1` export * client.js。client.ts:162–176公开DetunedClientOptions（baseUrl/token/timeoutMs/maxRetries/maxRetryAfterMs）和RequestOptions（method/path/query/body/requestKey/signal）；186–192构造默认30秒、3次retry、Retry-After预算120秒。200行公开request<T>；217–219仅将调用者提供的requestKey放进Idempotency-Key，不生成key，不持久写文件。524/528 createSpace/patchSpace、575/585 createThread/patchThread、595 createPost、631 createPostRevision、647 withdrawPost、663 createRelation、673 resolveRelation、690 reopenRelation都接受显式requestKey及signal；734 subscribe也可传key，但订阅恢复主要是consumer_key，不能把它和业务写入幂等键混为一谈。775 callTool→817起forum_publish/871起forum_relate直接传params.request_key。没有RequestKeyStore/逻辑操作ID/获取已有key/持久配置导出API。

`packages/cli/src/index.ts:74–84` getClient仅配置baseUrl和token（flag/env/token-file），没有timeout/retry/key-store设置或落盘key。87–96 readInputJson只读取用户现有输入，不写它。373/379 publish及413/419 relate使用 `--request-key` 优先、输入JSON request_key次之，并在传业务payload前取出key；没有key生成、自动记录或重启恢复入口。461/471 subscribe传可选flag，但恢复consumer仍是服务端consumer_key机制。当前CLI无附件上传命令，不把上传材料恢复塞进此包。

因此当前已经可由用户把key放在原输入JSON或外部持久存储，并在新进程手工传同key重放；这是已有显式API能力，不能说完全无法跨进程重放。真正缺少的是仓库提供的可选持久化接口：在首次发包前稳定分配/保存key，进程崩溃或响应丢失后按同一个明确逻辑操作取回原key，而不是新随机键。

docs04:138起规定服务端唯一域actor/space/operation/key，operation包括真实目标、hash包括expected_revision/version并排除传输session元数据；不同actor不继承、换credential仍同actor可重放。client可选参数不等于缺key也成功：server spaces.ts:51–58拒缺key，core idempotency-service.ts:2622–2633也拒空key并按服务端规范化hash处理。持久化客户端不得复制服务端业务幂等结果/权限判断。

## 已覆盖的传输生命周期

- client.ts:245–282逐attempt组合外部signal/超时到fetch，headers+body都受同一次timeout约束；UserAbortError、TimeoutError不自动retry。M3.1新route/MCP信号链补全已冻结，Pi execute既有signal传递，不需要另造后台poll。
- client.ts:444–456拒400/401/403/404/409/413/422重试；429、502/503/504及允许的服务retryable可重试，网络cause码识别见107–135。headers在attempt循环外构建，因此同一request调用的重试保持原key。默认maxRetries3为最多4次attempt。
- 91–105、458–474尊重合法Retry-After，超120秒预算或Node timer上限拒自动重试，不压短服务等待；非法值用有界退避+jitter。487–495 finally先清attempt timer/listener，505独立可取消backoff。成功信封与五类错误分离沿docs04§4，不缓存响应正文。

这些是源码已有实现与既有验收事实的定位；本盘点没有重跑它们。传输retry能复用内存中key，但不能自动重建已经结束的进程内opts。

## 候选A：显式单操作key文件（最窄CLI路径）

新增可选独立key-file helper/CLI flag：调用者给该逻辑操作专用路径，先以排他创建/私有权限原子落盘随机key，再发HTTP；存在则读原key。调用者仍用现有业务输入文件或stdin重新提交，不保存body、响应、token或上传材料。可附最小版本/服务实例域/actor/space/实际操作目标和可选本地输入fingerprint用于防误用；actor由显式可信调用上下文或getMe取得，不能把token当稳定actor身份。具体字段、fsync/并发锁/冲突策略由父冻结。

兼容：旧--request-key及input.request_key继续原行为；显式key与新file同时给应制定可见拒冲突规则，不悄悄覆盖。相同内容的两个独立逻辑写必须用不同文件；文件重用表示用户显式恢复同一操作。代价：多文件管理/手工保管且误复用易409，文件虽无秘密仍泄露操作存在与对象关联；hash也可能被字典猜测。没有共享client接口可直接用于MCP/Pi，首包若roadmap要求共用持久接口就还需抽helper，不把CLI-only声称全M3.2。

## 候选B：共用可注入RequestKeyStore（窄持久接口）

公开可选接口例如 `getOrCreate(scope, logicalOperationId):Promise<string>`；scope明确服务实例、actor、space、实际operation/target。调用者提供稳定logicalOperationId，store原子分配key后返回，写wrapper继续使用已有requestKey参数；可配一个显式私有文件store，内存store不称跨进程持久。若父选择加options自动接线，也必须要求显式logicalOperationId且不改变旧无store调用。不要仅用payload hash作为操作ID：相同正文的两次有意独立写应可产生不同操作。

兼容：保留现有method签名和显式key，store是opt-in；换token同actor可恢复、不同actor/server隔离。由客户端提供/核可信actor域，不从密钥摘要冒充actor。每次先持久getOrCreate再HTTP，cancel/timeout/unknown提交结果不删除key；不默认因拿到成功结果清掉记录导致响应丢失后难恢复。不缓存服务端业务结果，仍重放HTTP让服务重新鉴权。代价：需要原子并发getOrCreate、文件锁/损坏恢复、明确目录权限与保留/人工清理；缺稳定逻辑ID就无法判断是否同操作，不能靠猜测自动恢复。

隐私底线：store仅必要key与最小scope/操作标识（可讨论不持久目标的域映射）；无token/Authorization/header dump、无响应正文、无任意正文或附件副本。文件0600/目录0700为候选本地实现边界，不会改变用户全局配置。服务URL需去除userinfo/敏感query而非原样持久。fingerprint如用仅是本地误用检查，不复刻服务端规范化/权限规则，也不当“无泄露”保证。没有inbox、自动ack、后台Agent或模型调用。

父需选择最小包路线A/B及显式scope、logicalOperationId来源、key冲突优先级、损坏/并发与保留策略后再实施。本盘点不创建待实现产品接口或承诺M3.2已完成。
