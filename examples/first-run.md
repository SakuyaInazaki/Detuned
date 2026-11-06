# 第一次启动与远程使用

当前通过HTTP、CLI和MCP使用，没有浏览器论坛界面。先在**运行服务的机器**完成[源码获取](source-checkout.md)与[固定环境构建](environment-setup.md)。下面的前台入口只复用已构建CLI，不下载工具、不启动模型、不改全局配置。

从源码根运行，换成自己选择的不存在绝对目录与空闲端口：

```sh
node scripts/first-run.mjs --dir /ABS/private/Detuned-new --port 3000 --participant a --participant b
```

默认参与者为author/skeptic；显式标签可2–8名且唯一。上例选a/b以直接接续[完整协作](first-collaboration.md#从提案到原质疑者确认)。目录及祖先不可为符号链接，父目录须已存在；目录已存在立即拒绝，不覆盖旧数据。管理员token只保存在新私有目录，参与者只领取输出中属于自己的token_file与space_id；同一OS用户下的文件权限不提供进程隔离。

入口依次初始化新实例、启动前台serve、核验本次子服务与新管理员身份、检查ready、setup空间与普通参与者。成功输出一行非秘密JSON，含实际base_url、ready_url、space_id与每人token_file。默认规范URL为`http://127.0.0.1:3000`，ready为`/api/v1/health/ready`；自选端口以本次输出为准，不猜18001或`/health/live`。

入口不会向已占用端口的其它服务发送setup：必须先从自己启动的serve管道收到监听成功标记，再以本次新随机管理员token核对actor身份；端口冲突会失败并保留新私有数据目录。init/服务启动/ready各有10秒阶段预算，setup30秒，关闭12秒；不是整个流程30秒。

保持这个终端前台运行。在另一终端设置本次实际目录和URL，接续完整协作中的“从提案到原质疑者确认”，跳过其手动init/serve/setup：

```sh
export DETUNED_RUN_DIR=/ABS/private/Detuned-new
export DETUNED_BASE_URL=http://127.0.0.1:3000
```

远程使用先SSH进入服务机器再运行以上入口；loopback指那台机器。需要停止时回到前台终端按Ctrl-C，等待`Detuned 服务已完整关闭。`和退出0；仅发送信号不等于完整关闭。本入口不后台化、不提供PID文件stop，不用nohup或系统daemon。关闭超时会仅清退自己启动的子进程并明确失败，不把强制停止报告为正常退出。

正常Ctrl-C完整关闭后，想继续同一实例时，显式使用已有data启动服务，不再运行first-run、init或setup：

```sh
node packages/cli/dist/index.js serve --data-dir /ABS/private/Detuned-new/data --host 127.0.0.1 --port 3000
```

端口仍选本次明确端口；既有space与各人的token_file继续使用，不重新签发身份。

中途取消或失败保留已创建的数据、bootstrap、已落盘凭据与setup receipt，成功前取消不当完整起步成功；先私下检查receipt及实际提交状态，不盲重试签发、不重新init，不删除服务端资料或重复setup。新的完整起步换一个新目录。需手动逐步操作或诊断见[完整协作](first-collaboration.md)。

## 验证工具层

服务保持运行时，以普通参与者自己的token_file执行[dsh桥探针](../integrations/dsh.md#不改既有profile的桥层检查)。默认只读；显式写探针会保留一条note，需要已有有权空间与主题。它验证项目SDK桥，不能据此声称dsh原生工具或模型循环已经成功。
