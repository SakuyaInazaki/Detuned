# 下一任务：M5.1-E.1 空间概览与本人权限/规则页面

根已冻结范围；须先D.2接受及下一fresh后实施，本文不预填成功。只复用现API/sharedclient，不新增API/DDL/deps/模型。B负责Web产品，D负责真实Chrome/SQLite独验，A负责文档；精确文件届时分配。

## 概览与规则

每次进入空间先显示概览，导航提供真实概览/讨论/搜索/失败/设置。调用 `getContext(spaceId,{max_bytes:65536},{signal})`，返回完整 `ContextPage {data,meta}`；展示服务器objective/rules、space_revision_ref、policy_revision、固定pinned summaries与source_refs/has_newer_revision、有限blocking_objections/recent_failures/recent_activity。meta.truncated及space_content_status='omitted_for_budget'必须如实提示。10/5/5只是有限候选且可能再被预算裁剪，空数组/省略不能冒称全空间无问题；这些数组没有完整分页，不创建假分页。

固定post refs可进现reader并衔接正确thread引用；没有thread_id的证据ref不猜归属。context checkpoint不自动poll/ACK；不发明宿主在线、模型理解或逐帖诊断session审计。

规则未内联完整时，沿固定 `space_revision_ref` 调 `getSpaceRevision(spaceId,revision,{max_bytes:65536,cursor?},{signal})`（client.ts:715），不是虚构GET /spaces/:id。返回 `SpaceRevisionPage {data,meta}`；data含ref、encoding固定json、chunk、start_byte/end_byte、complete（精确字段见protocol/spaces.ts:134），chunk是唯一compact JSON `{objective,rules}`的UTF8分段文本。按同固定版本与opaque cursor顺序累计，complete=false对应truncated=true及next_cursor，完整后才JSON.parse；complete=true对应false/null。续页保首24h exp，可改变预算；错误可从同固定版本重开。每份UI累计最多1MiB，超预算退为明确raw段阅读/继续/重开，不称完整规则。背景版本改变仅提示、不偷换ref。

## 本人权限与接入提示

设置复用getMe，显示本人actor、当前credential capabilities/allowed_space_ids、已返回visible_spaces及selected space role。visible_spaces最多100，不是完整ACL证明；不推演每项业务授权、不造管理员页面，实际请求仍由服务裁权限。

接入提示只用独立普通身份及占位凭据路径，不显示当前login token/cookie/CSRF，不自动写Agent配置。可在页内纯文本展示仓库相对文档名和短步骤，当前站点只发布index/assets，不造会404的仓库文档URL。已核可用CLI示意：

```sh
node packages/cli/dist/index.js --token-file /private/path/reader-token me
node packages/cli/dist/index.js --json --token-file /private/path/reader-token space list
```

四来源只选一个，所选失败无fallback；不要同时设置env token/file与显式flag。stdio入口是 `node packages/mcp/dist/index.js`，由宿主显式注入DETUNED_BASE_URL和仅一个DETUNED_TOKEN/DETUNED_TOKEN_FILE；不自动激活宿主或启动模型。依据examples/cli-errors-credentials.md与examples/mcp-bridge.md，不把模板当已写入用户配置。

## 验收与后续

保持auth/space/logout generation+abort、纯文本、安全可恢复错误、键盘窄屏。必要真实场景：普通context/固定规则续读与省略；置顶旧ref更新提示；空/有材料及有限状态；当前本人权限与撤权；跨space/注销晚响应不回填；无autoACK；导航键盘/窄屏。只UI则复用已接受下层，跑相关Web build/type/lint与新/受影响browser，不机械重复全core/current probes。首失败保留，不输出HAR/trace/storageState/凭据快照；可存无密视口截图。

主题真实创建顺序与安全Markdown另M5.1-E.2；容器、教程、干净安装恢复及M5出口随后。E.1不让这些目标静默消失，也不声称完整M5/M6/M7通过。事实依据：C/planning/m5-overview-order-facts.md、examples/space-rules-read.md及当前protocol契约。
