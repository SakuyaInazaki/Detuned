import { CreateThreadRequestSchema, CreatePostRequestSchema, CreatePostRevisionRequestSchema, WithdrawPostRequestSchema, CreateRelationRequestSchema, ResolveRelationRequestSchema, ReopenRelationRequestSchema, PostKindSchema, NEW_TYPED_STRUCTURED_SCHEMAS, ToolPublishPostOpSchema, DetunedError, ErrorCode } from '@detuned/protocol';
/** Offline JSON projection of canonical schemas. No token/client access or new runtime dependency. */
export function cliInputSchema(target, op, kind) {
    if (target === 'publish' && op === 'create')
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, '创建帖子请用 schema publish --op post --kind note|failure；创建主题用 --op thread。', 400);
    const invalid = () => new DetunedError(ErrorCode.VALIDATION_ERROR, 'schema请选择已知publish/relate操作及帖子kind。', 400);
    const tables = { publish: { thread: CreateThreadRequestSchema, post: CreatePostRequestSchema, revision: CreatePostRevisionRequestSchema, withdraw: WithdrawPostRequestSchema }, relate: { create: CreateRelationRequestSchema, resolve: ResolveRelationRequestSchema, reopen: ReopenRelationRequestSchema } };
    if (!Object.prototype.hasOwnProperty.call(tables, target) || !Object.prototype.hasOwnProperty.call(tables[target], op))
        throw invalid();
    const kindSchema = kind === undefined ? undefined : PostKindSchema.anyOf.find(candidate => candidate.const === kind);
    if (kind !== undefined && (target !== 'publish' || !['thread', 'post', 'revision'].includes(op) || !kindSchema))
        throw invalid();
    const base = tables[target][op];
    const properties = { ...base.properties };
    const required = [...(base.required ?? [])];
    const id = target === 'publish' && op === 'post' ? 'thread_id' : target === 'publish' && ['revision', 'withdraw'].includes(op) ? 'post_id' : target === 'relate' && ['resolve', 'reopen'].includes(op) ? 'relation_id' : undefined;
    if (id) {
        properties[id] = { type: 'string', minLength: 1 };
        required.push(id);
    }
    properties.request_key = ToolPublishPostOpSchema.properties.request_key;
    if (kind !== undefined) {
        const typed = Object.prototype.hasOwnProperty.call(NEW_TYPED_STRUCTURED_SCHEMAS, kind) ? NEW_TYPED_STRUCTURED_SCHEMAS[kind] : undefined;
        if (op === 'thread') {
            const initial = CreateThreadRequestSchema.properties.initial_post;
            const fields = { ...initial.properties, kind: kindSchema };
            const initialRequired = [...(initial.required ?? [])];
            if (typed) {
                fields.structured = typed;
                if (!initialRequired.includes('structured'))
                    initialRequired.push('structured');
            }
            properties.initial_post = { ...initial, properties: fields, required: Object.keys(fields).filter(key => initialRequired.includes(key)) };
        }
        else {
            if (op === 'post')
                properties.kind = kindSchema;
            if (typed) {
                properties.structured = typed;
                if (!required.includes('structured'))
                    required.push('structured');
            }
        }
    }
    return { ...base, properties, required: Object.keys(properties).filter(key => required.includes(key)) };
}
//# sourceMappingURL=schema.js.map