# M5.2-A 作者服务端 TLS 冻结

公开ServerTlsOptions={cert:Buffer,key:Buffer}、loadServerTlsOptions(certPath,keyPath):Promise<ServerTlsOptions>，AppOptions.tls可选，ServerApp为真实FastifyInstance<http.Server|https.Server>。旧HTTP调用保留；TLS直接bytes有界/复制/createSecureContext预检，Web须https origin，冗余loopback flag不降Secure。唯一binaryloader每文件1MiB/max+1、O_NOFOLLOW/O_NONBLOCK/sameFD regular前后stat及finally close，安全400固定文案，无用户证书/default/passphrase/全局信任操作。

HTTPS直接maxHeaderSize65536与minTLS1.2，不把HTTP option当HTTPS有效保证。TLS专属connection从原始TCP覆盖未ClientHello连接，现preClose先同步业务cancel→await真实资源finally→drain原始sockets；onClose移自有listener。app.close后DB/锁仍由原CLI，未改HTTP清退/预算。没any或HTTPS转HTTP伪cast；首类型预检helper参数仅HTTPS不接受union，改真实union后无需增加route等其它owner。

## 作者检查实际组合

- 首 `node node_modules/vitest/vitest.mjs run tests/contracts/server-tls.test.ts`：TLS01 loader/TLS04兼容通过；TLS02/03因sandbox loopback listen EPERM未执行。实际runner1，原日志保留，不称产品错误。
- 第二受管require_escalated，仅 `-t 'TLS02|TLS03'`：两组通过，私有127.0.0.1+临时CA/SANleaf，未外联/改信任。
- 第三仅TLS03：补runtime lease cancel barrier，cancel触发后socket尚未销，真实finish后关闭完成；通过。不是用watchdog或client主动提前关闭制造清退。
- 第四仅TLS02：TLS1.1客户端明确min=max，防客户端max<defaultmin预拒冒充server证据；通过。真实CA/hostname正反、输入Buffer突变不影响server快照、20KBheader成功/66KBheader431。证书/key仅临时，不写仓库/log。
- Preliminary package类型首2仅helper union诊断保留；source aliases含newtest/server noEmit首0，最后两新增test精度条件后最终noEmit0。命令/实际exit独立文件，stdout含elapsed；不是根package/fullgate已运行。

四组最终是首TLS01/04+末TLS02/03组合，不称一次首次4/4。所有OpenSSL同步child已reap，testafterEach app/db close，afterAll私有证书目录删除；额外只读确认自有prefix剩余0见cleanup-check.json。没有build/full/browser/current29或用户auth/模型。D负责真实CLI SIGTERM/DBlock、HTTPS浏览器/完整独验，作者app.close不冒称CLI退出证明。当前包README实现中、progress仅一句在做，E2接受结论保持。
