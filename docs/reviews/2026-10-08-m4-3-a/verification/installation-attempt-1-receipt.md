# 2a 安装 attempt1：预算中止，不成功

唯一实际installer退出 -15，stop_reason=size_budget，101.708s。初始allocated195047424B、结束2714583040B，新增2519535616B超过2147483648B预算；C当前du独立复核总2714583040B。自有PID/PGID47096已无残留。未另起安装、执行官方代码或产品门禁。

实际命令带frozen-lockfile/ignore-scripts/ignore-pnpmfile、公有registry.npmjs.org及自有store；supervisor显式最小env不继承token，npm用户/全局与Git全局配置均禁读。日志未见生命周期脚本执行行；这是flags和已读supervisor机制证据，不冒称任意系统进程全面审计。node_modules/store为部分产物，不能称完整依赖可用。

A14208 tracked记录含14 symlink（readlink hash）；C旧14207是Path.is_file()口径，跟随13个指向文件的symlink、漏掉唯一目录symlink.claude/skills，不能称14207全为正规文件。实际14194正规文件+14 symlink=14208，逐项独立hash0变化，原14207跟随内容hash也0变化。lockSHA2562893d71a9ef07d2d72d47b2199e581b9e8d90638a15ee151908eebf69dfc637c原样。

主仓source/docs/状态/5429旧review/SQL/archive/schema/dist/HEAD全部相对fresh未变。源码/private/tmp/detuned-m43-runtime.MU1a4q与依赖/private/tmp/detuned-m43-deps.avgrrqf7继续active持有，未删、不作泄漏或已清退宣称。下一步由父决定，机器详情见installation-attempt-1-receipt.json。
