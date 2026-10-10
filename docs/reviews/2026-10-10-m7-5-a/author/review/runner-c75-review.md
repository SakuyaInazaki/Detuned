# M7.5-A c75 actual runner 静审

冻结runner c75c6c6a77e219576d4fe8784ab577d4c51f0f01d7fda6578dbb69cc7368ad2b / plan749626fc04c673e755c4ae2cca8ca4f25f386f5a22c31048733584a7ac6eecba实际匹配。原三个问题已闭合：有效pnpm11 pm-on-fail=error/privateXDG globalYAML+CLI禁globalvirtualstore/sidecache；真实437source/555dist前后核对；158文件及suite/test/assertion全pass/无pending/todo，实际CLIexit0覆盖未忽略unhandlederrors。371copy与ownership精确并集匹配，158tests exact；工具哈希绑定。没有执行runner、安装、测试或新语法检查。

阻塞：run-clean-backend.py:394 的 successful cleanup 分支只有 status passed 且 left(True)>0 时执行；若尾部originalaudit/sizecheck耗尽absolute预算，status仍被置为passed，清退被跳过，最终receipt可能passed/fixture_retained=true且exit0。这违背本包成功必须实际清退/rootabsence的条件。最窄修复：passed但cleanup预算<=0时明确 failed/CLEANUP_DEADLINE保留root，或最后pass强制removed与rootabsence；不修改其它stage预算、测试断言或重跑路线。已同步root/D，待窄修冻结后增量审。
