# M5.1-D.2 Web 作者交付

源码仅四文件：app.tsx/content.ts/styles.css 与新纯展示 revision-evidence.tsx；main/knowledge、下层 client/protocol/server、依赖及浏览器夹具均未修改。当前源码冻结，浏览器验收待 D。

## 行为

固定阅读区显式加载修订目录（20/65536、opaque next_cursor），当前页替换不攒全部记录；两项明确选版可跨目录页保留，打开修订重新生成阅读代，背景 current_revision 只提示。固定修订附件目录同预算，ready/missing 显示登记字段、redacted 仅 id/state。历史 >25 MiB 登记明确现下载上限。

比较请求沿 getPostRevisionContent 65536 分段，各版本最多累积 1 MiB；任何 rawMode/未完整/读失败都显示未完成全部对比。仅两个 complete/document 做五字段比较；局部 serializer 数组保序、字符串不规范化、对象 key 排序，按每份 maxdepth64/value-nodes20000/UTF8输出1MiB拒过复杂结构，不执行文本diff。渲染全部用 React text/pre。

ready 附件仅显式点击下载；复用 shared client 的完整 bytes/SHA/EOF 固定路径校验，await 后核 generation 与 signal，才创建临时 Blob URL/anchor，finally remove/revoke，不预览或执行。auth/space/ref 导航均递增 generation + abort，清目录/比较/附件选择；晚响应不能创建下载 URL。

笔记表单单文件逐次上传（File/metadata/body/key 不可变、同 key 恢复），未知上传锁定独立意图。成功只留 metadata，清 File 与原 file input；多个已上传 id 作为待绑定列表。createPost 一次冻结 artifact_ids + 原 refs/body 与独立 post key，发布成功才清 UI，未知结果保持同一 body/key。不会自动删除未绑定已提交附件；新主题首帖表单不扩。既有 client 默认 bounded retries 不变。

## 标签

修订目录 / 加载修订目录 / 下一页修订 / 打开修订 R；比较版本一 / 比较版本二 / 比较所选版本 / 五字段比较；本修订附件 / 加载附件目录 / 下一页附件 / 下载附件 ID；选择附件文件 / 上传所选附件 / 用同一请求重试上传 / 待绑定附件。旧发布笔记、用同一请求重试发布与正常阅读入口保持。已提前交 D。

## 实际检查与限制

唯一作者 Web noEmit exit0，无输出（source-check.json 记录真实工具结果）。作者未运行 build、浏览器、全量核心或 current29；D 统一检查四文件及新/受影响真实旅程。没有作者纯 serializer 的运行测试，预算/晚响应/下载回收实际效果须以 D 真实测试为准；不以 noEmit 宣称浏览器通过。

附件仍 <=25 MiB 有界缓冲，比较仅字段对比，不是语义等价或行diff。服务端继续唯一裁决权限、作者、固定修订与绑定。没有新 API、自动 ACK、持久凭据或外部资源。
