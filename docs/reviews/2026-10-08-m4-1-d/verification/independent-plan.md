# M4.1-D 独验准备（不运行首候选实验）

C准备4组正式，tests/integration/m4-write-consume-independent.test.ts 与fixed helper tests/helpers/m4-write-consume-worker.mjs。当前helper syntax通过，未运行/构建；A两首反例由A独占，不重复。

1. 真实HTTP pending及acked消费者停用，与其关联delivery batches同事务退场；events/posts/peer consumer/batches原样。重复不存在成功，旧ACK/poll拒绝不复活，同consumer_key重新subscribe创建新ID，按明确start now从当时高水位。
2. 两space受限同actor和otheractor拒绝零consumer/batch/events/posts/subscriptions mutation。父批准私有TEMP BEFORE DELETE ON consumers trigger，仅SQL SELECT关联子batch count传固定纯JS观察函数（只存数字），再RAISE(ABORT)；实际观察0后异常，rollback恢复子/父和peer。finally drop，不持久DDL/新产品开关/任意SQL IPC。
3. checkpoint_token只来自既有getContext；有效actor/space签名按T0高水位启动，不吞之后write。非法start/token组合HTTP无mutation、错误actor/space拒，existing consumer复用不重定位。组合schema/core规则等父精确冻结后对接，不自创签名接口。
4. B已覆盖CLI基础空间/主题/filter/pollwait正确wire，C集中真实server等待：原pollWithWait调用后实际首次await与无pending前置屏障，shared client AbortSignal settle、资源回收、ACK未推进；session真实上游201完成后proxy丢响应，typed/client或新CLIonly1+sessionrow1。可附有限正例，不重复B无请求坏参数矩阵。若CLI SIGINT仅是OS断开，不混cooperative AbortSignal。

固定helper仅server/proxy/client模式+白名单操作，不能任意执行SQL/函数/命令。私有env不继承生产token/config；token内存、不prettyprint。待core/protocol父最终方案与作者freeze后才noEmit/build/新专项与统一门禁。保护4877旧证据、SQL/schema2/HEAD/现dirty/dist；不重复M3重签/ACK矩阵、600秒、模型或额外大材料。
