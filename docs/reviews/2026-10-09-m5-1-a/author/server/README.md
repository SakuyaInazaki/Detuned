# M5.1-A 作者 core/server

进程内hash-indexed Web auth会话默认30min绝对TTL、1000实例/8credential；只human，crypto32bytes cookie/独立CSRF，credential/actor每次refresh，ACL仍core。WebSessionService.admitLoginAttempt是独立120/min burst20整数桶；HTTP onRequest在可信Host+Origin之后、body/credential解析之前一次扣额，login不双扣；trusted内部caller明确先admit。getMe共享原100visible数据语义。

buildApp默认Web关；显式webOrigin/allowInsecureLoopback配置，严格Host/Origin、cookie/CSRF重复畸形有界拒绝；混Bearer/cookie400，cookie mutation要求Origin/CSRF。auth/cookie响应onRequest设置no-store含失败。同源CORS允许原业务methods，无信任代理。CLI两flags启动资料前复用公开server resolver；HTTP insecure要求listener确为loopback。library调用者负责实际loopback监听。无SQL/迁移/锁/新依赖。

## 实际作者验证

- 首source两文件11项：core6pass，server4fail（无正文Fastify body schema也拒绝）。保source-first日志，登录route attachValidation仅允许undefined，其他invalid严格拒，未删schema。
- server第二：4pass1fail，fixture普通human误发admin-only space.create；改正常member thread.create，权限断言不放宽。
- server第三：4pass1fail，新增ACL用例误读不存在的GET space；改真实revision读取；WA04第四仅1pass/4skip。
- 父精确admission前移后变更组source-admission-final：11/11 exit0。
- 含所有新test/CLI source noEmit首0；随后收口URL会规范数字IP的问题，仅严格loopback配置窄修，WA05单例1pass/4skip、noEmit-config-final0。未把这些说一次首全绿；所有firstfail保留。

作者使用真实私有SQLite+Fastify inject，不称浏览器或原生网络旅程；B/D真实HTTP另验。未build/full/current29/安装/模型或用户配置。11源/test文件freeze后停止产品与test写。关闭仅清Web认证状态，不改变B2业务资源drain；已准入业务不保证logout回滚。

## D root input反例后的授权v2

D W4证明GET未知query被接受、DELETE存在body可撤会话，原反例/首freeze保留。仅routes/auth落实三route共享WebSessionQuerySchema；调用既有emptyquery helper，固定safe错误，不回显键。DELETE依据protocol WEB_AUTH_INPUT_POLICY.logout_body=absent拒任何存在正文，再执行业务。POST保body schema，attachValidation例外只容许body===undefined、validationContext body、唯一空instancePath type/object的缺省错误，其他schema错拒；query显式先验避免Fastify只报告首body错掩盖query。

新增WA06拒GET/DELETE未知query、DELETE unknown/empty/null正文且旧cookie仍可查询，合法无正文POST/DELETE保持。唯一root-policy-v2 source server6/6 exit0，noemit-root-v2含newtest/CLI exit0；未重core6/wholefull/build。11files v2保首manifest，新exacthash提交D复验。
