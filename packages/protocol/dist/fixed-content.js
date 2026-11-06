import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { PostRevisionContentPageSchema } from './posts.js';
import { CONTEXT_BYTES } from './request-policies.js';
import { DetunedError, ErrorCode } from './errors.js';
export const POST_ASSEMBLE_LIMITS = Object.freeze({ bytes: 1048576, pages: 512 });
export const PostAssembleQuerySchema = Type.Object({ max_bytes: Type.Optional(Type.Integer({ ...CONTEXT_BYTES })) }, { additionalProperties: false });
// Historical read projection, deliberately independent of strict new typed writes.
export const AssembledPostDocumentSchema = Type.Object({ title: Type.String(), summary: Type.String(), body: Type.String(), tags: Type.Array(Type.String()), structured: Type.Unknown() }, { additionalProperties: false });
export function validatePostAssembleQuery(query) { if (!Value.Check(PostAssembleQuerySchema, query))
    throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid assembled post read parameters; cursor is not accepted.', 400, false); }
export function isPostContentPage(value) { return Value.Check(PostRevisionContentPageSchema, value); }
export function isAssembledPostDocument(value) { return Value.Check(AssembledPostDocumentSchema, value); }
//# sourceMappingURL=fixed-content.js.map