# A → B 管理CLI只读互审

范围B冻结的admin-input/actions/guide及相关contract test，不编辑或运行B文件。结论：未发现本包冻结范围内可达阻断。

readAdminInput局部catch读取/JSON解析与object形状失败，固定safe VALIDATION_ERROR，不回显文件path/JSON片段；具体业务字段仍server schema，未复制权限。新有body命令省略input用stdin '-'，无body revoke/deactivate不添加{}。actor/credential/membership三个group与旧group名称不冲突，七调用准确复用A sharedclient methods，无独立retry或请求框架。

credential成功直接printOutput(data)一次，唯一token只经本次stdout，没有日志、持久key、自动保存或泄漏内部token_hash。六非幂等动作无key flags且client singleattempt；指南准确说明失响应/timeout/取消可能提交、class.retryable不代表业务可重放，不声称能重新找回丢失token。普通凭据示例限指定space/read/write，没有默认授admin或研究评审资格。

redact使用getWriteContext(options,input)原冲突规则；key=flag??input.request_key，先析出request_key不发body。持久时任何own key含null/empty拒；没有把type/id/reason塞scope，明确admin.redaction targetnull和payload变化409。沿原server必key/ACL，CLI无自动执行脱敏。指南准确列stderr/JSON/action旧错误映射及Commander全局parser尚未统一，不冒称本包改了宿主/管理状态查询。

既有getClient凭据fallback、旧输入框架与全局parser不在本包改动范围；没有扩大历史CLI审计。真实业务/进程验收归C。
