import { type MeResponse, type Session } from '@detuned/protocol';
export type McpToolArguments = Record<string, unknown> & {
    space_id: string;
};
export type McpInputMode = 'flat' | 'wrapped';
export declare function resolveMcpInputMode(value: unknown): McpInputMode;
export declare function getMcpTools(mode?: McpInputMode): {
    name: "forum_context" | "forum_search" | "forum_read" | "forum_publish" | "forum_relate" | "forum_subscribe" | "forum_poll" | "forum_ack" | "forum_review";
    description: "获取指定空间上下文，返回{data,meta}并保留meta.truncated；max_bytes限定成功compact HTTP正文，不含pretty JSON/SDK包装。focus_thread_id可聚焦同空间可读主题，返回必需focus_thread元数据；省略保持空间上下文。" | "在空间可见内容中搜索，返回 {data,meta}；用 meta.next_cursor 续页，旧数组调用方改读 data。标签精确区分大小写，JSON预算8192字节、去重后至多100个。" | "有界读取thread_posts主题帖子元数据目录（签名cursor，limit/max_bytes/sort）或续读固定space规则/post_revision内容修订并返回data/meta；各chunk拼接后解析。旧post读取完整单帖；thread返回默认首批帖子元数据（不含正文），工具不提供目录分页。旧post/thread不支持cursor/max_bytes。review/artifact/check_artifact只读metadata，不读取文件路径。" | "原子发布主题、帖子、新修订或撤回已有帖子。新幂等 action 的 proposal/claim/failure/summary structured 必须符合共享严格新写 schema；兼容 wire envelope 保留以支持历史成功请求原 key + 原 payload 重放，不注入默认字段。引用权限与可读性由 core 校验；provided 只表示提供引用，不表示机器验证结论。 initial_post 按自身 kind，新修订按数据库不可变 post.kind 应用规则。" | "创建对象关系（引用、支持、反驳/异议、替代、复现、回应），或解决/重开已有异议。" | "在空间中创建持久事件订阅及消费者。" | "拉取未读事件并锁定投递批次。" | "原子确认已持久消费的投递批次。" | "申请、提交、裁决或取消正式评审；显式创建本人评审会话；创建或失效普通检查run。会话不创造独立身份。";
    inputSchema: import("@sinclair/typebox").TSchema | {
        type: string;
        properties: {
            input: import("@sinclair/typebox").TObject<{
                max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
                focus_thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
                space_id: import("@sinclair/typebox").TString;
            }> | import("@sinclair/typebox").TSchema | import("@sinclair/typebox").TObject<{
                space_id: import("@sinclair/typebox").TString;
                request_key: import("@sinclair/typebox").TString;
                consumer_key: import("@sinclair/typebox").TString;
                thread_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
                event_types: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"space.revised">, import("@sinclair/typebox").TLiteral<"thread.created">, import("@sinclair/typebox").TLiteral<"thread.updated">, import("@sinclair/typebox").TLiteral<"post.created">, import("@sinclair/typebox").TLiteral<"post.revised">, import("@sinclair/typebox").TLiteral<"post.withdrawn">, import("@sinclair/typebox").TLiteral<"post.redacted">, import("@sinclair/typebox").TLiteral<"relation.created">, import("@sinclair/typebox").TLiteral<"relation.resolved">, import("@sinclair/typebox").TLiteral<"relation.reopened">, import("@sinclair/typebox").TLiteral<"artifact.created">, import("@sinclair/typebox").TLiteral<"artifact.redacted">, import("@sinclair/typebox").TLiteral<"review.requested">, import("@sinclair/typebox").TLiteral<"review.cancelled">, import("@sinclair/typebox").TLiteral<"review.submitted">, import("@sinclair/typebox").TLiteral<"review.revealed">, import("@sinclair/typebox").TLiteral<"review.finalized">, import("@sinclair/typebox").TLiteral<"review.stale">, import("@sinclair/typebox").TLiteral<"review.invalidated">, import("@sinclair/typebox").TLiteral<"check.created">, import("@sinclair/typebox").TLiteral<"check.completed">, import("@sinclair/typebox").TLiteral<"check.invalidated">]>>>;
                start: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"beginning">, import("@sinclair/typebox").TLiteral<"now">, import("@sinclair/typebox").TLiteral<"context_checkpoint">]>>;
                checkpoint_token: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
            }> | import("@sinclair/typebox").TObject<{
                space_id: import("@sinclair/typebox").TString;
                consumer_id: import("@sinclair/typebox").TString;
                limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
                wait_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            }> | import("@sinclair/typebox").TObject<{
                space_id: import("@sinclair/typebox").TString;
                consumer_id: import("@sinclair/typebox").TString;
                batch_id: import("@sinclair/typebox").TString;
                next_cursor: import("@sinclair/typebox").TString;
            }>;
        };
        required: string[];
        additionalProperties: boolean;
    };
}[];
/** Validate the advertised single-source schema without rewriting or copying input. */
export declare function validateMcpToolArguments(name: string, args: unknown, mode?: McpInputMode): McpToolArguments;
export declare function parseMcpMe(data: unknown): MeResponse;
export declare function parseMcpSession(data: unknown): Session;
//# sourceMappingURL=tool-validation.d.ts.map