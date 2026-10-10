# 自有 Colima VZ 准备（2026-10-09）

此目录仅环境准备证据。`start.py` 唯一 start 在 88.326 秒 exit0，未触发 480 秒预算；明确自有 Unixsocket 的 Docker version exit0，Docker29.5.2/Linux arm64。没有容器 pull/build/run。成功 VM 保留供下一包，不将环境准备写成部署验收。[receipt.json](receipt.json)、[retained-state.json](retained-state.json)、[生成配置选段](generated-config.txt) 为实际收据。

自有根 `/private/tmp/detuned-colima-owned-608g1enf`；profile `detuned-owned`，Lima instance `colima-detuned-owned`；hostagent/VZ PID8046；Docker socket 为根下 `colima/detuned-owned/docker.sock`。生成配置实际为 VZ/aarch64/2CPU/4096MiB，root10GiB + runtime10GiB，无 host mounts、loadDotSSHPubKeys/forwardAgent=false，user-v2 网络且 TCP 转发 ignore。内部 SSH 使用 usernet loopback forwarder，这是 Lima 管理通道，不是对外业务端口。

固定 Colima0.10.3 [embedded/images/images.txt](https://github.com/abiosoft/colima/blob/v0.10.3/embedded/images/images.txt) 指向官方 colima-core0.10.4 arm64 Docker Ubuntu24.04 压缩基础镜像；实际下载332354401bytes，SHA256 `1fc0354f4f99734ce3886628cc7af8b0437c1a1d391b126bd09cba0df35ee53f`，实际SHA512与固定source所列值相符（完整值在retained-state）。仅此基础镜像下载，不是拉取应用容器。

启动前核固定源码：

- [Colima0.10.3 yaml.go](https://github.com/abiosoft/colima/blob/v0.10.3/environment/vm/lima/yaml.go) line70 固定 LoadDotSSHPubKeys=false，ForwardAgent 取显式 false；native VZ 仅同架构/支持系统，2CPU/4GiB、root10GiB、另 runtime10GiB；none portforward 不转发TCP，保留显式 Docker Unixsocket。
- [cmd/start.go](https://github.com/abiosoft/colima/blob/v0.10.3/cmd/start.go) lines267–275 将 mount none 转成 nil；yaml.go lines353–377 对 nil 不增加默认 HOME 挂载。
- [Lima2.2 sshutil.go](https://github.com/lima-vm/lima/blob/v2.2.0/pkg/sshutil/sshutil.go) lines280–327 在 loadDotSSH=false 时只用 LIMA_HOME/_config 自有密钥；lines582–589 的 SSH argv 固定 -F /dev/null，不读取用户 SSH config。
- [Colima certs.go](https://github.com/abiosoft/colima/blob/v0.10.3/environment/vm/lima/certs.go) 只从 DockerDir/certs.d 复制；[docker.go](https://github.com/abiosoft/colima/blob/v0.10.3/environment/container/docker/docker.go) lines167–174 尊重显式 DOCKER_CONFIG，本轮为 owned 空目录。未读取 registry auth。
- [files.go](https://github.com/abiosoft/colima/blob/v0.10.3/config/files.go) 要求 COLIMA_HOME 已存在，本轮先创建全部私有目录；LIMA_HOME/COLIMA_CACHE_HOME/XDG_CACHE_HOME/TMPDIR/DOCKER_CONFIG 均显式 owned。原 HOME 只原样透传，不继承其它用户环境；不设 CODEX_HOME、SSH_AUTH_SOCK。

所有 generated key/磁盘/VM 状态仅 private/tmp；repo 只记录脚本、公开命令、路径及安全日志。activate/template/ssh-config/ssh-agent/binfmt/rosetta/network-address/host-addresses 均 false；无 host sudo/privileged network。Colima 在客体内部的系统服务管理不等于请求 host sudo。

清理必须使用 operation.json 所列完全相同 owned env，执行 `colima stop detuned-owned`（必要 force）再 `colima delete detuned-owned --force --data`。确认自有 VM/daemon 退出后才删除该 owned 根；不可使用默认 env 或操作其他 profile。
