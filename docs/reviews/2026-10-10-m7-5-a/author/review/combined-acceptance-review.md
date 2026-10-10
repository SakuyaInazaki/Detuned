# M7.5-A 文件级组合验收独验

接受有限组合证据：原 normal-first 的 142 个完整通过文件/904 cases，加最新 related-16 的 16 个完整文件/73 cases，覆盖精确 158 文件/977 cases，组合 fail/pending/todo 为零。独立从两份原 JSON 重建文件集合，最新集合恰等于原失败文件；逐项 ancestorTitles/title/fullName 与 case 数保持，每完整文件 status/message/all assertions 合格，并实核全部 158 源文件 repo/exactwork/sourceSHA 一致。未按单个失败 case 挑选补齐。

latest related 实际 exit0/null、actualclose/groupabsence，98.288139292 秒；final100.942890125 秒，source437/dist555保持，peak logical876533759/allocated1001414656，均低于2GiB。stage worker1/文件串行、900秒及原断言/timeout不变；全部 raw 已安全归档，related JSON SHA7ad5ca388f8d419fa45f421c11b4ce32ec0f2019629beaffa68d754422f6492e；combined-coverage SHA37834ca60d6a214b816f81cf3864196855d524b0171526820e8b3422482fd782。

此前 full-sandbox886/87/4pending、normal915/62/0pending、复制/观测器失败与 v3 full 被 FileNotFound 中断均保留，后者没有完整 JSON、不是业务 full 结果。本结论不是单次全绿，也不是无失败的 clean pipeline；安装/配置/SQLite/九build与此组合测试属于绑定固定Node22.19.0 Darwin arm64、既有pnpm11.7.0的组合证据。不扩大到Web/当前Linux/全Node22/模型/完整四宿主，平台保护不关闭。

root 仍未授权本轮 fixture 清退；最终 absence/清退及metadata待独立收据。未运行测试或查询进程。
