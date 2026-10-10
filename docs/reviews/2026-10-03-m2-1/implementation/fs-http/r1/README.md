# M2.1-R1：multipart metadata错误状态窄修

产品/正式测试重新冻结。只修改server/routes/artifacts.ts与m2-artifacts-http.test.ts，before.json/after.json保存范围hash；未改其他产品或历史17/17、209通过证据。

安装版@fastify/multipart 9.4.0 `index.js:26`定义`FST_INVALID_JSON_FIELD_ERROR`为406；其onField在JSON截断/解析失败时抛出。附件合同将非法metadata定义为VALIDATION_ERROR400，406不适合此请求输入错误。route仅按这一个已知parser code映射既有400，其余业务/传输/parser错误原样保留，单file413不变。

正式新增一项：file先于metadata，text/plain与application/json两种Content-Type，原始合法JSON+空白4096bytes成功201、4097bytes拒绝400、坏JSON拒绝400；每次拒绝比较完整artifact/event/artifact.create幂等记录与objects列表不变、stage为空，同时确认file超限仍413。

修复前该正式用例确实失败`expected 406 to be 400`，证据pre-fix.stdout.txt/stderr.txt。修复后 `pnpm exec vitest run tests/integration/m2-artifacts-http.test.ts` **8/8通过**（target-tests.*），`pnpm --filter @detuned/server typecheck` exit0（typecheck.*）；局部diff whitespace通过。loopback专项采用已授权require_escalated。

未运行build、29命令或全suite；由独立Agent在停写版本重新构建验收。没有修改原observed/probe、依赖、状态入口、SQL/archive或提交/推送。M2.1整体结论仍由父Agent决定。
