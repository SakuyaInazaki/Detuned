# A → B 只读互审

检查protocol/write-limits.ts、server/app.ts、CLI serve配置、m3-write-limits-contract.test.ts及benchmark组合根。未发现具体可达阻塞；未修改B产品，也未运行B测试。

resolver严格unknown键/null/array/安全整数范围拒绝，无disable、不回显值。buildApp在访问storage前验证writeRateLimits，随后一个limiter显式注Auth/Idempotency/Space/Event/Admin。RATE_LIMITED429且scope符合、retry1..600000才产生Retry-After，既有quota/poll错误不伪造actorheader。CLI两flags先固定诊断解析再dataDir mkdir/lock/dbopen，未读env/复制扣额业务。benchmark高量显式60000/10000；静态fixture未改。

B源码首次测试的错误端点和未skip built case已明确保原记录，修正只用真实GET /spaces和source-only skip。B五项中builtCLI由C统一构建后验证，不能把source skip称CLI通过。现client重试未改：429仍自动按已有策略重试，与本包持续补充的Retry-After相容；极端回退cap不保证到点有token。最终验收以C门禁/父接受为准。
