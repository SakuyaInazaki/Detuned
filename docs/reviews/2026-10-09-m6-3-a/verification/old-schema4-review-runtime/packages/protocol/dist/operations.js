import { Type } from '@sinclair/typebox';
import { createApiEnvelopeSchema } from './common.js';
const object = (properties) => Type.Object(properties, { additionalProperties: false });
const count = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER });
const bytes = Type.String({ pattern: '^(0|[1-9][0-9]{0,31})$' });
const nullableCount = Type.Union([count, Type.Null()]);
export const FileSampleSchema = object({ applicable: Type.Boolean(), state: Type.Union([Type.Literal('regular'), Type.Literal('missing'), Type.Literal('unavailable'), Type.Literal('not_applicable')]), bytes: Type.Union([bytes, Type.Null()]) });
export const StorageOperationalStatusSchema = object({
    database: object({ page_size: count, page_count: count, free_pages: count, max_pages: count, allocated_bytes: bytes, max_allocated_bytes: bytes, journal_mode: Type.Union([Type.Literal('wal'), Type.Literal('delete'), Type.Literal('truncate'), Type.Literal('persist'), Type.Literal('memory'), Type.Literal('off'), Type.Literal('unknown')]), wal: object({ applicable: Type.Boolean(), busy: Type.Union([Type.Boolean(), Type.Null()]), log_frames: nullableCount, checkpointed_frames: nullableCount }) }),
    files: object({ database: FileSampleSchema, wal: FileSampleSchema }), data_directory: object({ configured: Type.Boolean(), available: Type.Union([Type.Boolean(), Type.Null()]) }), artifacts: object({ objects_observed: Type.Integer({ minimum: 0, maximum: 10001 }), bytes_observed: bytes, complete: Type.Boolean() })
});
export const OperationsDiagnosticsSchema = object({ ...StorageOperationalStatusSchema.properties, lifecycle: Type.Union([Type.Literal('running'), Type.Literal('draining')]), ready: Type.Boolean() });
export const OperationsDiagnosticsEnvelopeSchema = createApiEnvelopeSchema(OperationsDiagnosticsSchema);
export const LivenessEnvelopeSchema = createApiEnvelopeSchema(object({ status: Type.Literal('alive') }));
export const ReadinessEnvelopeSchema = createApiEnvelopeSchema(object({ status: Type.Literal('ready') }));
//# sourceMappingURL=operations.js.map