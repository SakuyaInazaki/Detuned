# A：MCP 惰性诊断 session 交付

产品与正式test源码已冻结，[5文件hash](freeze-manifest.json)。bridge先B单源完整tool validator，再进行可选sessionBinding；main同一client默认绑定detuned-mcp/0.1.0，factory原callTool-only注入兼容。构造/发现仍零HTTP。

新session-binding：global capabilities→me与per-space单flight，各自controller/等待者计数与pending登记。单等待者取消不影响他人；全取消abort。global失败在真实finally后可由新显式call再启动；createSession已开始后失败或取消终止缓存，后续同space不二次创建。schema与actor/space响应核验后才dispatch，未注入session_id。关闭同步abort全部flight并等待真实finally，沿既有单关闭预算与失败边界。

实际作者检查（日志均保留）：

- source-first：新正式5/5通过，exit0，vitest总522ms。受控SDK流与屏障，未启动真实HTTP服务/模型。
- source-noemit：exit2，唯一新test TS7006（mock重新赋值的opts缺显式类型）；原日志保留，不称产品业务失败。
- 仅补该test参数类型；source-noemit-final：含新正式test，exit0。未重复5case，因为仅类型注解变化。

未运行build/fullsuite/current29、旧runtime正式测试或新真实CLI/native HTTP；统一由C。没有旧fixture/依赖/SQL/业务规则修改。B已冻共享tool-validation，A检查使用当前source别名，不借旧dist。

限制：session仅runtime诊断关联，八工具无逐帖绑定；新session不构成新身份。创建响应丢失可能已存在无害记录，失败缓存直到新runtime，不能说撤销。同步/非合作底层Promise不能被JS硬抢占；原close预算失败不等于clean。global重启仅新显式call，不在旧call循环重试；HTTP读内部原有有限重试保持。
