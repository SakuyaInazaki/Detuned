# M2.4-C.1 父统一接口与迁移冻结

2026-10-06，freshbaseline129source/36currentdocs/5mutable、2677旧证据/4SQLarchive/2schema、dist208+48。父已批准真实before后随即实施，无须再次等待放行；行为唯一为B.2.2/next-task.md。

protocol新增ContextFocusThreadSchema/ContextFocusThread（search.ts，完整现Thread metadata/title无新写长度限制），contextDataFields仅可省略focus_thread。included/omitted/Page/Envelope及build/serialize/bytes原签名复用，无focus不出key，focus成功必需metadata由core保证。新增validateToolContextParams是同源纯结构，不复制业务，拒未知/空白/非字符串，合法无focus保持，仍8工具。

core持两窄Port：listOpenChallengesForThread(spaceId:string,threadId:string,limit:number):Relation[]；listPublicEventsForThread(spaceId:string,threadId:string,atOrBeforeSeq:number,limit:number):Event[]。SQL筛选/顺序与metadata/highwater snapshot沿父任务书，禁止DDL/migration/泛化。

旧contract仅m2-context-contracts C03原72/76授权迁移：不存在字面thread从400组拆404，tool同404，补真实ownthread200；空/重复/unknown/budget保持400、无focus形状不变。core integration由core独占。原A probe原字节不改，明确unsupported400历史冲突交独验版本化。不build/fullsuite，只新focused+迁移旧context contract及sourcealias noEmit。首before EPERM、真实loopbackbefore及F01首红证据保留，最终独验统一build后跨入口验收。
