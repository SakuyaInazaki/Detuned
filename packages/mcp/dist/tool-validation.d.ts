import { type MeResponse, type Session } from '@detuned/protocol';
export type McpToolArguments = Record<string, unknown> & {
    space_id?: string;
};
export type McpInputMode = 'flat' | 'wrapped';
export declare function resolveMcpInputMode(value: unknown): McpInputMode;
export declare function getMcpTools(mode?: McpInputMode): {
    name: "forum_context" | "forum_search" | "forum_read" | "forum_publish" | "forum_relate" | "forum_subscribe" | "forum_poll" | "forum_ack" | "forum_review";
    description: "非objection来源challenge的issue/impact可为null/missing_fields，表示摘要字段不可用而非帖子非法，应读固定正文。获取指定空间上下文，返回{data,meta}并保留meta.truncated；max_bytes限定成功compact HTTP正文，不含pretty JSON/SDK包装。focus_thread_id可聚焦同空间可读主题，返回必需focus_thread元数据；省略保持空间上下文。" | "在空间可见内容中搜索，返回 {data,meta}；用 meta.next_cursor 续页，旧数组调用方改读 data。标签精确区分大小写，JSON预算8192字节、去重后至多100个。" | "me/spaces无需space_id提供本人身份和空间起点；relation读六类型关系；post_relations按固定revision有界读取in/out/both；consumer_lookup按本人key及原过滤器多重集只读找回，不ACK/创建/重定位，resync_required仍需按消费规则处理。post返回解析对象，post_revision的chunk须拼完整后JSON.parse。有界读取thread_posts主题帖子元数据目录（签名cursor，limit/max_bytes/sort）或续读固定space规则/post_revision内容修订并返回data/meta；各chunk拼接后解析。旧post读取完整单帖；thread返回默认首批帖子元数据（不含正文），工具不提供目录分页。旧post/thread不支持cursor/max_bytes。artifact/check_artifact只读metadata；post_revision_artifacts按固定revision读取可见附件目录；artifact_content只读验证完整blob(≤1MiB)后的有界JSON片，不执行/落盘；utf8默认完整fatal解码并保留BOM，二进制显式base64，各段独立解码再拼接；offset>0必须expected_sha256，integrity_verified仅验证blob完整性，不代表研究结论；超限用CLI artifact download或提取小证据。view按name读取findings/failures/open-questions现有投影；relation_history按version/id升序有界读取resolve/reopen记录和安全reason_ref状态。review_snapshot的id取assignment.snapshot_id；review_submission的id取提交确认submission_id；其他单轮review读取id取request_id。" | "原子发布主题、帖子、新修订或撤回已有帖子。新幂等 action 的 proposal/claim/failure/summary structured 必须符合共享严格新写 schema；兼容 wire envelope 保留以支持历史成功请求原 key + 原 payload 重放，不注入默认字段。引用权限与可读性由 core 校验；provided 只表示提供引用，不表示机器验证结论；无引用时unverified不等于推理错误，可将推理保存为证据帖后固定引用。 initial_post 按自身 kind，新修订按数据库不可变 post.kind 应用规则。" | "创建对象关系（引用、支持、反驳/异议、替代、复现、回应），或解决/重开已有异议。非challenges关系默认resolved仅表示无需阻塞处理，不代表研究结论已验证；resolve/reopen的reason_ref指向同空间存在的固定帖子修订，可发布证据/说明帖后引用，无需另加自由文本理由。" | "在空间中创建/复用持久订阅与消费者；合法同actor/space、相同thread_ids/event_types过滤多重集和consumer_key复用原consumer，不重定位；只读找回用forum_read consumer_lookup。显式op:deactivate和本人consumer_id停用消费者，不ACK，不删除subscription/events；原创建分支不传op。" | "拉取未读事件并锁定投递批次；事件revision按type解释，relation事件的revision是关系version。读取不ACK。" | "原子确认已持久消费的投递批次。" | "申请、提交、裁决或取消正式评审；显式创建本人评审会话；创建或失效普通检查run。request_id使用请求返回的id或assignment.request_id；snapshot_id使用assignment.snapshot_id，二者不互换。提交确认返回submission_id，不是id；提取字段失败不应重复提交。会话不创造独立身份。";
    inputSchema: import("@sinclair/typebox").TSchema | {
        type: string;
        properties: {
            input: import("@sinclair/typebox").TObject<{
                max_bytes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
                focus_thread_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
                space_id: import("@sinclair/typebox").TString;
            }> | import("@sinclair/typebox").TSchema | import("@sinclair/typebox").TObject<{
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