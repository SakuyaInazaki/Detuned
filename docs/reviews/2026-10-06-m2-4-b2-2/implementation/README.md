# B.2.2 实施证据索引

2026-10-06，父接受有限本地工程交付。最终core原指纹与protocol v2指纹由[独验](../verification/verification.md)核对；本索引在验证窗口后更新，不覆盖首证据。

- [core交付](core/README.md)、[core manifest](core/freeze-manifest.json)：业务专项10/10、source noEmit及before，旧Port/SQL/DDL无改变。
- [protocol交付与v2修复](protocol/README.md)、[原manifest](protocol/freeze-manifest.json)、[v2 manifest](protocol/freeze-manifest-v2.json)：旧正式不改；新contracts首7项与D08后8项、source noEmit、真实before及首失败日志保留。
- [D08首红](protocol/repair-d08-red.stdout.log)、[修复绿](protocol/repair-contracts-green.stdout.log)：1个测试11条差异、仅新HTTP cursor字符串交core校验，重复/unknown仍transport400。
- [最终覆盖](../verification/coverage.json)、[实际命令](../verification/commands.json)、[版本过渡](../verification/version-transition.json)：311/32、29/29 build-v2；48命令47成功+1独验日期probe失败，产品构建2次，首证据不改。

未运行的三原历史fixture、真实宿主模型与环境/大负载限制见[包入口](../README.md)。C.1仅[下一任务书](../next-task.md)已批准，未开工；不借证据整理改产品/tests/规范或运行tests/build。
