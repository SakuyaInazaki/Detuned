# M0/M1-R4-B.4-1 交付报告：恢复空间创建重试与重复启动

## 1. 任务概述与交付边界

- **任务编号**: M0/M1-R4-B.4-1
- **目标**: 仅关闭 `docs/reviews/2026-09-29-m0-m1-r8/README.md` 中的两个直接阻塞问题：
  - **R8-F01 (L01)**: 修复 `space.create` 正常同键重试，恢复实例级作用域（`instance`），返回 HTTP 201 与完整相同的初始空间结果，杜绝重复写入。
  - **R8-F02 (L02 / L08)**: 修复不可重放标记（`unreplayable`）跨重启自锁问题，支持规范的操作字符串绑定，同时规范文档中声明的白名单原因。
- **明确边界**:
  - **本轮不关闭 R8-F03、R8-F04、R8-F05**（对应 L03–L07），按 [`remaining-work.md`](file:///Users/sakimi/Desktop/Detuned/docs/reviews/2026-09-29-m0-m1-r8/remaining-work.md) 留待后续子包 R4-B.4-2 和 R4-B.4-3 交付。
  - **本轮不执行 R4-C**（U05、U06 保持为已知的后续契约缺陷，不放宽断言，不伪报成功）。
  - **本轮不宣称 R4-B 整体完成，不进入 M2.1**。

---

## 2. 缺陷根因与代码修复

### 2.1 R8-F01 (L01): 空间创建同键重试支持实例级作用域与一致性

- **根因**:
  1. [`SpaceService.createSpace`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/space-service.ts#L70-L113) 使用 `spaceId='instance'` 写入幂等记录。在先前的重构中，[`reconstructFromValidRef`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts#L960-L975) 和 [`reconstructResult`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts#L640-L650) 统一对 `kind === 'space'` 校验 `ref.space_id === spaceId`，导致 `spc_... === 'instance'` 校验恒为假并抛出 422 `RESYNC_REQUIRED`。
  2. [`createSpace`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/space-service.ts#L86-L112) 在创建空间并插入所有者 membership 后，storage 层会递增 `spaces.acl_epoch`（从 1 变为 2），但原返回语句直接返回未同步的内存对象 `{ space, revision }`（`acl_epoch: 1`），导致重放时从数据库加载的 `acl_epoch: 2` 与初始响应产生差异。
- **修复措施**:
  1. 在 [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts) 中：
     - 在 `reconstructFromValidRef` 的 `case 'space'` 中，针对 `space.create` 显式校验 `spaceId` 上下文必须为 `'instance'`（或缺省），对其它空间操作则校验 `ref.space_id === spaceId`。
     - 在 `reconstructResult` 的旧格式空间分支中同样对 `space.create` 允许 `'instance'` 作用域。
  2. 在 [`packages/core/src/services/space-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/space-service.ts#L108-L112) 中：
     - 执行 `tx.createSpace` 与 `tx.upsertMembership` 后，通过 `const createdSpace = tx.findSpaceById(spaceId) ?? space;` 读取事务内最新的空间对象并返回，确保初始返回与幂等重放返回的 `Space` 对象字节级严格相等。
  3. 在 [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts#L324-L338) 中：
     - 在已有引用校验与历史旧数据迁移逻辑中，修复局部变量遮蔽问题，对 `space.create` 严格核验作用域必须为 `instance`，并验证 `spaces` 表中空间的存在性。

### 2.2 R8-F02 (L02 / L08): 迁移不可重放标记避免重启自锁与文档对齐

- **根因**:
  1. [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts#L400-L435) 在迁移未记录完整快照的历史更新时，生成了 `{ op: operation }`（例如 `'thread.patch:thd_...'`），然而先前的 [`validateResultRef`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts#L248-L270) 仅允许 `obj.op === parsedOp.family`（`'thread.patch'`），造成下次重新启动数据库时，验证器将自己生成的合法标记判定为非法，触发崩溃自锁。
  2. [`docs/03-data-model.md`](file:///Users/sakimi/Desktop/Detuned/docs/03-data-model.md#L80-L86) 中列出了 `historical_content_cache_unrecoverable` 等未在系统代码 `REGISTERED_UNREPLAYABLE_REASONS` 中注册的原因。
- **修复措施**:
  1. 在 [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts#L250-L268) 中：
     - 规范 `validateResultRef` 对 `unreplayable` 的校验逻辑：若 `obj.op` 包含目标 ID（`:`），必须精确匹配上下文中的 `operation`；同时向前兼容遗留的 family-only 格式。
  2. 在 [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts) 中：
     - 在生成或迁移 `unreplayable` 标记时，在写入前均调用 `validateResultRef(operation, ref)` 进行前置断言，避免生成无法被系统识别的脏标记。
     - 若旧标记为 family 模式且上下文包含具体 targetId，自动升级为规范的完整 `operation` 格式。
  3. 在 [`docs/03-data-model.md`](file:///Users/sakimi/Desktop/Detuned/docs/03-data-model.md#L83) 中：
     - 文档与实现完全对齐，明确注册原因仅包含白名单内的 `historical_relation_version_unrecoverable` 与 `historical_thread_version_unrecoverable`。

---

## 3. 修改的文件清单

- [`packages/core/src/services/idempotency-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/idempotency-service.ts):
  - `reconstructFromValidRef`、`reconstructResult` 支持 `space.create` 实例作用域。
  - `validateResultRef` 规范 `unreplayable.op` 绑定规则与向下兼容。
- [`packages/core/src/services/space-service.ts`](file:///Users/sakimi/Desktop/Detuned/packages/core/src/services/space-service.ts):
  - `createSpace` 返回事务提交时最新的 `Space` 实体，保证初始响应与重放完全一致。
- [`packages/storage-sqlite/src/bootstrap.ts`](file:///Users/sakimi/Desktop/Detuned/packages/storage-sqlite/src/bootstrap.ts):
  - 空间引用校验与迁移逻辑，修复变量遮蔽，增加空间存在性及 `instance` 作用域断言。
  - `unreplayable` 引用生成前统一通过 `validateResultRef` 校验。
- [`docs/03-data-model.md`](file:///Users/sakimi/Desktop/Detuned/docs/03-data-model.md):
  - 对齐 `unreplayable` 注册原因白名单。
- [`docs/progress.md`](file:///Users/sakimi/Desktop/Detuned/docs/progress.md):
  - 追加 R4-B.4-1 交付进度记录与状态声明。
- [`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts):
  - 补充 8 项针对 L01、L02、L08 的正式集成回归测试。

---

## 4. 验证与探针执行结果

### 4.1 本轮 R8 探针 (`docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs`)

运行命令：
```bash
node docs/reviews/2026-09-29-m0-m1-r8/check-b3-gates.mjs
```

输出摘要：
- **L01 通过**: `Normal space.create retry uses instance scope and returns the original result`
  - `status: 201`, `reopened_status: 201`, `same_result: true`, `no_extra_writes: true`。
- **L02 通过**: `An accepted migration must not write a marker rejected by the next startup`
  - `first_rejected: false`, `marker_kind: "unreplayable"`, `second_rejected: false`。
- **L08 正向对照通过**: `Normal thread retries and recoverable full legacy results remain supported`
  - `normal_status: 201`, `full_legacy_status: 201`, `both_exact: true`。
- **L03–L07 保持预期失败**:
  - L03 (主键丢失当前库未前置拒绝), L04 (旧嵌套关系缺少版本), L05 (历史时间戳冲突未检测), L06 (错误绑定未拦截), L07 (编码器与未配对字段校验绕过)。
  - 符合任务约定：L03 归入 R4-B.4-2，L04–L07 归入 R4-B.4-3。

### 4.2 全量自动化测试套件 (`pnpm test:all`)

运行命令：
```bash
pnpm test:all
```

输出结果：
- **11 个测试套件，99 项测试全部通过（0 失败）**。
- 其中 [`tests/integration/m0-m1-r4-b-regression.test.ts`](file:///Users/sakimi/Desktop/Detuned/tests/integration/m0-m1-r4-b-regression.test.ts) 35 项测试全部通过。

### 4.3 历史探针回归

1. **R1–R3 46 项检查**:
   - `node docs/reviews/2026-09-28-m0-m1-r3/check-invariants.mjs` -> **10/10 全部通过**。
2. **R4 契约检查**:
   - `node docs/reviews/2026-09-28-m0-m1-r4/check-unfinished-contracts.mjs` -> **6/8 通过**（U05/U06 保持待解决）。
3. **R5 数据缺口检查**:
   - `node docs/reviews/2026-09-28-m0-m1-r5/check-r4b-gaps.mjs` -> **9/9 全部通过**。
4. **R6 升级边界检查**:
   - `node docs/reviews/2026-09-28-m0-m1-r6/check-upgrade-boundaries.mjs` -> **10/10 全部通过**。
5. **R7 历史兼容与完备性检查**:
   - `node docs/reviews/2026-09-29-m0-m1-r7/check-b2-completeness.mjs` -> **7/7 全部通过**。
   - `node docs/reviews/2026-09-29-m0-m1-r7/check-legacy-fixture.mjs` -> **1/1 通过**。

---

## 5. 待办事项与就绪声明

1. **后续数据可靠性子包**:
   - **R4-B.4-2**: 关闭 R8-F03（L03），实现对缺失唯一约束/主键的当前库在变更前分类为 `corrupt` 并安全拒绝。
   - **R4-B.4-3**: 关闭 R8-F04、R8-F05（L04–L07），补齐旧嵌套关系安全拒绝/可信恢复、历史时间戳冲突回滚、同空间实体绑定防篡改、编码器边界严密性。
2. **后续契约包**:
   - **R4-C**: 关闭 U05（关系枚举边界校验）、U06（HTTP 截断流报错拒绝）。
3. **M2.1 就绪状态**:
   - **未就绪**。本回合严格限定在 R4-B.4-1 范围，不宣称 R4-B 全部完成，不提前推进 M2.1。
