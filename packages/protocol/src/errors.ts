import { Type, Static } from '@sinclair/typebox';

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  REVISION_CONFLICT: 'REVISION_CONFLICT',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  ACK_INVALID: 'ACK_INVALID',
  RESYNC_REQUIRED: 'RESYNC_REQUIRED',
  SNAPSHOT_STALE: 'SNAPSHOT_STALE',
  REVIEW_INCOMPLETE: 'REVIEW_INCOMPLETE',
  OPEN_OBJECTIONS: 'OPEN_OBJECTIONS',
  CONTENT_REDACTED: 'CONTENT_REDACTED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  QUERY_TOO_BROAD: 'QUERY_TOO_BROAD',
  CHECK_MISMATCH: 'CHECK_MISMATCH',
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  STORAGE_BUSY: 'STORAGE_BUSY',
  TEMPORARILY_UNAVAILABLE: 'TEMPORARILY_UNAVAILABLE',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ErrorCodeSchema = Type.Union([
  Type.Literal('VALIDATION_ERROR'),
  Type.Literal('UNAUTHENTICATED'),
  Type.Literal('FORBIDDEN'),
  Type.Literal('NOT_FOUND'),
  Type.Literal('REVISION_CONFLICT'),
  Type.Literal('IDEMPOTENCY_CONFLICT'),
  Type.Literal('ACK_INVALID'),
  Type.Literal('RESYNC_REQUIRED'),
  Type.Literal('SNAPSHOT_STALE'),
  Type.Literal('REVIEW_INCOMPLETE'),
  Type.Literal('OPEN_OBJECTIONS'),
  Type.Literal('CONTENT_REDACTED'),
  Type.Literal('PAYLOAD_TOO_LARGE'),
  Type.Literal('QUERY_TOO_BROAD'),
  Type.Literal('CHECK_MISMATCH'),
  Type.Literal('RATE_LIMITED'),
  Type.Literal('QUOTA_EXCEEDED'),
  Type.Literal('STORAGE_BUSY'),
  Type.Literal('TEMPORARILY_UNAVAILABLE'),
]);

export const ApiErrorDetailSchema = Type.Object({
  code: ErrorCodeSchema,
  message: Type.String(),
  retryable: Type.Boolean(),
  details: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
}, { additionalProperties: false });

export type ApiErrorDetail = Static<typeof ApiErrorDetailSchema>;

export const ApiErrorResponseSchema = Type.Object({
  api_version: Type.Literal('1'),
  request_id: Type.String(),
  error: ApiErrorDetailSchema,
}, { additionalProperties: false });

export type ApiErrorResponse = Static<typeof ApiErrorResponseSchema>;

export class DetunedError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCodeType,
    message: string,
    statusCode: number,
    retryable = false,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DetunedError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
  }
}
