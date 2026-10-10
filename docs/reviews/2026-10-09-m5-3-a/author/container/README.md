# M5.3-A 容器作者交付

所有权仅Dockerfile/.dockerignore/compose.yaml、deployment的container-health.mjs与README、examples/deployment.md、独立deployment.yml。无锁/原CI/SQL/业务修改。本机实际固定Colima0.10.3/Lima2.2.0自有VZ，2CPU/4GiB/root10+runtime10GiB，使用`docker-environment.json`的明确ownedUnixsocket和新空Dockerconfig，不用用户context/auth。VM无主机mount/业务TCPforward；不影响其他VM。

## 实际构建与失败保留

- 固定官方arm64 platform digest pull成功；network-none基底Node --version实际`v22.23.3`，Dockerfile完整tag与digest对齐。
- 首build exit125/0.182秒：未装Buildx，legacy builder不接受--progress；尚未发送context/安装/编译。根准只去掉该flag。
- 第二build exit1/11.499秒：DebianCA/openssl安装完成，npm把同一/dev/null用于user/global配置判double-loading。根准两份不同空rc，不读用户rc、不改版本/锁/资源。
- 第三build exit0/129.563秒：context3.614MB；pnpm11.7 frozen ignore-scripts/ignore-pnpmfile完成32.1秒，407packages；仅esbuild0.28.2显式postinstall，SQLite13.0.3随包Linuxbinding真实内存SQL1/close通过；全workspace build通过，最终runtime生成。已保旧pnpmfile-state警告、Vitechunk警告，未改配置抹警告。
- 成功builder层直接tag，不再次读变化中的A脚本或重编。runtime ID `sha256:4a9168b405b2521ee4114d79ab48c4008d9d048fb9faea3f116677495c491cba`；builder ID `sha256:c085ace64bf18dead58e77bdfdf6046bfe3b1897d53b356dd6da653d47f313ef`。
- network-none runtime CLI --version exit0；runtime native smoke exit0实际uid1000/Linuxarm64/SQLite1/closedtrue。首image-inspect模板对builder不存在User字段报错，白名单解析的corrected inspect exit0，保原错误；非产品失败。第二失败build的精确容器ID已rm0；所有作者run --rm临时容器退出，无作者服务/volume。

首次cold起点与修正组合共约141.244秒实际build时间，不称首跑全过或一次无错build。没有清缓存假造cold。pnpm锁原字节未变。基础image与依赖公开下载，不使用registry登录；没有上传/发布镜像。

A静态互审发现初版默认Compose health的HTTP Host仍127:3000，与Web origin localhost:8443冲突。这是源码可达finding，作者没有伪造实际403日志。根准健康探针接同一--web-origin并取Host authority/证书hostname，连接仍loopback/严格CA；原server不变。仅COPY该脚本的新runtime层1.911秒exit0，复用原编译/安装，不重全workspace。最终D测试标签为`detuned-m53-owned:runtime-v2`、ID`sha256:2190f6a9739816322aee3164691acc2ec53d70da7dd7f7801ce2892fa43fcbc2`；health源码SHA`603d2501b18af3325692e8b60324e3b2bb1f4432f6644b1470b1e9b96040a8d7`。原runtime保留，D将实测正反Host/CA。最后只补context排除token文本/凭据JSON/npmrc，不改变实际产品或运行镜像。

## 检查及独验交接

container-health.mjs `node --check` exit0；安装版yaml2.9.0 parseDocument(uniqueKeys)解析compose及workflow exit0。本地guide链接检查见static-checks。真实HTTPS/CA反例、whole-volume persistence、restore、D01与Linuxcoregates由D独立验收，作者不冒称这些已运行。workflow仅workflow_dispatch，GitHub官方[arm64 runner文档](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)支持ubuntu-24.04-arm；本机未运行GitHub Actions，不发布或push。

`.dockerignore`明确排除review/私有运行材料，保一份明确凭据-free历史legacy.db fixture；runtime仅必要产品dist/manifest/链接和完整LinuxNM、Webdist、healthhelper。builder含必要tests/scripts用于DLinux验证；A在构建期间的d01脚本不是最终freeze输入，D可cp最终脚本到自己测试容器。旧typed-writes依赖两份review内legacyservice，D需仅cp准确旧fixture，不将全部reviews加入产品image。

保留镜像标签`detuned-m53-owned:runtime`与`:builder`供D，VM/root/socket仍为TLSplanning记录的owned环境。D只能操作自己新命名的测试容器/卷；最终清理应按确切ID/名删除自己资源，不global prune、不管理用户context。root仍需后续Docker/部署教程/干净安装与恢复出口验收，不把本构建等同完整M5或公网部署。
