# C.1 A source 独立静审

2026-10-10，仅读差分/关键调用点并重算SHA；无syntax、测试、宿主运行。

actual source `2edd11e6150b92f3e05cec1b87f010b5b5a94aa99a411f07c7b07f93573918e0` /34643B；freeze `7cb8b556aa70e8e3a4d2f02b5abe5952fde4f8fb8335ec46f2462f6881cad7c1`；diff `1f17a217cb1cfc33fd3e75f4453430092af84c1b6ded35f1d651a15613ad390e`均match，before为C v2。

## 实际边界

- helper116–124只对exact candidate执行有界ps UID/PPID/PGID查询，参数PID/nativePID/workerPGID均safeinteger>1，samecurrentUID、exactnativePPID，PGID仅原worker或candidate leader可接受。无signal/ACK/import/宿主启动。模块尾main仅argv入口相等时执行，pure import不启动native。
- source139先保候选最大1与mcp_spawned，再sourceproof；可信confirmed observer成功且末尾gate后才加入source confirmedMcpGroups，随后ACK。query/observer失败不赋source signal权限。D若已独立确认持久化但callback未成功返回，source仍仅候选，D自身注册须独立保证清退；二者不能混同。
- cleanup151对每exactconfirmedMCPgroup和原worker组独立attempt，均positive>1才负signal/probe；157所有MCP组absence、160每candidate positive存在性absence，161再结合worker actualclose/原组门禁才删root。unknown/present失败保root；原错误优先，不把空MCP组解释为全局清退。
- 差分没有改policy/minenv/native方法矩阵/秘密输出或75work/85worker/90whole及launcher原3秒ack预算。新安全输出仅proof booleans/placement/count，不输出PID/私有路径/rawtext。没有发现可行动source blocker。

## 待独验

D finalsource冻结后联合核：独立exactUID/PPID/PGID重查、自己的registry与持久confirmed权限集合；真实Node独立组leader正例、同UID错误父负例及必要inherited/observerfailure，不用伪造三字段。最低source/capture syntax、source-noEmit、新focused可由root另放行；不需要无依据新full/perf。旧C guard仅未变字节绑定复用，reject仅pre-MCP历史，native另root放行。本source静审不认证native或清退实测。
