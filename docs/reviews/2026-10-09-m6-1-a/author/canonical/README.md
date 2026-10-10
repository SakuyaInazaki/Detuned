# M6.1-A 独立 canonical JSON 作者证据

源码仅 canonical-json.ts 和 m6-review-canonicalization.test.ts 两份。公开函数 canonicalizeReviewJson(value:unknown):string；ReviewCanonicalizationError.reason 为 invalid_json|max_bytes|max_depth|max_nodes，全部固定安全 message。无依赖/旧 Hasher/SQL/schema/index 修改。

依据 [RFC8785](https://www.rfc-editor.org/rfc/rfc8785) §3.2 与 Appendix B（2026-10-09 查阅）：primitive JSON.stringify 使用 ECMAScript number/string 格式，先拒非有限数字与无配对 surrogate；手动 object token 输出并 raw UTF16 sort，避免整数 key 被 JS object 枚举重新排序。数组保序，不 Unicode normalize，不执行 toJSON/accessor。descriptor 拒隐藏与 symbol 数据；仅标准密集数组与普通/null-prototype record。路径 Set 拒 cycle，允许共享子对象重复，重复出现计 node。

固定预算：输出 UTF8≤262144 bytes，root depth0、子value/element+1≤64；node计每次value访问含root/container≤20000，不计key但其编码计bytes。每项等于上限允许。函数接已经解析的 JS 值，不能发现 JSON 文本重复 keys；不宣称恶意 Proxy 隔离、同步 native 抢占或全内存/CPU硬上界。大字符串/反射输入已存在内存；输出累计有界。

七组有效测试包含 Appendix B 的24个固定 IEEE bit-vector 输出、确切转义与UTF8字节、规范Unicode顺序/整数key/数组、不归一Unicode、pair/lone surrogate、非JSON原型/稀疏额外数组、getter/setter/toJSON不执行、输入冻结不变、共享vs循环、三预算精确边界。

source-first 首7/7通过。noemit-first exit2：两个 descriptor 未被 TS 收窄，保留完整诊断；仅将 undefined 分支显式 return fail，不改变规则。含新源码及测试的 noemit-final exit0；source-final 修后7/7。stdout/stderr/真实exit/elapsed均在对应 receipt/log；没有运行 workspace build、fullsuite 或独验。冻结hash见 freeze-manifest.json。
