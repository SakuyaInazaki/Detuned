# TP独立探针准备

2026-10-06，父批准精确名字后准备thread-fixture.mjs/check-thread-http.mjs/check-thread-wal.mjs/check-thread-tools-cli.mjs。四文件node --check全部exit0；没有执行import/产品probe/build/正式tests。等待最终freeze。

HTTP独立静止91metadata集合，原storage limit100无next与limit50有next分别证明裁尾后游标last实际发送、完整遍历无重漏；另limit1-only false/cursor、两非末页Clock推进后换limit/budget、default，rawbody与共享serializer逐字节/真实reqid临界。after_id不存在签名lowerbound合法，严格v1/purpose/binding/sort/expiry/extra/max4096，exp等号/+1；metadata active/withdrawn/redacted/archived与不泄body，empty false/null及empty/nonempty最小metadata422，当前撤成员404/撤凭据401先于badcursor，全库读取指纹。

WAL独立barrier在thread旧行读后writer更改threadstate/version、posthead/lifecycle，证明thread/posts本页同snapshot，下一页当前metadata；无跨页冻结全集承诺。fixture显式合成stored metadata，不宣称旧HTTP生成其全部行，不调用开发者断言函数。

toolsCLI为安装Pi validator→真实execute/MCPstdio新旧call，8工具/rootobject-anyOf、新分支完整page/非法revision组合；旧getThread裸cursor正例/旧thread工具CLI默认50data保持。新CLI目录静止完整遍历→实际id/currentrevision ref→B2.1固定正文拼接，中途head更新仍旧内容，真实redaction HTTP后旧cursor410；严格数值错误exit2。

finalschema/export/fixture如有绑定问题，首失败原日志保留后只改自有新probe并向父说明；不改产品/旧tests或弱化中心tailcursor断言。原PR3/SR4/SQKV/current29路径保持，三遗失原历史夹具持续not_run，无重试ENOENT。尚未有任何新行为通过结论。
