# M2.3 唯一接口冻结结论

2026-10-03，父代理批准实施；本文件优先于草案候选措辞，不是验收结论。

- SEARCH_LIMITS：q_codepoints256、tags_json_bytes8192、unique_tags100（dedup后）、cursor_chars4096、candidates5000、response_bytes262144、cursor_ttl_seconds86400。logical tags原输入数组JSON编码UTF8预算；HTTP tags_json URL解码后原串同预算；不trim JSON tag、不加单tag48或写入20限制。tags全部精确区分大小写，[]/省略无筛选，重复去重。CSV保留trim/dropempty；与tags_json按presence互斥、重复scalar/unknown拒绝。
- q只trim后1–256码点，共享无min/maxLength的代理对pattern（contracts附精确式）；TypeBox/AJV带/不带u边界证据附validator-experiment.json。core码点计数/分支一致，不NFC/fold，组合字符按码点。
- cursor v1/purpose search/actor/space/query_hash/sort id_desc/before_id/exp；标准sha256(canonicalJson({q,filters:{kind:null|string,thread_id:null|string,tags:dedup.sort()},sort:'id_desc'}))，不复制原条件、不绑定limit。现signer与持久secret/clock/hasher；TTL24h。当前空间授权先核，坏/过期/绑定不符/旧裸ID均400 VALIDATION_ERROR、retryable=false、固定去掉cursor重取第一页提示，不回显条件。无unsigned fallback、不新增表/crypto。
- protocol提供SEARCH_LIMITS、normalizeSearchQuery(query:SearchQuery):NormalizedSearchQuery（纯结构/归一，不鉴权、不验签）、isSearchCursorPayload(unknown):value is SearchCursorPayload；A仅import协议不新增TypeBox依赖。payload严格未知键拒绝；kind/thread/limit沿共享政策。
- ID DESC非时间/排名/快照；短LIKE也搜JSON tags text元素；非ASCII两分支SQLite原case行为保留，docs说明。candidate5000与items JSON256KiB，超限422 QUERY_TOO_BROAD，不是SQL VM/CPU/整个envelope/context硬预算。
- HTTP search data数组保持，必需meta{truncated:false,next_cursor:string|null}。SearchPage={data,meta}；client tags用tags_json、q.trim传输；forum_search改返回完整SearchPage，明确旧tool数组→result.data迁移与meta续页。MCP/Pi沿共用callTool，不增工具/各自业务；CLI仅输出data且无cursor，明确非CLI分页入口。
- app固定http:{maxHeaderSize:65536}，支持批准wire的URL编码/正常header余量；原生16KiB对边界URL431证据见native-transport-experiment.json。app仅另接SearchService signer/secret/clock/hasher依赖，不承诺无限headers/任意raw空白。
- B文件独占protocol search/必要tools/OpenAPI/sharedlimits；server search/query/app上述窄改；client search/callTool；tests/contracts/m2-search-contracts.test.ts；docs04/examples/search、新implementation/protocol证据。A独占core/storage；不改旧tests/probes/log/SQL/schema/其他adapter/globalconfig。先正式真实HTTP/client反例存fail，再实现；protocol独占build通知A，定向检查后冻结，由父安排全量。

父追加机制收窄：q pattern 的首尾空白表达改为 `^\\s*(?=\\S)` + 不重叠码点单元 `{1,256}` + `\\s*$`，替代全尾 lookahead，语义不变；旧 validator-experiment 原记录保留，有限8192空白/空白+257字符以及全部 Unicode 矩阵由新正式 S05 与 implementation 新机制记录验证。
