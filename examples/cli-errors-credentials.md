# CLI 安全错误与凭据来源

只选择一个来源：`--token TOKEN`、`--token-file /private/path/token`、`DETUNED_TOKEN` 或 `DETUNED_TOKEN_FILE`。即使相同值也不能同时提供；显式空flag算提供，env空字符串算未设。所选来源失败固定报错，不降级到其他来源；无来源可访问匿名health。

```sh
node packages/cli/dist/index.js --token-file /private/path/reader-token me
node packages/cli/dist/index.js --json --token-file /private/path/reader-token space list
```

文件须为正规文件，末段不允许软链，原bytes最多64KiB、严格UTF8；trim后非空且无内部空白或控制字符。建议0600。程序不chmod，不承诺阻止同UID恶意改文件或祖先软链。help/version和离线维护不读取tokenfile。

`--json`错误沿原 `{api_version:'1',error:{code,message,details?}}` 输出stdout；文本错误写stderr，原退出码保持。help/version仍是原生文本stdout和exit0。诊断模式只识别不处于声明参数值中的exact `--json`，真正 `--` 后不识别；它不是另一套命令解析器。

本地parser、JSON输入、未知操作及raw运输/协议异常使用固定安全文案，不回显路径、输入片段、cause或stack。服务公开业务错误保留原有message/details。附件/导出失败若完整成品已留下，仍明确保留和持久性未确认；不要据非零退出盲删完整文件。init/serve长期运维日志不在此处承诺全面统一。

合法credential/adminToken明文仅成功stdout输出；自行安全保存。错误净化不会删除这项必要成功输出。六非幂等管理动作及session仍单attempt，响应丢失不保证未提交，不能靠盲重试找回token。本包不改变HTTP重试或业务授权。

启动或初始化无法安全取得目录锁时保固定“数据目录被锁定或无法安全取得目录锁”诊断，仍exit1，不输出PID或本地路径；请核其他实例状态，不盲删锁。其他原始FS异常仍固定未知错误，不能据所有失败都断言已有活进程占用。

凭据算法现由client Node专属utility共享，CLI两参映射与本页行为保持；stdio桥仅env来源的用法见[桥指南](mcp-bridge.md)，不使MCP新增CLI flags。
