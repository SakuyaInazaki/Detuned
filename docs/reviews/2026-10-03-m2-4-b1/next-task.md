# M2.4-B.2.1 内部任务：固定帖子修订有界内容读取

2026-10-06，父代理已冻结下述方案。此文件是下一包任务书，不表示已开工、实现或验收 B.2.1。主代理负责拆解、分派与验收，gpt-6.1-sol 子 Agent 在确认所有权后执行，用户无需手动转交。

## 起点与范围

起始状态以 [B.1 验收](README.md)、[独立验证](verification/verification.md)、[覆盖](coverage-audit.md)为准：276/276、28 正式文件、当前版本化29/29通过；新 core8+contracts5 已计入全套，不重复累计。B.1 的 cap 只约束成功 compact HTTP 完整正文，含真实 req.id/data/meta，不含 header、错误或 SDK/CLI pretty 包装。固定空间规则续读及 context 明确预算省略已接受；三组真实旧 HTTP 重放因原临时 DB/凭据丢失，本轮未完成，10-03旧通过证据不能改称10-06复跑成功。

本包只实现固定**帖子修订内容**续读。主题仍是帖子元数据目录；B.2.2另行决定目录翻页/聚合，不聚合主题全文、不改旧裸列表 cursor。B.2.1不等于全T06/M2.4/M2完成；review/artifact/M3/100k/真实宿主模型不进入本包。

## 唯一批准接口与文档

新增 `GET /spaces/:space_id/posts/:id/revisions/:revision`，revision 必需，严格正 safeinteger；query 仅 max_bytes/cursor。预算4096..65536、默认12288。旧 `GET posts/:id`、`GET posts/:id/revisions` 目录、旧 getPost、forum_read 的 post 分支与旧 CLI read 保持合法输出。

唯一拼接文档为 `JSON.stringify({title,summary,body,tags,structured})`，顶层键按此顺序，取固定 stored 值。不得套新写 validator、补历史字段/默认、删除旧额外 structured；不得把已有 content_hash 称为该投影文档 hash。body 合法空串仍读取整个非空 JSON 文档。各 chunk 拼接后才 JSON.parse；start_byte/end_byte 是原 compact 文档 UTF8 半开字节区间，不能切码点。

`PostRevisionContentPage={data,meta}`，data 唯一字段：

```text
ref:{space_id,post_id,revision}
post_kind
lifecycle
has_newer_revision
encoding:'json'
chunk
start_byte
end_byte
complete
```

post_kind 是帖子不可变类型；lifecycle 为当前 active/withdrawn，has_newer_revision 为当前 head>ref.revision。后二者每页取当前同读快照，可随页变化，不属于固定拼接文档。page/envelope 必须完整相关 union：complete=false→meta.truncated=true/nonempty next_cursor；complete=true→false/null。metadata/ref/chunk 来源同 snapshot，serializer 与预算计量共用同源完整 compact envelope、真实 req.id、双重转义与实际签名 cursor。

## 服务端先验与分页

每页先 refresh 身份、space observer/read 授权，核目标所属空间与当前生命周期，再处理 cursor。无权/跨空间/不存在沿现401/403/404策略，不泄漏目标；redacted 每页410 CONTENT_REDACTED，持有旧 cursor 也不能绕过；withdrawn 可读并显式标记。权限、生命周期、修订及游标判断只在业务层。

cursor strict `{v:1,purpose:'post_revision_read',actor_id,space_id,post_id,revision,byte_offset,exp}`，未知字段拒绝，全绑定；offset 正 safeinteger、小于固定文档末尾且为 UTF8 边界；max_bytes 不绑定，最长4096字符。首次 exp=floor(clock秒)+86400，后续保留首次值，等号有效/+1秒失效，拒 exp>now+86400。错绑定/用途/签名/位置/期限统一400非重试，并使用批准的固定重读提示；当前 ACL/revocation/redaction 优先于旧 cursor 判定。

复用 B.1 纯编码思路、现 signer/readSnapshot；无新 DDL/依赖/泛化框架。每请求一次完整固定文档 JSON/Buffer，诚实 O(doc)，不宣称 CPU/常数内存硬 cap。剩余原字节≤max_bytes 才测完整末页；非末二分 hi≤start+max_bytes 且<total，调整 UTF8 边界，每候选按真实完整 envelope+签名测量。非空推进，否则最小 metadata/不能推进422，不返回死循环 cursor。

## 接入与兼容

新增 forum_read 判别 `kind:'post_revision'`：space_id、id、revision 必需，max_bytes/cursor可选；新 kind 返回完整 page。旧 kind:'post'保留整 data、revision 可省且无 budget/cursor。共享 schema root object+anyOf、严格 branch，direct callTool 共用纯结构校验；不复制业务授权。

新增静态 client `getPostRevisionContent(...)`，旧 getPost 不改，不引入新运行时响应 validator。CLI 新增：

```text
detuned post read <space-id> <post-id> --revision N [--max-bytes N] [--cursor TOKEN]
```

新命令严格数值、输出完整 page。2026-10-06窄只读核查现有读取相关入口包含 space read 与 read，未注册 post 命令，新方法/类型/tool kind也未存在；未发现命名冲突。实施前仍核实际工作区，发现冲突只报父，不自行更名。help/tool说明新 kind 是固定内容续读并明示旧 post 无预算；docs04原规划 posts/:id 带 cursor 的行在实施授权后改为实际旧 route+新增固定 route，ADR记录加法兼容决定。

## 三单元所有权候选与流程

父确认精确路径后才能写产品；候选边界如下，不能互改或自行扩包。

1. core：新 `packages/core/src/services/post-revision-read-service.ts`、必要 core index 导出、新 `tests/integration/m2-post-revision-read.test.ts`、docs03、docs12 ADR。不改旧 PostService写入/validator/DDL。确需旧正式适配时先列文件+具体断言给父批准。
2. 协议接入：protocol帖子内容投影/page/cursor纯结构与编码、tools/OpenAPI；server app/posts 新route；client/client.ts 新方法与tool dispatch；CLI新命令；新 `tests/contracts/m2-post-revision-read-contracts.test.ts`；docs04与新续读例子。保持旧 post/thread/list合法输出，旧正式变更先逐项批准。
3. 独立验证：只读审查产品；新增本包 verification/覆盖/完整性与探针，冻结后统一执行。不得代改产品/正式测试，不把实现者自测当独验。

流程：只读精确路径/旧断言兼容图→父确认所有权及必要旧适配→至少两项实质 before→父放行实现→有限定向验证→产品/tests/规范冻结→独立一次全suite/current29+既有SR/SQ/KV→父验收。before用真实新route404、缺tool/CLI分支，并保留旧全body超预算事实；不以缺 import/helper 作为功能反例。所有 first-failed/before 保留，不覆盖失败或反复全跑掩盖问题。

## 必须验证的有限矩阵

- 4KiB/64KiB/default；中文emoji/控制字符/引号反斜杠/双转义，历史 structured 不符合当前类型但保持 stored值；存储孤立 surrogate 按实际 stored 文档证明，不能声称恢复写入已丢字符；实际 req.id 临界。
- 固定旧 revision 拼接在 head 更新后不漂移；post_kind不可变、当前 has_newer_revision/lifecycle有证据；空body、withdrawn显式可读；中途 redaction 后旧cursor410，撤权401/404先验与无权目标不泄漏。
- 跨post/空间/revision/actor/purpose、签名/未知字段/非UTF8边界/末尾offset、过长cursor；TTL两次非末页中途推进Clock，下一cursor保持首次exp，换预算；exp等号/+1。
- 全库指纹证明成功/错误/422无entity/event/idem/ack副作用；双WAL受控生命周期屏障证明材料+metadata同snapshot，不用sleep凑竞态。
- raw HTTP真实正文与共享serializer逐字节、OpenAPI动态完整目录预期新增一GET但按实际数报告；Pi已装官方validator→真实execute、MCPstdio、CLI真实子进程新分支/错误及旧post正例兼容。不把纯schema校验当执行或真实宿主模型认证。

B.2开工重新捕获实际保护清单与哈希，保留所有既有不可变 review/probe/log/evidence（含刚验收的完整B.1新证据）及SQL/archive原字节，冻结schema/profile；授权状态索引更新和build产物正常变化单列。2207只是B.1运行时旧manifest计数，且含可变的reviews/README索引，不能复制为下包保护总数，也不能把获准的状态索引更新误判为改写旧证据。现三组丢失真实历史夹具持续明确 not_run，只有恢复原DB/对应凭据才按原脚本重试；禁止当前schema或Git HEAD冒充原M2.1工作区、伪造原hash/成功。未来真实历史夹具另需受限目录持久保存方案、仓库不放token；本包不扩为历史恢复/导出项目。

## 交付与禁令

各单元保存准确命令、实际stdout/stderr/exit、文件所有权与覆盖；独验统一报告正式唯一文件/项数、当前29实际结果、旧SR/SQ/KV与未运行检查，不能累计重复项或硬编码成功。未做Node22/干净安装/远程CI/100k/真实宿主/模型不得报通过。

禁止 deepseek-brainstorm、commit/push/reset/clean、清理旧证据/SQL/schema/archive/node_modules/dist、发布/公网部署、真实模型调用与全局Agent配置修改。发现范围/安全或父冻结实质冲突先报告，不自行折衷；可逆实现细节在边界内处理。完成后说明本包行为、证据、限制和下一阶段B.2.2待裁事项，不声称完整产品完成。
