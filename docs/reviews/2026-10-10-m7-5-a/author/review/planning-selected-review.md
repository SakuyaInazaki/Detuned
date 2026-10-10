# M7.5-A 已定完整路线增量静审

通过准备审查，待 D runner actual freeze 静审；不释放 runtime。原 planning-review.md 所指路线歧义已由 root 定案文档解决，原报告保留。

实际 task SHA `67315ee1792ce05b7e55cfe0a5d66b79af188cdef047ad67d7ee4eb221d0f2c1`，ownership SHA `5f33cd176ba926782a06ff204a1de5a503b18faba6178e8f9f31e84a937b61c5`。158文件完整后端、九包串行build、两个精确历史fixture例外、两Web parser排除、900s fulltest、1800s含90s cleanup、logical/allocated各2GiB已明确覆盖未选择8focused与旧每file60s；原timeout/断言不变。371文件闭包/pins及layout无Web依赖结论保持，未新增复制范围。

Runner应按root补充证据边界实现：不注入spawn、不改既有testenv/语义；outer只证明其登记stage PID/PGID实际close/absence，内部detached依既有真实close/absence断言和awaited teardown，不能宣称完整逐PID census。只有158全通过、teardown无错、登记stagegroups absent才能清退fixture；失败/deadline/settlement unknown保精确root/ledger交root，不扩大全机扫描或blindkill。安装隔离必须核实际pnpm11配置键/优先级与私有目录，旧空npmrc/CI不能自动充当全部cache隔离证明。

本次只读计划和指定源码/现有固定pnpm代码、计算哈希、写审查；未执行安装、Node、测试或子进程。没有已证Node22实际运行、网络、资源闭包或clean install成功结论。
