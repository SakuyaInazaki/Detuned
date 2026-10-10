# Linux正式夹具可移植性窄修

D supplement-before READY且fresh字节绑定后，只改两mkdtemp前缀为os.tmpdir()+path.join；原私有mkdtemp/保护/cleanup与业务assert均保持。C01-7 Ajv沿同文件C01-8实际server→fastify→ajv-compiler依赖取值，不新增root依赖。

这是本包测试夹具修复，非生产服务缺陷。精确diff与before/after SHA在同目录；没有运行宿主/full/VM测试，实际Linux三文件定向由D完成，不填通过。
