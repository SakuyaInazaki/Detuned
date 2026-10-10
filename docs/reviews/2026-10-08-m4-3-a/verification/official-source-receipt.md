# 第一关独立来源 receipt

实际 fetch/checkout均0。C独立核HEAD `5badb15009ae1756c3afe0ae0cef1faafc290ccc`、tree `a9d30743edbe97adac9c8cb0811b648a0d9f6660`，worktree干净，14207个tracked文件SHA256登记。六个关键manifest逐一与固定commit blob比对一致：dsh-root/mcp-client/tools/system-prompt均0.2.1-alpha.1；Cordis4.0.5-alpha.1；MCP client依赖公开@modelcontextprotocol/client2.0.0。manifest均声明MIT，根MIT文本来自同tree；具体vendor许可blob与依赖闭合细节仍由A提案，未把根许可泛化所有第三方依赖。

固定公开fetch来源取A真实receipt，无remoteadd；不是独立网络身份/签名认证。主仓265source、51docs、5status、5429旧材料、SQL/archive4、schema2、dist208+208及HEAD相对fresh全部未变。owned `/private/tmp/detuned-m43-runtime.MU1a4q`仍活跃持有供后续父批准工作，未清、不算泄漏；未安装或执行官方代码、未重跑产品。机器原值见official-source-receipt.json与readonly-protection.json。
