# 下一任务：M3.3-B.2 本地管理员向新空实例逻辑导入

父已确定本包范围，技术冻结项下轮裁定；B.1 已于 2026-10-07 接受，计数以 C 最终报告为准，见[本包 README](README.md)与[验证证据](verification/)。不声明完整 M3.3 已完成。事实入口：planning/m3-3-b2-facts.md、planning/frozen-contract.md、docs07 §7、docs08。

## 范围

实现受控本地管理员维护操作，将已完整校验的 detuned-space-export v1 导入新空实例；保留稳定研究对象 ID、修订、关系及解决历史、已投影引用与墓碑。首包不做已有实例合并、身份凭据迁移、消费/pending/幂等恢复、正式评审资格恢复、完整迁移演练或 M3.4。逻辑白名单不能替代允许敏感历史 bytes 的物理 backup。

来源 actor IDs 只作归属证据：来源身份默认禁用，无凭据、成员权限及 reviewer eligibility。新实例建立独立本地 human 管理员及一次明文 admin 凭据输出，沿 init 的敏感输出边界，不入 manifest/日志/全局配置。普通 review/decision 帖与 not_enabled 声明不得变成正式批准。导入内容始终是不可信研究数据。

附件仅 manifest；禁止按 content_url 或正文 URL 抓网。父应选显式本地可验证 bytes 输入或缺 bytes 明确 missing 的语义；墓碑不恢复原文，ready 不得虚构可下载。当前 export 缺失的内部材料不能从占位数据伪造为已恢复。

## 开工一次冻结

先读最新 AGENTS、README/docs00/08/11、progress/reviews 与上述事实；主代理定路线，gpt-6.1-sol 子代理只执行冻结所有权。短规划须核实际必填/FK、FTS/本地 hash、bootstrap admin以及目录门禁；不先建空接口。

父明确输入/输出与错误契约、严格 v1/schema2 兼容（legacy/future/unknown/corrupt拒绝，不升级源材料）、record重复/缺失/引用/版本一致性、projected与source_content_hash的本地表示、禁用来源占位身份与冲突、provenance持久位置及 imported语义。现 schema 无专用 provenance/status 字段，不可假称已有。

另须冻结 bounded文件decoder/背压/取消/限额，是否从现 HTTP client 抽取纯完整校验；不构建全空间巨型数组。附件输入安全路径/hash/size和missing选择不擅定。发布到新目录须独占、无覆盖、staging先完整校验和事务落库，再文件/目录持久化与 readiness；兼容现 gate/DirectoryLock，不用 access+rename。明确各失败边界、post-unlink持久性未确认诊断，以及完整实例但一次token丢失的处置。

建议所有权：A负责本地导入业务/SQLite/FS协调及相关正式回归，B负责共用 decoder/CLI/契约与示例，C负责 fresh baseline、独验、统一build与最终门禁；精确文件由父开工冻结，schema修改必须单独裁定。逻辑导入不强迫套 HTTP 业务写 API 丢失稳定历史，亦不把业务规则复制到 CLI。

## 真实验收

完整 v1 经本地真实 CLI 得到新的可启动实例：研究ID/修订/关系版本保真，resolution按ID输入不要求版本顺序；projection与墓碑不会泄漏源原文；来源身份禁用、无继承授权，本地 admin 可创建普通凭据。敏感探针与未知研究正文边界准确；不宣称扫描任意正文秘密。

逐项拒绝坏UTF-8/CRLF/缺LF/end后extra、hash/count/seq错误、重复ID/缺FK/跨空间已知引用、未知版本、路径穿越/软链/附件hash不符、目标已存在及源目标别名。源导出/附件保持；取消、事务失败、发布各边界故障不能部分成功或覆盖既有目录，不把半套作为正常实例启用。无bytes附件不得ready，墓碑不入可搜索原文。核心CI无模型调用；保留所有失败证据，最终结果由父验收，不把完整迁移/T12/M3.3虚报为完成。
