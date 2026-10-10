# attempt2 独立核查：安装成功，非官方链执行

真实childexit0、117.641s、无stop_reason；argv/env与attempt1相同frozen/ignore-scripts/ignore-pnpmfile/公有registry。总allocated4557004800B，按原before累计新增4361957376B低于6GiB；C当前du吻合。六份归档monitor stdout采样最小free12145356800B高于6GiB，C当前独测free13882183680B；这是间隔监测而非持续空间预留。PGID48331无残留。

14208 tracked含14symlink逐项hash0变化，lock原样。C读实际链接metadata：Vitest4.1.8、TS6.0.3、tsx4.22.4、Vite8.0.16、MCPclient2.0.0，均位于owned source；存在binary不作执行成功。script禁用按实argv和supervisor核，未安装第三次、未执行官方dsh/rootconfig/build/test。

主仓只有父授权三份指南范围内delta（当前capture中两新增doc），源码/deps/lock/5429旧review/SQL/archive/schema/HEAD/status/dist无保护变化。官方source/deps仍active保留供2b，不清、不称泄漏。attempt1预算失败永存。详见installation-attempt-2-receipt.json。
