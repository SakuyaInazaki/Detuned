# M7.3 B独立静审（A v1）

检查仅静态，未运行任何脚本、测试、build/type/lint/syntax或宿主。A freeze SHA256 `a78d0c7e94981a7573d5338ff904bcec961c5ba272fee0cf866692156f5a1712`；source.diff `dac8bd6b7bfdbe4cb9b05f7b28549ea97c6b5cca0ddaea8d09c0e664cdc03a81`。三实际文件hash/bytes与freeze全部匹配：

- main `d22b219dffe461b3c593043efde1fce5539855c5eb637fcfef3db590bcb2e289` /19912bytes
- worker `3d4387eeacd025cb291e86c0514a23fd40ed91504dc894438befbb6ce3c40303` /2398bytes
- 作者test `79af43397011bac711fbe8876bee1f35bcf6db143e98ef9373f73cef8d0aca31` /3031bytes

依据sealed task75e026、fresh boundary及signal addendum；完整读三源码，窄核sharedclient签名，并读D初稿对真实HTTP/CLI/取消观察的分层。D初稿未执行，不把其断言视为运行证据。

## 可行动发现

1. main20–24的owned-child完成路径没有满足actual close。closed以exitCode/signalCode非null直接resolve，而Node exit先于stdio close；stop因此可早于close返回/清目录，command也可能过早解析stdout。正常C close→restart未断言close0/无signal，server只有exit0断言。track未消费child error，spawn/fork资源失败可出现未捕获error绕过统一finally。Root已接受同根修，交A缓存actualclose completion、消费error并正常C/serverclose0；保原预算。没有运行红例或验证修复。
2. main15绑定external signal listener，16创建45s deadline并await mkdtemp，try直到33。mkdtemp拒绝直接退出，finally不会清timer/listener，45s timer会保活。已报root；候选setup同一try/finally或窄catch释放timer/listener并保原错误，不操作未创建目录。此为静态故障反例，未执行。

## 其余已核事实与限度

真实API建A/B/C/R1/R2/V，V service无membership；普通token仅read/write限定space，admin只控制器。C worker真实search/fixed failure读取、cites历史A与failure；正式targetC v1依赖B note/failure，声明A/B/C；没有SQLformal。完整knownliteral六assets经普通upload冻结，runner为已接受固定local脚本，不执行下载。request后独立R1/R2session；封存R1读取失败与publicsearch空、R2后两publicrows；真实run/onceissuer/private0600tokenfile→runner→实际receipt/loghash→finalize。

重启同data-dir/port保同DB/secret，实际PID比较、pending batch/events深等值、fixedrevision读取后显式ack；close问题见上。后续C v2+真实B10vs2challenge，按实际优先级superseded/open_challenges，decision/receipt深等值；原B→Achallenge由existingfailures精确ID投影，不伪造或关闭。

observer只冻结C/R2读closure及安全IDs/hash，无admin/verify/token/client/write函数；返回值忽略，throw保原错误进入finally。所有主HTTP带signal；IPC/ready/command/observer等待有预算/abortwrapper；取消ownPID200ms、正常1500ms并保原错误，但上述lifecycle修复待审。ledger没有token/header/rawcredential/绝对tmp路径；output先lstat拒既有文件，再0600wx staging+hardlink无覆盖发布，cleanup在publish前。58固定cases不是数学证明；无模型脚本不证明AI研究增益。

DJ01真实旅程与checkpoint断言/DJ02既有输出不覆盖；D初稿另真实HTTP、CLI与observerthrow/abort，可覆盖正常和取消路径，但资源启动错误/目录创建失败尚无执行证据。D独占runtime，B不改A/D产品。当前结论：v1有以上lifecycle阻塞，等待A v2实际delta后窄复核，不扩大同源审查或timeout。
