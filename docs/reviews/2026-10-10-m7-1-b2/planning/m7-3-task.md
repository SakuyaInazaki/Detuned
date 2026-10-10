# M7.3：全新有界无模型D01正式评审旅程（规划）

日期2026-10-10。root已定路线，不是实现/验收。必须先B2和M7.2接受封存，再M7.3 fresh/root dispatch。依据封存[B1只读事实](../../2026-10-10-m7-1-b1/planning/m7-3-d01-facts.md)。精确[owner候选](m7-3-owner-candidates.json)：0existing4missing，A作者3文件，D独验1文件，B只独审；不修改旧scale/deployment demo。

## 真实身份与材料

全新私有短寿命自有tmp，以真实API建立distinct A/B/C/R1/R2/V actors/groups。admin只控制器建身份、成员/凭据/profile，不分发普通Agent，不SQL假formal。V固定profile required d01-fixed且不获普通membership能力。全部网络sharedclient；不新core/schema/依赖或泛化executor。

1. A创建错误claim，B提交真实三点反例和完整failure（适用条件、证据、未排除变体、重试条件），B→A有效challenge保持open。
2. C通过真实search及固定引用发现，创建修正claim v1；原A只历史cites/失败证据，不作为成功证明dependency。正式target=C修正claim v1，依赖真实B反例/完整failure，准确声明A/B/C贡献者。
3. 独立server child和C worker，C保pending batch未ack时停止并真实重启二者，使用同一自有DB/secret，实际不同PID。pending batch/events原样重投，固定修订仍可读，再显式ack；不推断磁盘崩溃/backup恢复。
4. 真实静态M7.2固定runner候选/common/config完整assets清单上传，不执行下载代码。依实际冻结manifest及当前版本创建review，R1/R2独立eligible不同groups、非贡献者，request后各自新session。R1先提交complete后封存：R2读取失败，公共意见检索无正文；R2complete自动全员reveal。
5. 创建真实d01-fixed run，签发V一次verify token，经0600自有文件传给M7.2已接受runner独立子进程；不记token/raw issuer/私有绝对路径。runner仅固定材料，实际upload日志/submitreceipt；读真实pass、usable log、receipt/hash再finalize，不能伪成功。有限固定案例通过不称数学证明。
6. 记录accepted/current事实、immutable decision/receipt/hash。
7. 故意把C改为已知错误首次发现变体v2；B对C v2提交真实三点10vs2有效challenge。当前预期superseded且validity_reasons含open_challenges，遵实际优先级不强行断言challenged；旧v1 decision/receipt/hash保持accepted不漂，A原有效反例仍open。

## 有界运行与安全ledger

唯一CLI `--output <new-ledger.json>`；新文件0600/no-clobber，私有临时目录，独立server/C/runner子进程单步及总流程有界，真实退出，finally仅清自有资源。无keep runtime/VM/Colima/Docker/host/model/global配置，旧tmp不动。错误cleanup不掩盖原失败；bad output path不得clobber。

ledger仅安全IDs、修订、hash、事件元数据/计数、观察结果和限制；拒token/header/raw credential/绝对临时路径。controller不能盲目保存签发响应；不把帖文当指令。无需performance门禁，不继承旧20worker smoke。

## 三个独立观察checkpoint

新mjs导出 `runReviewedDemo({outputPath, observe?})`；CLI仍仅`--output`，不载入外部callback/配置。observe只供受信任测试的进程内回调，分别await于sealed、accepted、superseded三个既定checkpoint，server仍存活时独验可真实HTTP读取。context只含普通角色C/R2的只读client视图及安全ID/hash，不传admin/verify/token字符串，不序列化context；不得给予可写方法或其他角色权限。

observe返回值不驱动业务或通过判定，抛错保原失败并finally清自有资源，不用cleanup错误掩盖。不是泛化plugin/executor，不增core/API/产品接口。D三checkpoint独立查询封存拒读/检索无正文、真实accepted decision/receipt/log、superseded/open_challenges及历史不漂；之后仍运行真实CLI核安全output/no-clobber/子进程退出，不能只信ledger自报pass。

## 验收与证据

A作者测试真实新脚本；D独验读取真正output与真实HTTP事实/不同PID/子进程退出，不只信脚本pass；核pending重投等值、固定材料可读+显式ack、独立名单/封存不可读/无公共正文、真实runner/log/pass/receipt/finalize、v2superseded与open_challenges、旧decision/hash/receipt不漂。核0600/no-clobber与有限失败cleanup，不删旧失败/timeout。所有build/test/type/lint与执行由D唯一串行窗口；B独立静审。

不宣称实现、M7.3通过或完整M7完成；具体API冲突报root，不自行扩大路线/权限/owner。产品和当前正常文档不写，先前封存证据只读。
