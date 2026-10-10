# M6.1-A 独立源审范围

D逐段阅读 `modules/review/src/index.ts`、`canonical-json.ts`、`protocol/review.ts`，并对3现有产品文件与fresh精确before作差分（product-existing-exact.diff）。A/B七项最终冻结hash核匹配；不以作者自报作为独立运行结论。

- 单readSnapshot包住refreshContext/observer ACL和材料；实际WAL双连接独验补充“spy仅能数调用”的局限。规则来自真实policy_revision记录，不把pinned或current_revision写进manifest。标准fixture共用AuthService和模块的storage；类型不保证任意外部组装也共用。
- target/deps只读固定当前修订；历史贡献者用100条DESC metadata keyset、严格递减并拒10000/4096超界，不加载历史正文。完整字段及输出detachment由独验验证。附件只是DB metadata绑定，没有读取实际物理blob或宣称下载校验。
- 三元组code去重、required profiles缺失/损坏拒、原认证错误保持，canonical budget映射固定400/413/422。目标strict claim parser复用；没有写review round/事件/幂等或reviewer资格逻辑。
- TypeBox Static DTO是唯一请求类型；tools future op展开同schema properties，八广告工具未启用review op。旧Hasher不改，仅sha256 UTF8字符串复用。
- canonicalizer raw UTF16排序、ECMAScript primitive串化、UTF8字节预算；descriptor禁止accessor/hidden/symbol和非法array，逐祖先集合允许合法共享值但拒环。不调用toJSON、不作Unicode normalization、不承诺恶意Proxy隔离。B作者RFC等已读，D增加未覆盖__proto__/parsed integer/特殊Unicode反例。

未发现本轮可行动阻断。限定内存材料生成，不提前声称评审请求持久化、封存、资格、HTTP endpoint或M6完整实现。
