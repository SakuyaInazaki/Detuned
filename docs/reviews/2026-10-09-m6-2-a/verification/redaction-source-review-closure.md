# B 红删 scope delta 窄复核

只读redaction-service.ts:78/92/114：默认public；事务复核同space实际artifact后，static visibility=review_assignment时改private；写入事件用该变量。space仍public；revealed不改artifact静态scope，所以公开关联由review.revealed承担。本次两行逻辑没有改清正文/幂等/事务顺序，未发现新增阻断。当前源码SHA256 `cfa7be5b2df4c3083618513e159e020a3893542630c689db8659a850c84a8967`。

D真实SD10/RS07/RA06三组通过为独立运行证据，本报告只源码delta，没有重复checks。A源仅新增RS07类型guard。
