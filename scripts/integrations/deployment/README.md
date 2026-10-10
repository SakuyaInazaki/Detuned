# 单服务容器入口

镜像固定 Linux arm64、Node22.23.3 与官方 platform digest；pnpm11.7.0 使用原锁。builder安装忽略第三方脚本，随后仅显式重建esbuild，实际加载SQLite并构建全workspace。runtime保留Linux pnpm布局，UID1000，入口为直接Node CLI。没有自动初始化。

```sh
docker build --platform linux/arm64 --target runtime -t detuned-local:arm64 .
docker build --platform linux/arm64 --target builder -t detuned-local:builder .
```

第二命令同输入可复用builder缓存；`builder`用于隔离Linux检查，不能当精简runtime。不要把主机node_modules/dist复制进构建。新测试脚本可复制到专用测试容器，不需要因测试文件重编所有产品。

严格匿名健康检查：

```sh
node scripts/integrations/deployment/container-health.mjs \
  --url https://127.0.0.1:3000 --web-origin https://localhost:8443 --ca /run/tls/ca.pem
```

仅loopback HTTPS、3秒请求预算、16KiB响应上限，必须200与ready。Web模式从同一精确web-origin取HTTP Host authority与证书期望hostname；连接仍是内部loopback，不解析origin作外联。API-only可改用--hostname显式证书期望名。未给CA时采用Node默认可信根；不会关闭TLS验证。CA/hostname/Host错误、503、异常正文都非零且固定安全诊断。此检查不是用户权限/恢复验收。

运行、持久卷和TLS前置见 [部署指南](../../../examples/deployment.md)。离线备份/恢复与D01的组合脚本由同包独立作者提供，实际结论以本包审查报告为准，不把镜像构建成功当完整部署认证。
