# M3.4-A.1 冻结契约

父已决定本包仅统一写入限流与显式配置，A.2持久资源配额紧接随后；不改变schema2、SQL、客户端重试或旧fixture。

标准buildApp/serve进程内唯一WriteRateLimiter按actor.id聚合跨credential/space，默认持续补充60 token/min、初始/最大burst20；不是固定分钟窗口。rate1..60000、burst1..10000安全整数，无关闭选项。ClockPort毫秒墙钟倒退不补且保持观测高水位，大跳最多补满。BigInt余额单位每token60000，elapsedMs*per_minute补充，不浮点。Retry-After为下一token恢复秒ceil、最少1；回退包含追平全局观测高水位等待，BigInt先差后clamp1..600000。触顶只表示有界再次检查，不保证一定可写。10000身份硬上限，测试可收紧；只回收补满身份，不逐出仍欠额者，新actor满容量返回instance429（完全补满恢复秒，同样1..600000），现有actor仍可用；无timer。

所有身份/空间执行角色及对象作者、resolver授权先admission；fresh幂等先existing replay/key冲突，再只读beforeAdmission(tx)对象权限，再扣1，最后action。成功replay不扣；business validation/rollback/取消到admission以后不退，429不扣。旧pre-admission校验保持；内容引用可见性与生命周期属businessvalidation，保持action。artifact先既有stage约束，最终refresh+权限+idem后admit一次，stage I/O不受本meter保护。

纳入space/thread/post/relation/artifact/redaction fresh、session.create、显式subscription/consumer创建与停用、admin actor/credential/membership/revoke。subscribe复用已有subscription+consumer不mutation则不扣；创建两者单次扣1。poll/ACK/read/bootstrap/offline/internalstorage不扣。

RATE_LIMITED429retryabletrue details严格安全{scope:actor|instance,retry_after_seconds:正safeint}；B设置HTTP Retry-After并提供protocol WriteRateLimits/default/resolver与CLI flags。重启reset，非耐久quota。

API WriteRateLimiter(clock,limits?,{maxActors?})/admit(actorId):void。AuthService末尾optional limiter默认new且readonly writeRateLimiter；IdempotencyService末尾optional limiter默认new；Space/Event/Admin默认取Auth持有对象或显式注入。保持旧孤立构造兼容；手动core组合必须显式同limiter，不承诺独立默认实例跨图聚合。生产组合根强制一个共享对象，无globalregistry。

A owner core新write-rate-limiter/admin-service、auth/idempotency/space/event/post/relation/thread/index，server/routes/admin.ts、新m3-write-rate-limit.test.ts、确切高量m2-thread-posts-read.test.ts配置、docs07/ADR040与本目录。B owner protocol/serverapp/CLI配置；C独验及统一构建。管理员业务从route逐项搬入core，权限/结果/错误与原事务事件语义不扩。未选新quota值、持久配额或M3.4B。
