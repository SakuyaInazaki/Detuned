# M4.1-B 附件客户端与 CLI（父已接受）

2026-10-08父接受有限范围。本机有限工程结果：542/542 项、72/72 文件，新17（A8/B4/C5）；current29 最终复合29/29，即四门禁及24原保留探针+1批准A.1 adapter，不称原第11成功。M4尚未完成。

Blob/FormData upload、metadata、完整下载与文件CLI入口已实现；持久artifact.create逻辑键复用同identity scope，服务端唯一裁决幂等/权限。上传25MiB/0byte、每attempt新FormData同key；下载从metadata起总deadline、固定content路径、不跟content_url、完整headers/EOF/bytes/SHA通过后返回。CLI输入sameFD nofollow/nonblock正规有限读；输出私有0600 temp/fsync/link无覆盖/parentfsync。postlink持久性故障保完整成品并失败退出。protocol直接依赖已锁定ajv-formats3.0.1例外如实记录；schema对象不变。

- [独立验收与实际失败分类](verification/verification.md)
- [机器结果](verification/final-results.json)
- [全部实际命令与原日志索引](verification/commands.json)
- [保护与清退](verification/integrity.json)
- [C五组边界](verification/independent-plan.md)
- [A全部真实source失败/修复](author/client/README.md)
- [B交付与文件故障](author/cli/README.md)

首专项16/17为B04前置漏key，父仅授权fixture补key后定向通过。首fullsuite541/542为旧KCLI03的16顺序CLI默认5s超时，父仅授权单case30s；原变体/零写/目录/每child10s全部不变，定向及第二fullsuite通过。唯一build/type/lint各1，fullsuite真实2，既有40MiB随suite两次，不改写首失败。

4599旧review材料及HEAD/SQL/archive/schema/5状态文档原字节保持；作者freeze匹配，允许source增改与旧KCLI03一行时间delta之外无变化。最终owned PID/私有目录0，finite144文本token格式零命中不等于通用秘密扫描。JSON新1MiB reader限本包artifact upload/get；content拒redirect，metadata沿旧JSON规则。metadata/content非原子、SHA非来源签名，25MiB缓存非端到端流/硬RSS；pending CLI SIGINT只证明未验证完成且未建本地temp阶段的OS断开。未运行600s、模型账户、外部宿主或多平台认证。
