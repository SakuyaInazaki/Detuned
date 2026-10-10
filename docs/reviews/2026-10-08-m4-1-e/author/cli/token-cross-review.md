# B → A token-source 只读互审

2026-10-08。独立阅读 token-source.ts、七份正式case、A freeze/report、docs04 E节和ADR048；不运行测试/build、不修改产品或冻结文档。结论：冻结范围内未发现新增阻断。

| 检查 | 行证据与结论 |
| --- | --- |
| 四来源选择 | token-source.ts:46–56：flag 按 !==undefined 计数，即使空；env 按非undefined且非空字符串计数，空白仍选中。先拒>1，不比较相等值；0返回undefined，选择后仅调用该来源，无fallback循环。 |
| token保真 | 9–12只trim外层，拒内部JS空白/Unicode Cc及空；无前缀、长度、ASCII或normalize规则。七case覆盖Unicode/Cf保持，不把全部Unicode format字符误称控制字符。 |
| 同FD边界 | 18–31使用O_RDONLY/O_NOFOLLOW/O_NONBLOCK，同FD fstat正规文件，64KiB原bytes先检；仅65537字节buffer、有界分块read到+1/EOF、再stat比较size/mtime/ctime，fatal UTF8解码。没有按路径第二次读取、无无限readFile或FIFO等待写端。 |
| 清理和安全错误 | 32–37所有open/stat/read/decode异常改固定invalid；finally仅关闭本次fd，close失败也固定invalid，无cause/path/raw正文。未加mode/owner拒绝或chmod。前后stat只是变化检测，非对同UID恶意写入的原子快照保证。 |
| 零HTTP组合 | CLI index.ts:92–95在new DetunedClient前执行resolver，显式注env；来源失败同步抛，任何client业务尚未调用。help/version由原生parser成功退出，真正离线维护不走getClient；不是resolver自行识别命令。 |
| FIFO/FD证据适用性 | tests/contracts/m4-token-source.test.ts:74–85真实mkfifo，无写端，execFileSync等待child结束，15秒watchdog，子只输出固定rejected；fixture finally清私有目录。该例是source helper child而非built CLI。32轮成功/已打开目录失败后 aggregate FD数量保持；这可佐证本平台这些路径无累积泄漏，不能单独证明所有异常分支/所有OS FD管理。源码finally是close/decode等未注入错误路径的阅读依据。 |
| 契约同步 | docs04:365起及ADR048记录四来源冲突、零匿名/selected无fallback、文件与同UID/祖先alias边界、CLI限定和成功敏感输出保持，与实际代码相符。旧包段落描述旧时点，E节是此次更新，不把历史旧行为当当前凭据合同。 |

阅读A保存的source-first exit0及7/7日志仅确认作者证据存在；独立结论来自上述代码与断言，不重复运行或替C真实CLI独验。限制：本轮未模拟close/read失败、同UID恶意变化或其他OS，未认证MCP/Pi凭据路径；固定safe错误/资源清理依据对应catch/finally，真实built入口和完整门禁由C执行。
