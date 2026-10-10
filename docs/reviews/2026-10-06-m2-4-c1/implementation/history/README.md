# H-R1 实施交付：可持续历史 HTTP 兼容回归

2026-10-06，实施者自验完成，等待其它 Agent 独立验收。产品服务、schema、旧正式tests与旧capture/evidence不修改；H-R1仅新增获准文件。

真实旧来源是b8dacd56779a007a2e7045b682bca0c036fdfc44已提交dist，不是失踪原M2.1临时DB。旧隔离树192 package.json/dist文件逐字节校验，6内部@detuned ESM解析全部指向隔离树；外部仅链接现已装依赖。真实旧HTTP3×201，payload request_hash均与原公开记录相同，而实际对象ID/resultRef来自新生成。source/provenance精确绑定旧commit及新生成事实。原232产物对候选111同/97异/24缺失保留，不能称原同版恢复。

持久fixtures包括recipe.json、legacy.db、expected.json、provenance.json与README。旧DB关闭/检查点后删全部credentials/token_secret，VACUUM INTO新DB，并对原token/secret/token_hash做禁止值扫描。原business/event/idempotency行不变；无明文/hashed credential或持久secret。所有自建生成临时树finally删除，随后独立新进程直接用持久包跑当前HTTP。

最终新专项 **7/7**，source alias `tsc --noEmit` exit0。三个原key201严格固定结果深比较（唯一明确动态字段post current head），原hash/ref/revision/body/structured/contenthash/editor/time保持、无重复business/event/idempotency；新key严格400，revision原expected先stale409，仅改current expected后同bad structured400；改payload同key409；重启三重放；两post脱敏三固定ref明确墓碑字段/hash sentinel+stored hash保真；运行时凭据撤销三401 UNAUTHENTICATED。

命令实录见commands.json，before与首失败全部保留：

- formal-before真实显示持久expected.json缺失，7项失败，仅新专项不是旧失踪脚本ENOENT重试。
- generation-first使用CJS require.resolve遇旧import-only exports；second是macOS /var→/private/var严格树边界别名；third是自有idGen方法名generate误写（实际Port为generateId），旧space500；fourth三HTTP/秘密清理已完成但git全文件树超过默认1MiB输出buffer，部分无秘密材料保留；fifth完整exit0。每次只修新生成器，旧字节/产品不改。
- formal-first5/7，两个自有期望错误：墓碑projection content_hash是redacted、401 code是UNAUTHENTICATED；formal-second7/7，完整明确墓碑断言与stored hash保真加强。
- source-types-first的inject unknown payload不符类型；second收紧data类型后head可能undefined；third类型通过。final正式7/7核最终类型/helper守卫版本。不把这些fixture/类型首错说成产品问题，也不声称全流程零失败。

实际生成环境Node v26.3.0、pnpm11.7.0；外部已安装fastify5.12.5、cors10.1.0、TypeBox0.34.52、better-sqlite3 13.0.3等实际版本见execution-environment.json/provenance。这是旧内部代码隔离运行，不是完全复原当年外部环境。普通新formal仅读取已归档DB/expected/provenance，不调用git或网络；只有再生成路径需要固定Git对象和已装外部依赖。

没有workspace build/fullsuite/安装/模型。唯一新formal文件将纳入C.1最终一次fullsuite实际计数，不能将本单元定向重复累计成独立正式测试数。

## 独立执行入口

生成器支持sole optional显式输出目录：先在新目录放recipe.json，再 `node scripts/history-fixtures/generate-b8dacd5.mjs <new-output-dir>`。无参数默认tests/fixtures/history-b8dacd5；已填目录拒绝覆盖。具体重建说明在fixtures README，绝对路径仅diagnostic不是依赖。独立验收可另建新目录重新真实旧生成，核其provenance与sanitization，再运行持久包7项专项；不得修改冻结fixtures来假充通过。

freeze-manifest.json列7个获准交付文件hash；本实施记录与首脚本/日志保存实际首失败，交叉审查与独验应分开列。H-R1恢复的是三类新的真实旧版本可重复兼容覆盖，原capture审查事实保留，不需再把原临时材料缺失作为当前工作阻碍。
