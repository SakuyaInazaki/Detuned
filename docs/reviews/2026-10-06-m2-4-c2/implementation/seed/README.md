# M2.4-C.2 seed单元 v3交付

父冻结v1并批准因果v2与规则合法v3，所有证据保留，当前三交付路径SHA256在freeze-manifest.json；没有产品/SQL/schema/DDL/旧tests/规范改动。新scripts/scale/seed.mjs、tests/fixtures/scale/recipe.json与README可重建；planning/seed.md为批准边界。配方来源是当前批量fixture，不是100万HTTP成功。

## 实际生成

所有命令记录于*.command.json，对应stdout/stderr原字节保存；无生成失败或首错误隐瞒。node --check seed.mjs各版本exit0，不build/全suite/模型。v1首smoke透明snapshot仅预检；父发现因果不足授权v2补thread openv1→archivedv2及space无pins rev1→最终fixedpins rev2事件，扣post revision保精确总数。v2首/最终两smoke数据库logical与physical hash完全相同，中文miss1/2/3字类别及 known-bootstrap-token/hash/secret流式scan窄修记录。v2单条规则>500经独审指出，父准v3保总内容拆成<=480UTF16合法rules，并加入当前Create/Patch Space与每Post create/revision request schema验证；原v1/v2脚本/recipe/日志及输出保留，不冒最终。

v3 tiny输出 /private/tmp/detuned-c2-seed-smoke-20261006-v3-a1，1000posts/9914postrevs/10000events/40threads/40relations/21actors含20client/20sessions，0credential/0consumer；首生成0，并由独验窄核24rules最大480UTF16/总9638字符、spacehead2与字段约束通过。

父条件放行full首跑exit0：/private/tmp/detuned-c2-seed-full-20261006-v3-a1。
- baseline.db 931,082,240B（约888MiB），41,661ms生成。generation.json保精确启动/结束/elapsed；不是负载吞吐/响应性能测量。
- 100000posts/997898postrevisions/1000000events/1000threads/1000relations/21actors含20普通clients/20sessions，0credentials/0subscriptions/0consumers，spacehead2。97,898Post head10、2,102 head9；100archived thread有openv1历史+updatedv2。
- 完成free21,355,081,728B；各batch statfs、VACUUM前后free均>=6GiB，DB<=2.5GiB。未预建运行副本，runtime<=8GiB由runner执行前后监测，不冒seed单元已完成整个运行空间验证。
- manifest.json/discovery.json/oracle.json/generation.json位于同目录，公开小JSON原字节复制full-v3-*.json便于审阅，巨量DB仅隔离临时输出，由持久recipe+脚本重建。一个full生成，不再拷贝第二大库自验。

## 不变量及接口

每Post完整create/revision schema+stricttyped验证，body最新90%384B/9%2KiB/1%16KiB、historical128B；hash真实title/summary/body/canonicalstructured，五字段文档另hash/bytes。所有固定summary source时间不晚于summary，关系两端固定version存在，event对应PostRevision时间/唯一空间seq，版本/归档/pins因果完整；FK/integrity、精确counts、所有revision raw内容hash、FTS一Post一row且与active当前head字段完全等。logical_sha256逐表稳定order流式算，DB物理hash流式算；已清凭据/secret并VACUUM新档known-byte扫描。

20普通client manifest含非秘密actor/session/consumer_key、独占write_thread/revision_note/current_head；runner运行副本注入临时secret/credential，warmup后真实context checkpoint→subscribe新consumer。只有discovery.json（space/query/task无答案ID）给新session；oracle与manifest refs为运行器/后验比对，不喂发现进程。D01同thread failure7与summary8，人类query C2三点反例，source0为client0可写note且baseline当前ref可后续真实HTTP更新；source跨threadfixed1保留并可显示历史来源更新。

## 已完成与未运行

tiny自验/v3规则窄独审已过；full先由作者完整seed oracle通过，独验readonly audit正在进行，不能自验替代独验。full路径已即时交父/protocol/verify。全repo/current29/真实T06/600秒20client测量由另两单元执行；本单元没有运行或预填性能通过。目标2CPU/4GiB/SSD硬件未认证，实际主机环境另记录。cross-review-verify.md仅静态信息边界复核，新formal/verify-session未由seed作者运行。

无commit/push/reset/clean/安装/用户DB/global/真实模型/deepseek-brainstorm；旧证据/archive/历史fixture/node_modules/dist保留。generator/recipe/README冻结后不再改；发现真实故障报父最小修复另立版本。
