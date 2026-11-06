import {Type,type Static} from '@sinclair/typebox';
import {Value} from '@sinclair/typebox/value';
import {PostRevisionContentPageSchema,type PostRevisionContentPage,type PostKind} from './posts.js';
import {type PostRevisionContentRef} from './posts.js';
import {CONTEXT_BYTES} from './request-policies.js';
import {DetunedError,ErrorCode} from './errors.js';
export const POST_ASSEMBLE_LIMITS=Object.freeze({bytes:1048576,pages:512});
export const PostAssembleQuerySchema=Type.Object({max_bytes:Type.Optional(Type.Integer({...CONTEXT_BYTES}))},{additionalProperties:false});
export type PostAssembleQuery=Static<typeof PostAssembleQuerySchema>;
// Historical read projection, deliberately independent of strict new typed writes.
export const AssembledPostDocumentSchema=Type.Object({title:Type.String(),summary:Type.String(),body:Type.String(),tags:Type.Array(Type.String()),structured:Type.Unknown()},{additionalProperties:false});
export type AssembledPostDocument=Static<typeof AssembledPostDocumentSchema>;
export interface AssembledPostRevisionContent {ref:PostRevisionContentRef;post_kind:PostKind;lifecycle:'active'|'withdrawn';has_newer_revision:boolean;encoding:'json';content:AssembledPostDocument;bytes:number;pages:number}
export function validatePostAssembleQuery(query:unknown):asserts query is PostAssembleQuery {if(!Value.Check(PostAssembleQuerySchema,query))throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid assembled post read parameters; cursor is not accepted.',400,false);}
export function isPostContentPage(value:unknown):value is PostRevisionContentPage {return Value.Check(PostRevisionContentPageSchema,value);}
export function isAssembledPostDocument(value:unknown):value is AssembledPostDocument {return Value.Check(AssembledPostDocumentSchema,value);}
