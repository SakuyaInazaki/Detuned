# B CLI 与固定历史 runtime 交付（待统一build/独验）

固定fixture tests/fixtures/runtime-fa1b35c五文件来自完整commit fa1b35c80de02c1d601288847706495062935925 的44个原TS business sources，仅薄entry强制临时显式secret与依赖解析别名，不currentcode/DDL/dist。manifest含逐source/bundle/generator/entry hash、工具与外依赖版本；正文bundle无source-map/minify，第三方normaldeps不vendor。普通回归直接import归档，无Git/再生/网络，fixture-inspection.json核无忽略/机器或.pnpm路径/数据库。项目license未决如实记录。

有限同路线proof原attempt均保留：first pnpm lexicalcreateRequire不见vite；second bundle成功但沙箱loopback EPERM；third完整旧HTTP已执行，最终输出读取actor返回shape错误；第四纠正wrappershape后exit0。第四390.6ms，旧bootstrap真正schema1、HTTP actor/space/thread.patch version2/postrevision2，DBclose/reopen旧server再read，真实无thread_versions。每attempt30s watchdog，child均reap，私有目录finally清。未更改旧business语义，无真实用户凭据/secret输出；不是四条独立formal或四次workspacebuild。

CLI migrate --offline/data-dir/output/admin-name/timeout-ms接线，新UpgradeError2/1稳定映射，SIGINT/SIGTERM Abort及finally移listener；本地不getClient/tokenfile/网络，成功直接打印A七项snake_case含一次token。A业务/复制/迁移/provenance不在CLI复制。

新正式 tests/contracts/m3-offline-upgrade-contract.test.ts 三项：固定bundle/hash/显式secret/schema1一项已source定向通过；另外built真实oldHTTPthreadpatch→CLI升级和参数门禁两项未跑，等C统一build。before-cli.log旧built unknown migrate说明新增能力尚不存在，不把缺import/编译失败当产品业务反例。A导出就绪后唯一必要源码alias含CLI noEmit exit0（source-noemit-cli-ready.log），覆盖当前源；不是workspace typecheck；未fullsuite/安装/lock修改/git提交/全局配置。新指南/docs04同步legacy thread history缺口，不回写旧B2归档。

## 统一built后夹具oracle窄修

C首newtargeted的UP B02期待完整旧成功缓存只有[2]失败，实际[1,2]；这是本文件未同步已明确因果的fixture oracle缺陷，不是产品故障。父批准只修该expect为按version排序完整[1,2]，保current version2/title不变，不删除早期版本或放宽比较。该case没有import/provenance断言，history_complete true适用于完整history导入后的metadata，由A/C对应覆盖；本case不扩成另一闭环。人工删creationcache的稀疏[2]边界另外A/C覆盖。原source1pass2built skip及C首失败日志保留，B未自行跑build或重跑测试，C统一定向B+C。
