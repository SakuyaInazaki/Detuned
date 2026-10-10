# B12 高量历史seed定向修正

C首全套失败证据：[原stderr](../../verification/observed-fullsuite-2026-10-08.stderr.txt)，B12预期25修订实际18；原完整日志保留，不改C证据。真实路径为tests/integration/m0-m1-r4-b-regression.test.ts。此用例检验多页脱敏/事件审计原子rollback，不检限流。

父授权仅B12局部app重新组合为显式受支持60000/min、burst10000共享limiter；保完整25次修订、脱敏与迁移历史断言。未改产品/全局helper/其它用例默认配置/静态fixture。源码file定向一次验证，结果另存high-seed-targeted.*，第二全套交C。

实际一次整文件源码定向82/82通过（exit0），含B12。仅本局部测试配置delta冻结，产品hash不变；详见high-seed-freeze-delta.json，未build/重跑fullsuite。
