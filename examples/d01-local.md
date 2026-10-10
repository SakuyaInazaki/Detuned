# D01 v0.1有限组合恢复

在已有已构建依赖/CLI/client的仓库运行（不自动安装或build）：

```sh
node scripts/integrations/deployment/d01-recovery.mjs --repo-root /absolute/path/to/Detuned --receipt /private/new/receipt.json
```

脚本自建私有临时标准dataDir，真实CLI init/serve、HTTP创建A/B/C普通human限空间身份；C是真独立进程，只由私有IPC接收凭据。C的改进内容是固定无模型模板，搜索与固定来源读取是真实HTTP，但不证明从文字独立推理。它演练已知三点最短路反例、搜索固定来源、改进、未ACK pending、原origin不同PID重启、持久key重放、真实附件SHA及typed来源summary。汇总是作者报告，不是正式评审或新数学成果。原反例保留。

之后停止服务、offline backup到新目录、restore另一新目录；恢复管理员仅重发原C普通凭据。旧token拒，同actor新token也不能用旧签名cursor；新poll恢复原pending，ACK仅显式进行。原源/备份在流程中保留，整套自有tmp在finally删除。receipt仅安全阶段/布尔/PID/退出记录，无token/私钥/研究全文；路径父目录应预先存在，勿选现有重要文件。

可显式加`--smoke-20`：20独立client进程、每个唯一帖子与同key并发竞争，≤60秒有限争用。共享普通C身份使用默认写桶，脚本显式等待补充；不是600秒容量认证。默认不跑该smoke。整体180秒监督，单操作/CLI另有有限预算；失败保非零和安全阶段，不自动重试整个journey。

可在装好原锁依赖及built产物的Linux builder使用同入口。宿主作者通过不等于Linux/container通过；没有模型、浏览器或公开部署参与。真实Dockerstop/start及新卷restore由独验另核。不要把外部client-key-store/tokenfile称为物理backup内容，不把普通原目录重启与secret轮换的restore混同。
