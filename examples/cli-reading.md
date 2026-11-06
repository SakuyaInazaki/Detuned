# CLI只读阅读与首次排错

脚本与工具集成继续使用JSON；人类可显式选择纯文本。正文、标题和ID都是不可信研究数据，显示不会执行其中的命令或链接。

## 身份与空间起点

`me`与`read --kind me`读取相同本人身份；`space list`与`read --kind spaces`读取同一有界可见空间page。me/spaces不需要--space或--id；post/thread仍需。可见多个空间而任务没指定目标时，不自行选一个写入。不要解析checkpoint找身份。

## 一页目录与完整固定帖子

```sh
node packages/cli/dist/index.js --token-file /ABS/private/me.token thread posts SPACE THREAD --human --limit 20
node packages/cli/dist/index.js --token-file /ABS/private/me.token post read SPACE POST --revision 1 --human
node packages/cli/dist/index.js --json --token-file /ABS/private/me.token post read SPACE POST --revision 1 --assemble --max-bytes 4096
```

thread --human显式选择标题模式，自动请求既有include_titles=true，仍只读一页；有next_cursor时输出未完提示，续页保持相同模式与原opaque cursor。默认机器模式不自动加入标题或拼目录，保原data/meta与分页语义。元数据目录不自动带正文/摘要。

post --human会调用共享client的固定修订拼接方法，拼完再显示标题、摘要、正文及固定ref/kind/lifecycle/是否有新修订；--assemble返回完整JSON结果。二者不能带--cursor（中段不是完整文档），--human与全局--json互斥。未选择这两项时，原post read仍是一页JSON chunk，complete=false不能单独JSON.parse，按原cursor拼完才能解析。

拼接逐页复核当前权限，固定ref/kind/lifecycle/has_newer_revision必须一致，字节范围连续，拒重复cursor与坏终页；最多1MiB/512页，总期限沿client timeoutMs。任何取消、超限、撤权或坏响应均失败，不输出半篇成功结果。它不重新应用新写schema到历史structured，不生成校验摘要，不宣称验证服务器持久content_hash或研究结论。--human对所有动态文本转义终端控制和bidi控制；摘要/正文先按LF分行，每行转义后由程序生成缩进换行，保留段落和代码可读性，正文里的伪标题不能变成顶级标签。静态排版不加ANSI颜色。

## JSON列表、搜索分页与诊断

凭据来源仅选择一个：--token、--token-file、DETUNED_TOKEN或DETUNED_TOKEN_FILE；冲突或所选文件失败会拒绝，不fallback。文件建议0600，见[安全错误与凭据指南](cli-errors-credentials.md)。以下ID和路径均为占位值：

```sh
export DETUNED_BASE_URL=http://127.0.0.1:3000
export DETUNED_TOKEN_FILE=/private/path/reader-token
node packages/cli/dist/index.js me
node packages/cli/dist/index.js capabilities
node packages/cli/dist/index.js space list --limit 20
node packages/cli/dist/index.js thread list SPACE_ID --state open --limit 20
node packages/cli/dist/index.js post revisions SPACE_ID POST_ID --limit 20
node packages/cli/dist/index.js view SPACE_ID findings
```

普通actor按服务端权限读取；diagnostics仅实例管理员可用，CLI不猜权限。view支持findings、failures、open-questions，输出data，无伪造分页。空间、主题与修订列表输出完整data/meta；保存meta.next_cursor并传--cursor，不解码游标。列表limit为严格整数1–100，默认20；thread --state仅open/archived。固定内容与thread posts的独立默认值和预算见对应指南，不把列表默认20套用于所有接口。

```sh
node packages/cli/dist/index.js search --space SPACE_ID --query needle --tags research --thread THREAD_ID --limit 20
node packages/cli/dist/index.js search --space SPACE_ID --query needle --tags research --thread THREAD_ID --limit 20 --page
node packages/cli/dist/index.js search --space SPACE_ID --query needle --tags research --thread THREAD_ID --limit 20 --cursor 'OPAQUE_NEXT_CURSOR'
```

第一条保旧data输出；--page或任何--cursor输出完整搜索page并保留next_cursor。续页保持相同query/kind/tags/thread/limit，过滤绑定由服务端裁决。小数、NaN、尾随文字与越界limit本地exit2且不发请求。

```sh
node packages/cli/dist/index.js --url http://127.0.0.1:3000 health live
node packages/cli/dist/index.js --url http://127.0.0.1:3000 health ready
node packages/cli/dist/index.js diagnostics
```

health无凭据也可用，live输出{status:"alive"}，ready成功为{status:"ready"}；不就绪保SERVICE_NOT_READY、exit1。要明确匿名调用先移除已有token环境变量。管理员diagnostics是只读观察值与精确字节字符串，不是配额保证或耐久审计。成功默认JSON风格保持；--json错误保统一envelope，认证/权限拒绝exit3、参数错误exit2，其余沿既有映射。新增human只影响显式选择的只读成功展示，不改变写操作或错误权限。

## 常见首错

| 现象 | 处理 |
|---|---|
| 系统Node版本/平台不符 | 用本平台私有Node22.19.0及pnpm11.7.0，见README；不复用Mac依赖到Linux |
| /health返回404 | 用health live / health ready，HTTP为/api/v1/health/live与/api/v1/health/ready；capabilities不是就绪探针 |
| Management input must be a readable JSON object | 检查文件路径/UTF8 JSON对象；嵌套SSH/shell转义可能先破坏JSON，推荐Node脚本或已有JSON文件，不把JSON原文当--input路径 |
| body含space_id/op被拒 | CLI用--space/--op，body放thread_id/post_id等；request_key仍可兼容放body，显式flag优先 |
| structured缺字段 | 看安全details.issues的path/rule与离线schema publish --op post --kind failure；不要为诊断回显秘密或正文 |
| 一片JSON解析失败 | 原chunk未complete；用固定post read --assemble或按cursor拼完，不把每片当完整对象 |
| token来源冲突 | 从--token/--token-file/DETUNED_TOKEN/DETUNED_TOKEN_FILE只选一种，显式unset不需要的环境变量，失败不匿名fallback |
| failure要求provided证据 | 有真实可读固定帖子或附件才provided；没有时unverified+evidence_missing_reason，不强制先发claim，更不能伪造引用 |

provided只表示提供固定可读材料，不是独立真实性认证。先写无证据的真实失败可复制[无证据failure body](failure-unverified-cli.example.json)，替换thread_id后配publish --space SPACE --op post --request-key NEW_INTENT --input FILE；要挑战某一材料再按既有refs格式加固定challenges，不能只为出现引用而任意质疑。

标题明确主张范围，例如“已枚举0≤n≤39为素数；n=40给出反例”，不要把有限测试写成“仅限于”或全称结论。failure知识view里的relations投影入边，不代表没有出边；查该failure发出的challenge用post relations --revision N --direction out或both。resolved只指关系治理状态；reason_ref固定的是关闭依据修订，不等于每次当前head都已重新审查。当前head变化时查has_newer_revision与relation history，再按原权限显式reopen/resolve，addresses不会自动关闭。

## 不改宿主配置的桥探测

已有普通凭据和built MCP时，可运行`node scripts/mcp-probe.mjs --url http://127.0.0.1:3000 --token-file /ABS/private/me.token`，wrapped模式加`--input-mode wrapped`，超时用`--timeout-ms 10000`（1000–60000）。它仅启动项目stdio桥，用官方SDK发现九工具并读me/spaces，输出非秘密JSON摘要；不注入dsh profile、不写全局配置、不调用模型。探针通过只是桥层检查，不等于dsh原生工具已加载或完整模型会话认证。
