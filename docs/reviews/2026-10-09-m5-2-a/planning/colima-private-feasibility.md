# 自有 Colima/Lima 可行性（2026-10-09，未启动）

仅新私有目录的 env-i 下执行 Colima version/start-help/stop-help/delete-help 与 limactl version/help，六命令 exit0；原 HOME 原值保留，未设 CODEX_HOME，目录 finally 删除。公开输出归档 [colima-private-help/receipt.json](colima-private-help/receipt.json)。实际 Colima0.10.3 commit00f6c297e92a82c04a4ab507db0a61435650d7e8、Lima2.2.0；macOS26.2/arm64。没有start/download/install或VM状态探测。

## 隔离的准确条件

[固定Colima v0.10.3 config/files.go](https://github.com/abiosoft/colima/blob/v0.10.3/config/files.go) 实际仅在 **COLIMA_HOME 路径已存在**时采用它，否则可能回退真实HOME。实施必须先 mkdir owned colima根再启动，不能只env赋一个不存在子路径。该源码尊重非空 LIMA_HOME；COLIMA_CACHE_HOME 可独立指定，否则cache会回用户目录。模板/store基于Colima根。上述help/version不调用完整startup路径，不能据它们证明启动已隔离。

[固定lima.New](https://github.com/abiosoft/colima/blob/v0.10.3/environment/vm/lima/lima.go) 给subprocess注入config.LimaDir为LIMA_HOME。Lima官方[LIMA_HOME](https://lima-vm.io/docs/config/environment-variables/)默认~/.lima，可显式owned路径。建议 env-i PATH+原HOME，以及已创建 COLIMA_HOME/LIMA_HOME/COLIMA_CACHE_HOME/XDG_CACHE_HOME/TMPDIR/DOCKER_CONFIG 全部 owned；不要继承SSH_AUTH_SOCK/registry登录。start期间生成的临时profile YAML也用owned TMPDIR。不得写默认 ~/.ssh/config：安装版`--ssh-config=false`，禁止agent forwarding；`--activate=false`阻止更换Dockercontext、`--template=false`不加载模板、`--mount none`关闭默认HOME挂载、`--binfmt=false`不需要跨架构、`--vz-rosetta=false`不启动Rosetta。

## 最小候选命令（尚未执行，父预算批准后）

在同一隔离env与非默认profile `detuned-owned`：

```
colima start detuned-owned --runtime docker --vm-type vz --arch aarch64 \
  --cpus 2 --memory 4 --disk 10 --root-disk 10 \
  --activate=false --template=false --ssh-config=false --ssh-agent=false \
  --mount none --binfmt=false --vz-rosetta=false --network-address=false \
  --network-host-addresses=false --port-forwarder none
colima stop detuned-owned
colima delete detuned-owned --force --data
```

安装版help确认这些flags、profile位置与stop/delete语法。注意 **runtime disk与root disk是两块**，仅`--disk20`加默认root20会超过总20GiB；10+10是候选，实际基础image最小空间/构建够不够必须预算内实测，不暗扩大。普通stop优先，必要force仅清理自有profile，经确认后delete --data才含runtime数据；最后删除owned根前确认VM/daemon真正退出。

VZ在macOS13+可用，当前系统满足静态条件，真实hypervisor权限未执行验证；QEMU需要对应binary/运行支持，当前没有核QEMU，不自动替路线。[Colima官方配置](https://colima.run/docs/configuration/)列network-address需root；这里不启用。[Lima默认user-mode网络](https://lima-vm.io/docs/config/network/user/)不让host直接访问guestIP，[固定Colima Network.VZNAT](https://github.com/abiosoft/colima/blob/v0.10.3/environment/vm/lima/limaconfig/config.go)注明无需root。不请求bridged/socket_vmnet/helper安装；API仅明确 owned Docker Unixsocket，若部署验收需要host HTTPS端口，须父批准仅loopback受控转发（`--port-forwarder none`时不能假称host Web已可达）。guest外网镜像下载仍需后续明确来源/预算。

## 可行性结论与剩余检查

现有Colima/Lima与nativeVZ条件足够提出无需安装的新私有VM路线，不需要用户默认daemon配置。尚未实际保证startup所有文件读取/写入：启动前应有限确认生成Lima配置 `ssh.loadDotSSHPubKeys:false`、mounts为空/仅owned、网络和cache路径符合上述约束；不能仅依HOME没改就声称无用户state接触。若实际默认startup仍需要读取真实SSH/profile/Keychain或sudo，保首失败停报父，不弱化边界。候选要由根冻结后启动，本任务没有运行VM/改配置/下载或安装。
