# 容器限定独立源码检查

检查时B仍在构建夹具调整，下面仅绑定本次四文件hash；最终freeze需D比对。未运行VM/build/gates/probe，不将源码推断标成Linux行为通过。

## 可行动阻断：默认Compose健康探针HTTP Host不匹配

compose.yaml:47 webOrigin默认https://localhost:8443，:49健康探针连接https://127.0.0.1:3000。container-health.mjs:19–22只指定TLS servername/checkServerIdentity，没有设置HTTP Host；Node据URL生成127.0.0.1:3000。实际server app.ts:155每个启用Web请求经过checkWebRequest，web-auth.ts:20要求Host严格等webOrigin authority。故正常证书/ready数据库也返回403而不是ready，Compose默认unhealthy。TLS身份核验不会替HTTP Host设值。这是直接控制流推断，非已运行反例。已报根/B；候选修probe显式可信authority并设置Host，保持连接loopback与CA/hostname严验，不放宽服务端Host。

## 其余限定事实

- Dockerfile固定Node patch+digest，两stage同源；COPY来自Linux builder，.dockerignore排所有node_modules/dist，不把Darwin依赖复制runtime。这里不替代实际manifest/nativeSQLite测试。builder当前忽略scripts仅rebuild esbuild，其安装/native步骤仍由B真实build验证。
- .dockerignore先排全部，再纳入workspace/package/scripts/tests，排docs/reviews（未allow）、数据目录、DB（仅静态历史legacy.db例外）、PEM/key/证书、local配置与logs。当前必要源码文件名检查没有发现真实token材料。该模式不是任意文件内容秘密扫描：任何人把无特征命名凭据放allow源码目录仍可能发送，指南不得承诺自动识别所有秘密，构建输入须操作者保持无私密材料。
- runtime USER1000:1000，ENTRYPOINT exec-form node CLI，CMD显式serve /data/instance，无自动init；whole /data VOLUME，与assets分离。Compose named-volume保完整目录，TLS/CA bind read_only且create_host_path false；实际daemon权限/卷初次ownership仍须实跑。
- Compose run覆写command而保node CLI ENTRYPOINT，公开init/backup/restore命令因此不额外拼node；需要TLS路径变量仍是Compose解析前提，符合当前示例准备顺序。恢复另目录不能自动改变serve目录，指南明确人工确认。
- health匿名无Authorization，不跟redirect，只接受https loopback URL且禁止userinfo/path/query/hash；rejectUnauthorized true，明确CA与期望hostname，3s总timer+sockettimeout、16KiB正文上限、200/ready才能成功。CA读取本地指定path不等任意网络抓取；不存在全局TLS校验关闭。Host阻断独立于这些正向安全事实。

没有扩展尺寸/漏洞审计；未改四被审源、A作者freeze、旧TLS review。真实Linuxcontainer/生命周期/恢复由D独立确认。
