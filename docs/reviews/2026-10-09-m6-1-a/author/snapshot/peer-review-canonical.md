# 相邻 canonicalizer 源审

审阅 B canonical-json.ts SHA da5f0dbb0d20760c5df62b2da8b2b07b2846c473cbcd0cb0c4e217bec6ff7b53（冻结版本）。未运行 B 测试或修改其源。

实现按默认 UTF16 sort、JSON.stringify 数字/字符串、有效 surrogate、有限值、plain object/array、拒 accessor/symbol/cycle/holes，记录 UTF8 输出 bytes/root0深度/value节点；反射异常固定映射，不回显输入。预算不是 native CPU/内存硬抢占。相邻 ReviewModule 只传 detached manifest，旧 canonicalJson 未调用；reason max_bytes→413，depth/nodes→422，invalid_json→400，SHA沿现UTF8接口。

有限源审未发现可行动接口/映射阻断；RFC 与运行独验由D负责，本报告不替代。
