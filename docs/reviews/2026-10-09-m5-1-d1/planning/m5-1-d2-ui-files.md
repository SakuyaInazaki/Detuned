# M5.1-D.2 Web 文件与浏览器接点短核

本文件仅为已冻结 D2 任务的实施分工/标签草案，未实施、未运行浏览器或修改客户端。依据本包 `m5-1-d2-task.md`。

## 最小 UI 分工

- `packages/web/src/app.tsx`：沿现单一 browserSession client、generation/AbortController、退出 pending-CSRF 封锁；拥有目录/比较/附件选择与上传/下载/发帖各意图状态。现 createPost Intent 加冻结 artifact_ids；上传有独立 File/metadata/key 意图，不共用帖子 key。正常成功仅保附件 metadata/id，失败未知结果保持不可变意图供同 key 恢复。
- `content.ts`：继续唯一固定正文 `getPostRevisionContent` 的 65,536 字节分页与单份 1 MiB 累积/五字段完整解析。比较仅在两份 complete/document 且未 rawMode 后进行，不另取无界旧 getPostRevision。title/summary/body/tags/structured 全五字段分别标相同/变化；对象键顺序不当内容差异，可在有限解析值上局部安全确定性序列化，无法处理则明确不可比较，不造递归通用数据框架。
- 可新增 `revision-evidence.tsx`：纯展示修订分页、两个显式版本选择、五字段比较及附件 ready/missing/redacted 分支；事件回调交 app，不创建第二客户端/认证状态机。
- `styles.css`：沿浅色布局，目录与五字段前后区域窄屏堆叠、明确禁用/焦点/状态。不新增框架。`knowledge.tsx` 保失败视图不变；`main.tsx` 入口无需修改。

## 可访问标签草案（给 D）

固定阅读区保“固定修订 R / 继续加载正文 / 从首段重开 / 引用回复”。新增“修订目录”“加载修订目录”“下一页修订”，行按钮“打开修订 R”；选择框“比较版本一”“比较版本二”，按钮“比较所选版本”，区域“五字段比较”。附件区“本修订附件”“加载附件目录”“下一页附件”；每条显式“下载附件 ID”，missing 展示“附件缺失，无法下载”，redacted 仅“附件已遮蔽 ID”。composer 新 label“选择附件文件”、按钮“上传所选附件”“重试上传同一附件”，已上传清单“待绑定附件”明确“发布成功后关联”。保已有“发布笔记/发布/重试同一笔记”等实际按钮，最终 accessible-name 在 D2 开工与 D 对齐。

## 现 shared client 浏览器事实

`client.ts:624–647` upload 使用 Blob/File 的 immutable slice，先有限 arrayBuffer + SHA-256，再每 attempt 新 FormData；元数据 JSON 和 body/key 快照一致，回包 bytes/hash 核对。最大 25 MiB，允许 0 bytes；`artifact-transfer.ts:24–34` 无 Node import，仅 Web Blob/TextEncoder/WebCrypto。共享 executor `client.ts:247–250,310` browserSession unsafe 请求自动取当前 CSRF、same-origin cookie；不能 UI 手写认证或改变默认 bounded retry。

`artifact-transfer.ts:37–87` download 从 metadata 起整条 timeout，固定编码的 `/api/v1/spaces/.../artifacts/.../content`，不抓 content_url；redirect:error、同源 cookie、准确 Content-Length/MIME、真实 EOF/bytes/SHA 后返回 Uint8Array，Abort 与晚响应 body 清理。依赖为标准 Web API，未发现具体 Node FS 或浏览器依赖缺口；WebCrypto 需要安全上下文（已支持 HTTPS 或可信 loopback），实际浏览器仍由 D2 验证。目录允许历史登记 bytes >25 MiB，但旧 getArtifact/完整下载维持既有 metadata/25 MiB 边界，不能宣称所有登记附件均能下载；遇真实此类错误应明确说明而非放宽 API。

UI 下载必须在 await 完整验证后再次核 auth/generation/space/post/revision、再创建短命 Blob URL 和显式 anchor 下载；陈旧结果不得创建 URL/触发点击，finally 回收 URL。仅点击 ready 可尝试，missing/redacted 不走网络下载；不自动预览/执行。

跨 space/ref/logout 清目录/比较/上传选择并取消旧工作；未知上传与帖子各自保存 body/key，不允许同一 key 编辑新意图。退出保原 CSRF 仅供注销重试，业务保持封锁。单次比较最多两份各 1 MiB，超限仍保分段阅读且不显示完整比较成功。没有新增 HTTP、业务授权规则或 client 修改。
