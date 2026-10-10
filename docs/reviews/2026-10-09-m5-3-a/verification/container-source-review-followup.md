# 容器Host阻断后续源码复核

仅复核最终两文件，不覆盖首报告、不运行VM/探针/gates、不修改源码。首报告的默认Host阻断已在源码层修闭，实际正反由D确认。

Compose服务命令与healthcheck共用同一DETUNED_WEB_ORIGIN/default https://localhost:8443。helper严格解析完整HTTPS origin，无userinfo/path/query/hash，要求规范origin原值；HTTP Host=origin.host携带完整authority（非默认端口保留），与服务端authority一致。

网络目标仍来自严格loopback HTTPS --url；origin只决定HTTP Host及TLS身份，不改变连接目标/固定ready路径。TLS hostname从origin派生、去IPv6括号，显式hostname冲突拒；DNS使用该name SNI，IP SNI空但checkServerIdentity仍执行该IP SAN核验。明确ca、rejectUnauthorized:true，匿名、3秒/16KiB和安全错误保持，未放宽server或关闭TLS验证。

两个SHA与B7 owned_files一致（首次只读核脚本误按files数组取manifest导致assert中止，未写报告/运行产品；改按实际owned_files映射后核准）。以下仅源码结论，不冒Linux/PKI实证：

- `compose.yaml`: `47b74b0b7852fa31026874770e1fdb156d1dc32816079d3b953ad112f543344e`
- `scripts/integrations/deployment/container-health.mjs`: `603d2501b18af3325692e8b60324e3b2bb1f4432f6644b1470b1e9b96040a8d7`
