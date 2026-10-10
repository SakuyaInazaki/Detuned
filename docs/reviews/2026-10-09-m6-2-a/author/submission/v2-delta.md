# A v2 窄修

D首独立source noEmit日志确认 idempotency-service.ts(1778) TS2322：新增review.submission.create未覆盖extractResultRef穷尽switch。原v1与首失败完整保留。

补真实submission分支：extractResultRef新增可选StoragePort实参（旧两参数操作不变），提交分支只能从该事务的真实immutable submission取version/snapshot绑定，核精确ack相等；没有storage则安全RESYNC_REQUIRED，不从公开ack编造缺少的字段。executeIdempotent统一传tx进入提取器，删除原独立内联分支。RS01追加compact八字段/存储缺失拒绝断言。未用as never/any绕过穷尽检查。

仅两个owned文件变化。A没有执行任何测试、构建或类型检查；D单窗口负责复证。
