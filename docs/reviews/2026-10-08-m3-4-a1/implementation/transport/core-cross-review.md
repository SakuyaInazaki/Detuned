# B → A 只读互审

本轮检查 write-rate-limiter/Auth/Idempotency/Space/Event/Admin 与 thread/post/relation 的 beforeAdmission、admin route 下沉差异。未发现可达阻塞。

默认孤立 Auth/Idempotency 构造有自己的限流器；生产 buildApp 在参数解析后仅构造一个，显式注入 Auth、Idempotency、Space、Event、Admin。Idempotency 的现有结果在 admission 前重建；fresh beforeAdmission 对象权限先查，随后扣余额，事务回滚不退 process-local 余额。线程修改、帖子修订/撤回、关系决议对象授权回调保留 403 优先；引用与生命周期判断保持业务位置。Space session、新 subscription/consumer 计费，已有 subscribe 恢复不重复计费；poll/ACK 未新增扣费；deactivateConsumer 是显式写。

Admin 六方法保留原授权、存在性、生成字段与输出，token 仅创建凭据返回；路由仍由同源 schema 校验输入。core typed 调用者仍须传合法请求对象，未另增运行 schema。

最新时钟修正已只读确认：全局 observedAt 高水位不因倒退下移；等待 ceil 包含 lagMs，clamp 1..600000 只限制提示，不增加余额；满容量 actor 条目才能驱逐，instance 满容量时提示最早可回收时间。极端倒退是重新检查间隔而非承诺可写。

限制：本审查不是性能/长期时钟漂移证明；最终 built CLI、全套与独立进程由 C 验证。
