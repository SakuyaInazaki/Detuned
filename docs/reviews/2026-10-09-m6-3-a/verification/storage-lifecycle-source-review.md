# M6.3-A B侧有限静态源审

未发现本次限定范围内可行动阻断；这是源码结论，未运行任何测试/build/维护或故障实验。受审实际hash见[记录](storage-lifecycle-source-review.json)，不得替代D运行证据。

- offline-upgrade.ts:16、42–56先classify历史1/2/3/4源并检查FK/integrity；只读source备份到owned stage，stage先原profile验证、复制附件，再bootstrap与current5复核/identity reset。offline-backup.ts:247–251同理先source schema+inventory再只stage2/3/4升级，新manifest写5，来源manifest不改。bootstrap.ts:382–400维护formal分支保compact原字节，用intrinsic void；finalize还绑定idem实际actor。
- schema.sql:319–332唯一request decision/真实actor外键与两reverse索引；sqlite-storage.ts:1639–1657 decision精确JSON数组映射，reverse限定same space+collecting/revealed，post匹配target/dependency、artifact匹配显式snapshot item，policy只自身space。不会把unused私有附件或terminal request算活动材料。索引/约束的运行效果未验证。
- post-service.ts:279–282、399–402在原tx材料变更后触helper；space-service.ts:159–186只objective/rules/review_policy/check_profiles显式patch推进policy并触helper，pinned-only不触。redaction-service.ts:76–109在原Idempotency tx中完成redaction，仅post或静态public artifact触stale，review_assignment不触公共stale。
- 与A helper相邻源码核：review-lifecycle.ts使用readIntrinsicReviewRequestRecords，无在线材料privacy路径；合法红删不会仅因410回滚自身，真hash/header/items/引用损坏仍安全拒。未据此声称已通过真实脱敏/回滚。
- protocol/export.ts:17–18保原wire1/source2/not_enabled；wire2仅source3/4/5/excluded，sha链不变。sealed正式材料仍非public交换，本次未重读无关export投影。

未知/未验：实际profile parity、source保字节、old4运行oracle、并发事务回滚、真实活动lookup与事件过滤由D独立执行窗验证；未扩审后续M6.4/M7、容器/模型/用户环境。
