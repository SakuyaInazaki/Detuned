# C 独立验收准备（未运行产品）

正式源码为 `tests/integration/m4-artifact-client-cli-independent.test.ts`，固定 helper 为 `tests/helpers/m4-artifact-client-cli-worker.mjs`。当前五个 case 仅草稿与 syntax 检查，不计通过；等待 A/B final freeze 后包含测试的 noEmit，再统一构建和专项。

1. 普通 contributor 的 binary/empty 上传、metadata、下载；独立 HTTP 原字节/SHA、0600、真实对象/event/idempotency 数量。
2. 每次新 CLI 进程持久 logical intent、改内容/MIME 服务冲突、同 actor token revoke/轮换恢复、不同 actor/space 隔离与实际权限拒绝。
3. 既存文件/link/directory 保护及两个 CLI 同新目标竞争；坏 input link/directory/25MiB+1 sparse 文件零 HTTP。
4. 固定私有 raw transport（不是核心服务）合法内容、错误 hash、截断；content_url trap 零访问、失败不发表成品、不半流重试。
5. 明确 content-entered IPC 屏障后的 shared client deadline/AbortSignal，实际 socket 关闭；built CLI SIGINT 限定为内容尚未验证完成、尚未写本地 temp 的 OS 进程断开，不声称 cooperative client abort 或写盘 crash 无 orphan。

B 正式覆盖 no-writer FIFO 和真实 post-link parent-sync fault（可信内部 seam，生产 CLI 不传）；不重复这两故障。A 覆盖 header/schema/retry/freshFormData/完整507/日期/JSON response 生命周期，不将 C raw fixture 冒称核心权限测试。新 ajv-formats 直接依赖与 lockfile 为父授权 delta。

当前没有 build、专项、全 suite 或 current29 运行。A 首合法 metadata validator 日期缺陷与继发屏障 timeout 须如实保留为开发期产品失败；草拟未接受方案的通过不能替代最终官方 validator 版本。
