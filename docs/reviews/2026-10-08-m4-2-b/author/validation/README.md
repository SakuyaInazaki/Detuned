# M4.2-B B 参数与响应验证交付（已冻结）

6个授权文件见freeze-manifest.json。validateMcpToolArguments(name,args)完整校验八DETUNED_TOOLS，成功返回原引用；parseMcpMe/Session使用现schema返回真实验证后的MeResponse/Session。默认SDK Ajv provider，无coerce/remove/default，不暴露Ajv diagnostics；invalid固定DetunedError VALIDATION_ERROR，response固定已有ClientProtocolError（父确认命名误指，不新建class/code）。args与响应没有cast绕验证。

父批准唯一可信静态schema类型桥：TypeBox contentEncoding声明更宽于SDK JsonSchemaType，sdkSchema保exactobject/allkeywords，只在此带注释适配；显式Map stringkey，未修改protocol schema/客户端/依赖/SQL。

作者四formal：MS01八代表输入/原引用/无mutation；MS02顶层nestedunknown/wrongtype与不coerce；MS03共享union交叉字段/subscribe allOf反例；MS04 legacy structured Record及Me/Session固定safe响应。实际Type.Union广告用anyOf，不是oneOf；测试真实分支约束与allOf执行，不捏造广告keyword或改schema。

source-first exit1：4组3pass1fail，MS01fixture context max_bytes1024低于共享最小4096，正确拒绝。仅fixture改4096，source-ms01-corrected exit0：该组1pass/3未选。其他已绿3组未重复。source-noemit-first exit2：三静态schema跨库metadata类型+Mapliteralkeys；父批准窄适配后source-noemit-second exit0，含新test和mcp/CLI/client/protocol/core/server/storage源码，无产物。

无作者build/fullsuite/current29或host/model运行；首记录保留，不宣称首全绿。A接线与关闭/session正式由A所有，C唯一统一build/独验。docs04/06/ADR050/guide准确说明诊断session非逐帖绑定、无session_idwire、global读失败后新显式call可初始化但已开始createSession失败缓存到重连/可能已有无害记录，仍无四真实宿主认证。

产品/tests/docs已停写，限制：schema合格不等于权限/业务材料合格；SDK默认provider输入不变但不认证自定义provider；八工具既有legacy fallback保留，不提前裁服务新写规则。当前父验收待C统一门禁。
