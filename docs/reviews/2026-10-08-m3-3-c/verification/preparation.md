# M3.3-C 基线与独验准备

2026-10-08，只读准备；路线和技术 API/fixture 仍等父冻结，不创建产品或测试空接口，不 build/运行 suite。C 独占本包 verification 与后续独验/README 验收区。

fresh baseline 实际 HEAD b8dacd56779a007a2e7045b682bca0c036fdfc44，source/config/tests187、docs41、mutable5、旧 review3887（包括 B.2 完整124文件）、SQL/archive4、schema2、tracked dist208/untracked100。dirty2716逐文件保存在 baseline.json。上一包436/51/current29只历史，不当本包通过。

## 独立矩阵建议（待父冻结）

1. 固定真实 schema1 旧提交运行时独立进程建立/读取空间、正文修订、关系、合法登记 ready 附件、旧凭据与真实可用旧 cursor（需旧 API 支持）；停止旧服务，offline CLI复制到新目录且仅副本升级，然后 current HTTP 进程确认版本2、历史/附件保真和新普通身份写成功。原 actor 新 token 可正常 API，但旧 cursor 拒绝；不得只看旧 token401。新 poll/pending/ack 按父确定旧/新消费兼容范围断言。
2. 原 schema1 实例/原外部 secret 配置留存，匹配旧 runtime 再真实启动，读取升级前研究数据与附件、schema仍1；新副本的后来写入不混原库。成功 checkpoint可能改变物理DB布局，不要求成功后DBhash不变；用业务/hash/原权限实际可读证明 rollback。原库是保留实例回退，不包装成 current2 backup逆迁移。
3. 活服务合作锁、坏/未来 schema、坏登记附件/hash/路径/软链、已有目标拒绝；坏源与旧目标不修改。只测父支持的真实 schema1路径，H-R1 sanitized schema2 archive不能代替旧凭据/secret支持。
4. 固定阶段屏障取消/迁移事务/publication持久点故障，源业务保留、半成品 gate拒启动；post-unlink双sync故障完整但durability未确认边界继承精确措辞。仅实际hooks固定IPC，不造CLI故障flag，不扩backup格式、attachmentbytes入口、逆迁移或恶意无锁writer保证。

## 当前事实/风险

持久 historical-v1-schema.sql/ts 注明源 fa1b35c，与当前 HEAD不同；只读 git log有该对象。但实际 git ls-tree fa1b35c四package dist为空，旧server/storage dist文件 git show不存在。这是旧匹配运行时打包缺口，不是产品运行失败；尚未尝试编译、安装或生成fixture。可以由父确认隔离旧源的必要编译与已安装外部依赖边界，保存精确commit/源码哈希、internalpackage resolution/secret配置事实，然后执行真实旧runtime；不能用当前 bootstrap人为造旧成功。

b8 H-R1历史archive已去credential/token_secret且名字legacy.db不等于schema1；不得改原archive/DDL/旧证据。原外部secret必须由真实旧源码确定，token/secret仅私有fixture与内存，日志只字段、布尔与非敏感hash。实际旧source权限/附件字段支持若不足，应报具体限制再由父裁定，而非私自替换路线。

未运行：build/typecheck/lint/new tests/fullsuite/current29、旧runtime/恢复/大材料/600s/模型/外部网络推理。窄读一次shellglob无匹配与两次gitshow旧dist缺失均是只读定位，不算验收尝试。
