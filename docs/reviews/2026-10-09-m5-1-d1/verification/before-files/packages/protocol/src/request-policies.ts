/** Existing HTTP input policies; these describe transport validation, not authorization. */
export const LIST_LIMIT = { minimum: 1, maximum: 100, default: 20 } as const;
export const THREAD_POST_LIMIT = { ...LIST_LIMIT, default: 50 } as const;
export const CONTEXT_BYTES = { minimum: 4096, maximum: 65536, default: 12288 } as const;
export const REVISION_QUERY = { minimum: 1 } as const;
export const THREAD_STATES = ['open', 'archived'] as const;
export const VIEW_NAMES = ['failures', 'findings', 'open-questions'] as const;
export const NONBLANK_STRING_SCHEMA = { type: 'string', pattern: '\\S' } as const;
export function isNonblankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
export function integerQueryOptions(policy: { minimum?: number; maximum?: number; default?: number }) {
  return { min: policy.minimum, max: policy.maximum, defaultValue: policy.default };
}
export const QUERY_TRANSPORT_POLICY = {
  unknown_fields: 'reject',
  repeated_parameters: 'reject; CSV values use one comma-separated parameter',
  omitted: 'use declared default, otherwise undefined; required parameters reject',
  empty: 'integer and scalar string reject; tags CSV accepts empty as []',
  integer: 'decimal digits only after trimming, safe integer, no body coercion',
} as const;
export const NO_BODY_WRITE_POLICY = {
  accepted: ['undefined', 'null', '{}'],
  rejected: 'nonempty objects, arrays and primitives',
} as const;

export const EXPORT_QUERY_POLICY = { format: 'ndjson', default_format: 'ndjson', reject_unknown: true, reject_repeated: true } as const;

export const ANONYMOUS_HTTP_ROUTES = ['/api/v1/capabilities', '/api/v1/health/live', '/api/v1/health/ready'] as const;

export const WEB_AUTH_INPUT_POLICY = { login_body: 'absent or strict empty object', query: 'strict empty', logout_body: 'absent', logout_response: '204 without body' } as const;
