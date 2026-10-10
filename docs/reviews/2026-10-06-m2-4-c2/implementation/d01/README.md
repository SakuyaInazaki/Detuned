# D01 步骤1–3 窄演示

已只读核 examples/shortest-path-scenario.md 与 m1-discussion、M2 typed/knowledge 和 C2 新会话链证据。旧 m1-discussion 是 inject：B 发 objection、A 修订，不是本次要求的 B typed failure 与 C 独立查询后发布；C2 session 链发现材料但不发布改进。未找到可替代的完整三角色 HTTP 证据。

新 scripts/scale/d01.mjs：每次 mkdtemp 小型真实 SQLite + loopback；controller 创建主空间并仅设置三个 ordinary contributor/read+write 凭据（内存 token）；A HTTP 错误 proposal；B HTTP 手算证据与 provided failure；新 C 子进程只接 baseURL/token/space_id/query，无答案 ID，通过 search→固定修订读取，从 failure evidence 发现 A 与证据，再发布 cites 两个精确 ref 的 Dijkstra pop-settle/松弛 proposal。固定内容重组 SHA256、请求/响应、事件序列保存 ledger；不输出 token。临时 DB 含测试凭据哈希，不进仓库。

执行：node scripts/scale/d01.mjs。成功 stdout 指向临时 ledger.json；首失败保留 failed.json。当前只做 node --check exit0，尚未实际演示；等父确认规模窗口不被干扰，由 verify 执行一遍并独立核账本/DB/论坛结果。不是模型实验、研究突破、步骤4–7或正式评审通过。
