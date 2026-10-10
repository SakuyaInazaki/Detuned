# 经父授权的旧 stdout UTF-8 夹具窄修

核对verification/observed-fullsuite-first-2026-10-06.stderr.txt的session-chain:39首失败：child回传文档出现replacement字符，服务端原文正确。旧helper:24逐Buffer out+=x / err+=x可在UTF-8码点内分割时分别解码，C确定split-byte proof日志已证明。不是业务材料损坏或M3.2幂等逻辑问题。

仅在child stdout/stderr注册data监听前设置setEncoding('utf8')，使用Node流decoder；断言、fixture、脚本与产品均未改变。精确diff及新sha256另存，历史首失败/旧C2review不覆盖。

定向第一次普通sandbox执行exit1 listen EPERM: operation not permitted 127.0.0.1，未到断言；原stdout/stderr/exit-code保留。随后同命令获得本机监听escalation执行exit0，1/1、1文件通过，567ms。两个实际attempt分开记录，不能把首attempt说成通过。没有build或全套复跑；C执行必要fullsuite第二次。
