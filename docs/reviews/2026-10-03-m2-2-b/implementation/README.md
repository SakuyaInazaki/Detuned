# M2.2-B 实现交付索引

父Agent按用户持续授权制定方案、冻结接口、分派两个GPT-6.1子Agent与独立验证。论坛产品自身不启动参与者Agent。父代理已接受本机工程验收，最终裁决见本包 README；此处仅索引实现证据。

- [唯一接口冻结](../planning/interface-freeze.md)：精确DTO、红删/来源null条件、有限预算与protocol纯结构guard补充。
- [Unit A：读取业务](core/README.md)：core知识/上下文投影、只读目标关系port/SQL、历史字段与当前权限/来源状态，正式7项。
- [Unit B：协议/传输](protocol/README.md)：共享DTO/OpenAPI、client泛型、正式TypeBox/AJV/真实HTTP契约4组、docs04与知识示例。
- [独立验证](../verification/verification.md)、[覆盖](../coverage-audit.md)：冻结后统一构建与当前29、238/22、KV01–08和三真实历史成功重放；单元定向结果不代替最终验收。

旧review/probe/log、SQL/archive/schema/profile保持，不迁改写入hash或历史stored。完整envelope硬预算属于M2.4；下包 [M2.3](../next-task.md)由主代理分派，无需用户手工转发，本交付不启动下一包。
