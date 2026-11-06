import {Type,type Static} from '@sinclair/typebox';
import {Value} from '@sinclair/typebox/value';
import {PostRefSchema} from './common.js';
import {isCheckInstant} from './review.js';
import {DetunedError,ErrorCode} from './errors.js';
const id=Type.String({minLength:1});
export const RelationHistoryQuerySchema=Type.Object({limit:Type.Optional(Type.Integer({minimum:1,maximum:100})),max_bytes:Type.Optional(Type.Integer({minimum:4096,maximum:65536})),cursor:Type.Optional(Type.String({minLength:1,maxLength:4096}))},{additionalProperties:false});
export type RelationHistoryQuery=Static<typeof RelationHistoryQuerySchema>;
const reason=Type.Union([
 ...(['active','withdrawn'] as const).map(status=>Type.Object({reason_ref:PostRefSchema,reason_status:Type.Literal(status),reason_has_newer_revision:Type.Boolean()},{additionalProperties:false})),
 Type.Object({reason_ref:PostRefSchema,reason_status:Type.Literal('redacted'),reason_has_newer_revision:Type.Null()},{additionalProperties:false}),
 Type.Object({reason_ref:Type.Null(),reason_status:Type.Literal('unavailable'),reason_has_newer_revision:Type.Null()},{additionalProperties:false})]);
const fields={resolution_id:id,relation_id:id,version:Type.Integer({minimum:2,maximum:Number.MAX_SAFE_INTEGER}),action:Type.Union([Type.Literal('resolve'),Type.Literal('reopen')]),resolver_id:id,created_at:Type.String()};
export const RelationHistoryItemSchema=Type.Union(reason.anyOf.map(branch=>Type.Object({...fields,...branch.properties},{additionalProperties:false})));
export type RelationHistoryItem=Static<typeof RelationHistoryItemSchema>;
export const RelationHistoryPageSchema=Type.Object({data:Type.Object({relation_id:id,resolutions:Type.Array(RelationHistoryItemSchema,{maxItems:100})},{additionalProperties:false}),meta:Type.Object({truncated:Type.Boolean(),next_cursor:Type.Union([Type.String({minLength:1,maxLength:4096}),Type.Null()])},{additionalProperties:false})},{additionalProperties:false});
export type RelationHistoryPage=Static<typeof RelationHistoryPageSchema>;
export function validateRelationHistoryQuery(value:unknown):asserts value is RelationHistoryQuery {if(!Value.Check(RelationHistoryQuerySchema,value))throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid relation history query.',400,false);}
export function isRelationHistoryPage(value:unknown,relationId:string,query:RelationHistoryQuery={}):value is RelationHistoryPage {
 if(!Value.Check(RelationHistoryPageSchema,value)||value.data.relation_id!==relationId||value.data.resolutions.length>(query.limit??20)||(value.meta.truncated&&value.meta.next_cursor===null)||(value.meta.next_cursor!==null&&value.data.resolutions.length===0))return false;
 return value.data.resolutions.every((row,i)=>row.relation_id===relationId&&isCheckInstant(row.created_at)&&(i===0||value.data.resolutions[i-1]!.version<row.version||(value.data.resolutions[i-1]!.version===row.version&&value.data.resolutions[i-1]!.resolution_id<row.resolution_id)));
}
