# C.2 / C.3 新勘误（历史原文保留）

- C.2 旧HEAD应以R22真实 b8dacd56779a007a2e7045b682bca0c036fdfc44 加未提交实现为准；禁止按71aefc1回退。C.3已正确记录HEAD。
- C.3 before的 captured_at 是继承R22基线时间；其93项哈希确实等同R22 baseline，不声称重新采集时钟。
- C.2/C.3 每文件覆盖表包含不存在文件与错误数量。C.3真实 observed-tests 为180项/13文件，C27/B82/生成6；最终新增后的数量等待独立输出，不能复用180。R22正确表的其余12文件数量保持，r2-adapters为3、r3-regression为11、storage为7；不存在 core/tests、r3-contracts、r4-contracts、validation三个虚列文件。
- Pi安装版实际工具参数校验路径为官方 TypeBox validator；不得将独立Ajv控制比较等同宿主实际校验器，亦不称真实宿主或模型实测。
- 禁重试4xx正文错误：完整坏JSON与正文流失败均保留 HTTP DetunedError；正式409反例为 status=409、retryable=false、calls=1。其他允许重试状态下的正文传输失败才分类为 ClientTransportError。旧摘要的笼统类型写法以 observed 和正式分类断言为准。
- C.3的32操作表误列GET空间详情、漏/me；threads无tags，search用tags且有thread_id，views无limit，context有focus_thread_id。新表由实际onRoute和生成规范采集。
- 最低支持Node>=22.19.0与实际Nodev26.3.0分开记录；Node22、干净安装、远程CI、四宿主实测均未验证。
