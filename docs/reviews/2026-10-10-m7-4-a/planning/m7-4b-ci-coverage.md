# M7.4-B CI归档探针退役覆盖事实（只读）

仅本新planning文件写入；未改CI/测试/产品/正常docs/compat或旧sealed，未运行任何检查/宿主。依据sealed M7.3 planning/m7-4b-delivery-facts.md，窄读旧两探针对应段与当前维护测试。

## 精确映射

当前维护文件为 `tests/integration/m0-m1-r3-regression.test.ts`，describe:16直接保T01–T11。beforeEach:70–77当前真实bootstrap/SQLite/injectapp，afterEach:80–83清理；T06是受控真实历史DDL迁移，不把它称普通CLI原地升级。

| 旧探针意图 | 当前case起始行 | 关键断言行 | 已保行为 |
|---|---|---|---|
| T01 | tests/integration/m0-m1-r3-regression.test.ts:86 | 126–131 | resolution存在、id/全对象等值、relation版本等值且2 |
| T02 | tests/integration/m0-m1-r3-regression.test.ts:134 | 155–170 | thread先v1，PATCH后原key重放仍v1/原title |
| T03 | tests/integration/m0-m1-r3-regression.test.ts:173 | 177–186 | 受控fullJSON旧space cache，201/原revision1/slug |
| T04 | tests/integration/m0-m1-r3-regression.test.ts:189 | 197–209 | empty allowed_space_ids，枚举空、direct context403/404 |
| T05 | tests/integration/m0-m1-r3-regression.test.ts:212 | 239–256 | 同keyredaction_id相同，audit/event各1 |
| T06 | tests/integration/m0-m1-r3-regression.test.ts:259 | 289–317 | 冻结historicalV1 DDL/命名列copy/FK0，bootstrap不增credential/新admin且cache去正文 |
| T07 | tests/integration/m0-m1-r3-regression.test.ts:323 | 326–339 | future999 bootstrap抛错，tables前后等数 |
| T08 | tests/integration/m0-m1-r3-regression.test.ts:345 | 361–384 | ACL epoch变化后poll/ack均409 RESYNC_REQUIRED，consumer深等值 |
| T09 | tests/integration/m0-m1-r3-regression.test.ts:387 | 405–432 | controlled fetch在途，abort转发、reject、fetchCalls1 |
| T10 | tests/integration/m0-m1-r3-regression.test.ts:438 | 446–477 | controlled response json阶段仍可abort转发并reject |
| servefuture999→T11 | tests/integration/m0-m1-r3-regression.test.ts:483 | 486–538 | 真实currentDB添999，builtCLI --json serve，8swatchdog，无listening、未timeout、actualclose非0、schema/version999诊断 |

T09/T10明确controlledtransport，不是installed Pi/native/model认证；原探针这两项同样受控fetch，并非native额外证据。T06:303–308核无instance_metadata/thread_versions与FK0，避免混版本合成库；315–317保credential数量/adminToken null/cache正文脱除。T11:524–527真正await close/error，532–538保原拒future/不监听/不超时原意，非仅classifier单元替代。

## 已运行证据与源码差异

sealed M7.3 verification/core-once-first.stdout.txt:333实际记录该维护文件11tests passed；:439–440为唯一154files/964tests passed。root已接受M7.3原receipt/stdout/report，不是本次运行或根据源码猜pass。新增M7.4-A未据此宣称通过。此维护文件实际当前SHA `7d17b6b88246f1522ec2e41572556fb6a4610ac8350cda5b838a0af59d804427`。

CI .github/workflows/ci.yml:27–40已有install/build/type/lint/pnpm test:all；rootpackage.json test:all=vitest run，vitest.config.ts仅exclude default/docsreview/dsh-runtime/web，不exclude tests/integration，该11例自动包含。pnpm-workspace含packages/*/modules/*，构建在测试前；T11实际调用packages/cli/dist/index.js。

区别应如实保留：旧check-invariants导入builtserver/storage/client/Pi，维护T01–T10经Vitest alias读src（其断言行为等价），T11是builtCLI真实子进程。退役归档脚本不会保留那份独立built-inject重复运行；但原T01–T10业务/受控transport与servefuture999意图没有缺失，不需要复制11个同实现断言的新测试。

## 可操作结论与真正限度

就两条旧probe的原意，可由现维护test:all保全部11项，允许root选择只移除workflow:42–45旧archiveprobe步骤，旧脚本/历史证据原样保留；本报告不是workflow写入授权。保持构建先于test，不能删维护11例、改断言或仅用源码grep代测试。

没有发现原行为覆盖缺口。T11失败清退finally:540–543仍kill而不await后续close，属于故障路径cleanup质量差异，不是future拒绝覆盖缺失；旧standalone也有同样弱点，不能据退役宣称其失败cleanup已升级。另install/freshlocalstartup/当前Dockerclosure/四native完整认证不是这些11例承担的范围；root已单列delivery事实，不从本映射自动新增宏大功能或重跑性能/浏览器。
