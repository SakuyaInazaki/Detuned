根已实际阅读独验报告、gate summary、cleanup 要点、完整 core 原输出尾部，并核 DC01 第87–88行，正式接受 M6.4-C.1 有限历史评审目录与 Web 正式评审旅程范围。

接受版本 A1 / B3 / D5；完整 core 826 tests / 131 files 一次 exit0；browser28 unique（最终新4 B3同次通过、原七份24通过）；current25各一次通过（6原+19既有adapter，0新），与四项目gate合为current29。首类型次序、定位器、作者403与零casegrep证据全部保留，不写成所有首运行全绿。

最终 [独验报告](independent-report.md) SHA `d711b6b121211993ab6fbd7bfaa75394da6d06e7112986fd218cea2a4e4d82c6`。原v1与根准单处证据措辞差分保留：超长多字节request_id的422是同一真实SQLite服务直接调用getRequests的服务层反例；真实HTTP分页和整wire预算证据保持，不冒该反例为HTTP端到端。

源码/测试/执行计数不变，没有重跑。旧10296/SQL7/profiles2/HEAD/lock保护不变；记录的37 browser fixture与1 TLS fixture已清退，所有记录runner PID不存在。本接受不扩为C2/M7、真实模型/完整平台或无障碍认证。当前文档由A单一收口，后续仅文档/保护末核；整封和下一fresh待根明确授权。
