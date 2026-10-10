# C.1 最终独验准备矩阵

2026-10-06，fresh baseline已实际捕获：129source/36currentdocs/5mutable、2677既有不可变证据（完整B2.2）、4SQL/archive/2schema、dist208tracked+48untracked，HEAD基线dirty保留。H-R1由本Agent实施自验7/7，独立验收交父派其它Agent；C.1仍由本Agent独立验收，不混同两身份。

最终执行前核core/protocol/H-R1 freeze hashes并捕稳定当前版本。新生成器scripts是source，最终保护枚举纳入scripts目录；首次baseline时该目录空，无遗漏旧source。最终统一build/fullsuite由父发执行信号后运行一次，旧本包自验不计fullsuite次数或新增unique formal总数。H-R1普通formal依赖持久归档/当前安装，无git/网络/旧tmp/token；再生成独立线需固定Git对象+当前外部依赖另列。

| 独立范围 | 真实证据意图 |
| --- | --- |
| FC01选择/compat | 合法同space open/archived完整focus metadata、省略无新增key；unknown/foreign404、空/白/非字符串400、重复/unknown transport400；当前成员/read/revoked优先无写 |
| FC02 pins/sources | 多thread pins仅pin Post自身归属，stored重复/顺序保留；跨thread fixed source_refs保留，newer/withdrawn/redacted安全projection |
| FC03 failures | 先thread过滤再5候选，更多其它thread较大id干扰不能吞焦点；按id DESC而非created_at，active/current |
| FC04 challenges | 多于10其它thread早期关系干扰；任一端焦点、两端同space；OR双端焦点仅一次，created_at ASC,id ASC限10在SQL过滤后；fixedrevision/current墓碑安全投影 |
| FC05 activity | 空间/其它thread/非public/review-artifact事件干扰；thread.*本体、post.*所属、relation.*任一端最新5→seqASC；同snapshot high-water；非先spaceN再filter |
| FC06 rawbody | 4K/64K/default真实request_id转义/fullcompact envelope；focus metadata必需不能删；巨大title422；规则省略保留可容纳optional与尾裁activity→failure→objection→pins；不出context分页cursor |
| FC07 WAL/checkpoint | 双连接writer在旧Thread读后改metadata/材料/规则/seq；本页同旧snapshot、下一页当前；checkpoint仍space highwater、poll/ack不变、全DB读指纹 |
| FC08真实入口 | 安装Pi validator→executor完整Page、严格 emitted ISO局部FormatRegistry finally恢复；MCPstdio新/省略focus；共享client与真实CLI --focus-thread链/旧无focus链、8tools与严格numeric errors |

原A check-context-http.mjs中missing focus400与当前404冲突；其旧CX03大规则422已在B.1经父批准迁移为ref重组，不回写旧脚本。原字节留存，独验新增明确映射的版本证据而不把旧断言运行当通过。current29原manifest列表没有该A probe，旧PR3/SR4/TP HTTP-WAL-tools/SQKV原路径照跑；确遇旧unsupported断言只报告/版本化，不自改旧证据。

新core/protocol定向实际计数依据stdout（不预填），最终唯一formal/fullsuite/typecheck/lint/原current29、AD动态route/body/warnings按输出登记。旧历史3类兼容由H-R1持久新source实际闭合覆盖；原capture来源区别保留，不重新执行遗失路径脚本。

Node22/干净安装/远程CI/四真实宿主模型/100k负载不扩；pins/source无cap与SQL VM/CPU硬limit无承诺。最终source/docs冻结前后保护hash，5mutable仅后续授权收尾单列，dist唯一build产物单列。此准备文档不宣称已执行C.1产品checks。
