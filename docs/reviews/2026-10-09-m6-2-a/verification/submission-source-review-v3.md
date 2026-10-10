# A v3 三项窄差分复核（2026-10-09）

仅只读复核；没有编译、测试或行为运行。被审四源文件全部命中 A v3 manifest；具体hash见同名JSON。原审查及SD07否定hash候选的disposition保留，不改写首记录。

1. review-request-records.ts:138–148新增 void assertReviewSnapshotCurrent，仅检查space.policy_revision、target/dependency active且current_revision匹配、显式snapshot artifact ready。无JCS、内容返回、资格/ACL替代或module依赖；注释要求调用方先current Auth及online privacy。现submit freshMaterials:41–45先readReviewSnapshotRecords，后void检查，保持404/410隐私优先。
2. submission-service.ts:18–38为assignment增加read/write参数且默认write；getOwnAssignment唯一显式false+'read'。固定assignment及snapshot privacy仍核；后来资格/phase变化不再被fresh资格阻断本人只读身份。新submit:55–64仍默认write且fresh=true检查真实active eligible/human-agent/贡献者/groups、collecting与未提交；没有削弱新写门槛。
3. submit outer transaction/idempotency/final reveal路径未扩scope，freshMaterials只把原metadata stale检查移到共享helper；历史samekey reconstruct不调用fresh helper。request-service base确认与idem compact历史形状未在该修复增加count或revealed_at；current read继续独立count和partial changed_by遮蔽。

结论：上述三项差分与root裁定一致，没有新增可证明阻断。SD08/SD09运行闭合仍由D单执行窗负责，本文件不冒称通过。hash末尾newline候选已被SD07真实拒绝反例否定，非未解决缺陷。
