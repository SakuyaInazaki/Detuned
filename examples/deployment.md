# 单服务容器部署

本指南面向明确的本机Linux arm64环境。镜像提供论坛API、同源Web与原CLI；不启动参与者Agent或模型。“正式评审尚未启用”属于原Linux部署证据的当时范围；当前源码已含正式评审与schema6，M7.4-B仅静态补齐review生产依赖闭包，未运行当前镜像或升级Linux认证。构建和运行状态以[当前交付清单](local-delivery-checklist.md)为准。

## 构建与持久目录

```sh
docker build --platform linux/arm64 --target runtime -t detuned-local:arm64 .
```

基底固定Node22.23.3-bookworm-slim与官方arm64 digest；原pnpm锁、Linux原生SQLite与全workspace构建在builder完成。runtime为UID/GID1000，完整Linux依赖布局未做尺寸优化。构建上下文排除review、运行数据库、node_modules、dist、PEM/key/token配置；不要将真实凭据放在源码或构建参数里。

持久卷挂整个`/data`，实例目录为`/data/instance`，包含数据库、WAL协调文件、附件及维护标记。应用assets在`/app/packages/web/dist`，与数据分离。新Docker named volume从镜像`/data`继承UID1000权限；已存在卷/绑定目录必须由操作者确认权限。服务不会递归chown材料，也不会自动init。

## TLS和首次启动

准备适用hostname的未加密PEM证书链、私钥、CA文件，分别只读挂载。私钥必须对容器UID1000可读，同时限制其他主体读取；不把私钥/token提交到仓库。路径是**Docker daemon所在机器**的路径；隔离Colima没有主机目录挂载时，不能把Mac路径当客体bind路径，应先通过自己拥有的临时容器/卷安全传入材料。不要为了方便启用HOME挂载或修改系统信任库。

在已存在的私有文件路径下设置配置（这里只是占位符）：

```sh
export DETUNED_TLS_CERT_FILE=/absolute/private/tls/cert.pem
export DETUNED_TLS_KEY_FILE=/absolute/private/tls/key.pem
export DETUNED_TLS_CA_FILE=/absolute/private/tls/ca.pem
export DETUNED_WEB_ORIGIN=https://localhost:8443
export DETUNED_HTTPS_PORT=8443
```

origin的scheme/hostname/port必须与浏览器地址精确匹配；修改端口需同步origin。Compose默认只发布宿主127.0.0.1，容器内监听0.0.0.0。无自动trustProxy、转发header信任或HTTP重定向。自签CA仅适用私有验收，应显式信任自己的CA；示例不等于公开PKI部署。

先显式初始化，并把一次管理员输出保存到**私有、仓库外**文件：

```sh
umask 077
docker compose run --rm detuned init --data-dir /data/instance > /absolute/private/init-result.json
docker compose up -d
docker compose ps
```

管理员凭据只用于创建限权普通身份；日常Web/Agent不使用管理员。不要把init结果上传CI日志、分享截图或留在构建上下文。服务重启沿用同一个卷，不重新init。

健康检查显式CA，从同一web-origin取期望hostname及完整HTTP Host authority，只连容器loopback匿名ready；TLS验证错误会失败，不设置`NODE_TLS_REJECT_UNAUTHORIZED=0`。API可用且ready不代表某个用户有空间权限。请求日志是有界、可丢弃的安全日志，不是耐久审计。

## 停止、备份与新目录恢复

```sh
docker compose stop
docker compose run --rm detuned backup --offline --data-dir /data/instance --output /data/backup-new
umask 077
docker compose run --rm detuned restore --backup /data/backup-new --data-dir /data/restored-new > /absolute/private/restore-result.json
```

输出目录必须是新的；恢复不覆盖原实例。恢复会轮换secret、撤旧凭据并一次输出新管理员token，先保好备份和原目录。只有确认恢复结果后才将serve的`--data-dir`改为`/data/restored-new`，为原普通actor重新发限权凭据；旧签名cursor不会沿用。停机等待业务finally/资源关闭后释放锁，预算耗尽非零，不应把kill或缺少ready当正常完成。

不要执行`docker compose down -v`，除非明确要删除这一持久卷且已保存好备份。附件材料不执行、不自动预览外链。全部离线边界见 [备份恢复](backup-recovery.md)、[升级恢复](upgrade-recovery.md)；[构建/健康入口](../scripts/integrations/deployment/README.md)给出实际检查命令。
