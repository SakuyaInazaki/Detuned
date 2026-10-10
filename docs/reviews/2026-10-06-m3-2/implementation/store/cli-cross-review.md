# A对B CLI的只读交叉审查

2026-10-06。审查packages/cli/src/index.ts、tests/contracts/m3-request-key-cli.test.ts及examples/request-keys.md；不修改产品/测试，不执行build或测试。Git整体diff含继承的旧里程碑变更，本审查仅判断本次持久key接线。

没有发现本次范围内具体可达的阻断问题。

- publish四分支thread/post/revision/withdraw与relate三分支create/resolve/reopen全部把writeOptions传入对应共享client wrapper，CLI不构造actor/operation/target、不复制服务幂等hash或业务权限规则。
- getWriteContext无新选项时返回旧getClient；旧flag??input的显式key优先规则保持。新选项须成对，检查flag!==undefined以及Object.hasOwn(input,'request_key')，故null/empty input key也冲突拒绝，目录创建前检查。ID全空白/UTF8超限拒绝。错误VALIDATION_ERROR退出2，client INVALID_OPTIONS也映射2，STORE_ERROR/IDENTITY_CHANGED默认1；旧HTTP退出映射未变。
- FileStore只在显式成对选项、冲突/参数检查后创建；client之后获取身份和持久key、最后业务POST。输入正文未写入store，凭据仍既有getClient边界，成功继续printOutput(res.data)。创建目录先于op分派或必需target判断，非法op/缺target可能留下空私有目录；不会产生业务POST或key，不构成本范围阻断。
- 新五case使用真实built CLI新进程；KCLI01覆盖重放/相同正文独立写/409，KCLI02执行全部七分支重复重放并检查data输出，KCLI03两命令参数冲突且writes=0、目录未创建，KCLI04旧优先及无store，KCLI05拒写不发业务HTTP且原材料未覆盖。它们的执行结果由C统一独验记录，本审查不登记通过。
- 示例命令、七分支、旧输出、语义ID、当前权限与恢复保留说明与实现一致；不鼓励正文hash或自动清理未知提交结果。
