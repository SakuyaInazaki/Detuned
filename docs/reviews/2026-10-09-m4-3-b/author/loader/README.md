# A M4.3-B 作者证据

源码固定5badb15009ae1756c3afe0ae0cef1faafc290ccc，owned `/private/tmp/detuned-m43-runtime.MU1a4q`；主业务/SQL/主依赖未改。交付仅launch/config/loader.spec三文件，原runtime.spec/preload保持。明确 `--suite plugin|loader`，默认plugin；仅loader runner增加`--expose-internals`与native built lib external，硬allowlist env保持PATH/CI/显式repo/source+suite。

## 首失败与收口（原日志不覆盖）
- probe-first exit0/1pass：真实Loader.internal、Timer、Hmr init/queue/rootdispose通。
- patch-first exit1：fixture错误在scope直接set baseUrl未provide；patch-second exit1：scope getter缺loader inject；只修fixture上下文。
- patch-third/diagnostic exit1：原package name从privateconfig无法native resolve，实际message留日志；官方root link有，但exports lib/index.js未构建。未用builtin替名冒充样例。
- compile-first：父授权官方tsc-b8目标沿40refs闭包，actualexit0/3.019s，新allocated7,696,384B；outputs仅各lib/types，compiler不跳真实错误。
- bundle-first：父授权受限config，actualexit0/0.768s，新allocated15,704,064B；**该产物非有效runtime**：patch-built-first suite SyntaxError，nodecheck识别Tools/lib/index.js:4644未lower的@Remote。
- bundle-second：父批准直接复用同SHA官方vitest.shared.ts standardDecoratorPlugin纯transform，无Typert writeBundle/codegen。actualexit0/1.488s；Tools nodecheck0，Tools/Loader/MCP native imports0；sourcehash与官方transformhash见final-source-protection。
- patch-built-second exit0/1pass1skip：官方mountRootInclude指定source baremodulebase，原MCP package name可native加载。
- loader-author-first exit1/1pass2fail：两主业务路径通过，但fixture finally只scope.dispose，rootLoader持有Include未remove，8工具仍存在；保此真实cleanup失败。修rootInclude remove/await→scope.dispose→rootfiber finally，并保证fixture.close在嵌套finally。
- loader-author-second actualexit0/3pass/4.15s；默认plugin唯一必要smoke actualexit0/3pass/2.79s；launcher nodecheck0。没有重复core/full/current29。

## 最终主case真实链

完整官方样例仅替私有URL/node/built桥/token-file，并在既有env加入pid-only observer；原name @deepseek-ai/dsh-mcp-client不变。官方loadOverlayPatches+mountRootInclude→Loader/Include，全部native同built图→精确八name stdout→真实registry context调用。发现时HTTP增量0、sessions0。

真实Hmr.watchConfig返回代表nativeChokidar ready；写privatepatch A tokenfile→B，官方watch真实2refresh（包含初始add），callback用官方parser+Include update+loader.await，不手emit watcher。旧在途poll实际进入服务sleep屏障后被重装取消，旧probe/servingPID退出，消费者ack_seq/active_batch_id与ACK请求计数不变；新registry publish DBauthor=B、space一致，A/B各仅1诊断session。session不是逐帖审计绑定。

收尾先watcherdisposer（真实close/drain）→rootInclude remove/loader.await→scope.dispose→rootfiber.dispose→每PIDexit receipt+kill0不存在→app.close/dbclose/private目录删除。最终6PID全部退净。失败残留owned目录已在failure-resources-cleaned逐个确认PID不存在后清理，无token归档。

## 可重复构建/运行边界

collect-build-closure.cjs读取官方compiler解析后的project refs/package元数据，build-closure.json40names/outDir/refs。compile-supervisor.py保存精确tsc argv；bounded-build-v2.config.mjs是完整受限recipe：采用官方通用entry/lib/ESM/node/es2024/dtsfalse/cleanfalse，Loader/AppBoot直接import官方local configs并保inline Include选项，40配置均挂官方纯transform。bundle-second-supervisor.py调用installed tsdown0.22.2，单次180s/新增1GiB/free6GiB监督，无network/install/pnpm scripts/desktop/native/provider。**同SHA源代码、官方编译器、受限构建配置；未运行全仓Typert生成或完整hostbuild。**输出由final-source-protection登记sha，14208tracked changed[]/lock保持原SHA。

命令：`node scripts/integrations/dsh-runtime/launch.mjs --source /private/tmp/detuned-m43-runtime.MU1a4q --repo /Users/sakimi/Desktop/Detuned --suite loader`；所有runtime run≤3min，private loopback已授权escalation。默认省suite仍原plugin行为。完整CLI/profile自动合成、模块代码HMR、模型认证均未验证。C独验/最终父验收另计，不用作者结果代替。

## 最终cleanup冻结v2

父要求进一步防单项dispose异常跳过后项：loader-cleanup-final在watchstop后，remove/drain/scope/root每项都尝试并收集固定stage；全部清理后才assert。实际3/3 exit0、4.09s，6PID自然exit+kill0不存在，无watchdog/强杀算正常。freeze-manifest-v2是最终三file，原manifest保留。默认plugin smoke仍对应相同launch/config（后续仅loader cleanup实现改动）。前失败残留PID在清退检查时已全不存在；failure-resources-cleaned仅记录观察到的absence与own目录删除，不猜此前退出原因，不称执行了未发生的SIGTERM。
