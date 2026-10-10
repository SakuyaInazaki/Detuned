# M7.2 A源码独立静审

日期2026-10-10。绑定freeze SHA `e879c34c6c46cf0a7b2cad95b2e18b3e4ec42febf01f933e1da60b7383857c69`、diff SHA `480af0c95041885a88381d3ea3c380b05543a43d69597e309a97aa53ec49ee2e`；九actual文件SHA/bytes全部重算匹配，catalog七literalpins逐个与actual源码SHA/bytes匹配（包括runner），catalog自身不自哈希。只静读code/tests与既有client边界，没有运行算法/CLI/build/test/type/lint/noEmit。

1. assets(descriptorOrId)仅按id查本地冻结descriptors；其余传入对象属性被忽略，roles/path取模块私有literalpins，无manifest路径/任意本机file读入口。两个candidate静态imports，reference独立Bellman-Ford，下载bytes仅比对、不write/import/eval。
2. preflight pending run/space/id/snapshot/name/hash与actualcanonical JCS绑定，profile唯一config/verifier匹配；descriptor匹配要求精确六roles（一个candidate加reference/checker/cases/config/runner）。总长度相等、每role匹配恰1、全部artifact在localset，extra/duplicate/missing/both/ambiguous拒绝；随后实际scoped下载length/SHA/逐字节核。config pinnedSHA与profile/run一致。真实server已核request/snapshotintrinsic，runner不另猜业务公式；无getMe/session/rawfetch。预检失败位于upload/receipt之前。
3. 固定5案例+24seed生成，original/reversed共58<=128；显式0权、parallel/equal、unreachable、单点和10vs2反例。32/1024/safeinteger验证；candidate和reference/allvariants共用一个budget，边扫描/heap循环/add都有显式step，safeadd拒溢出，1e7资源错误分类error。fixedmismatch为fail而非环境error，未知candidate/异常输出/资源错误不伪pass；任务未要求benchmark。
4. verifyAndSubmit afterPreflight只无参数调用，返回忽略，位于预检后try，同步throw转受控EXECUTION_ENVIRONMENT error；不能替换candidate/seed/resource/hash或正常suite返回。CLI根本不接受hook/可执行配置，允许七固定flags，client固定scoped方法wrapper。此是受信任进程内测试边界，不是论坛执行接口。
5. 真log bounded65536、safeIDs/hash/limits/provenance/selfreportedtimes，无token/本地path/header；upload后真实receipt，pass0/fail1/error2。网络/日志/receipt失败向外抛，CLI安全固定错误submitted:false，不称run状态成功。只有同一sharedclientcall重试保持Blob/body/key；新进程新instants/文本不能复用oldkey伪recovery，terminal预检拒。
6. CLI statpermission+既有resolveLocalToken读取regular/O_NOFOLLOW/O_NONBLOCK、<=64KiB/UTF8/前后metadata；signal传每网络方法且finally摘监听，所有网络sharedclient。安全输出仅receipt/run/log IDs和result，异常不dumpinput/credential。进程有固定suite/HTTP预算，实际退出与资源验证仍由D。
7. FV01纯算法/资源边界、FV02真实TCPpass+终态拒、FV03真fail/受控环境error、FV04extra材料零写、FV05短寿命CLI/安全secret输出；五作者case未运行。identity SQLfixture只actor/membership，成功formalstate走真实HTTP服务，不把作者样例称四host/model或完整D01。独验更广故障/response-loss/oldkey覆盖由D运行证据判定，不仅凭源码称通过。

结论：未发现当前批准执行链的可行动阻塞，可交root/D有限串行门禁。所有产品保持freeze，B无产品owner；M7.3仅规划，正常metadata尚未写。
