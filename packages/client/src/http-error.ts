import {ErrorCode,isApiErrorDetail,type ApiErrorDetail} from '@detuned/protocol';

function object(value: unknown): value is Record<string,unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Old peers may omit envelope/default fields. Present fields must still be valid;
 * malformed gateway bodies never become trusted business messages or metadata. */
export function publicHttpError(value: unknown, status: number): ApiErrorDetail {
  const fallback: ApiErrorDetail = {
    code: status === 429 ? ErrorCode.RATE_LIMITED : status >= 500 ? ErrorCode.TEMPORARILY_UNAVAILABLE : ErrorCode.VALIDATION_ERROR,
    message: `HTTP ${status} 请求失败`,
    retryable: false,
  };
  if (!object(value) ||
      ('api_version' in value && value.api_version !== '1') ||
      ('request_id' in value && (typeof value.request_id !== 'string' || value.request_id.trim() === '')) ||
      !object(value.error)) return fallback;
  const detail = value.error;
  // Project only public fields; unknown response properties are ignored as promised.
  const candidate = {
    code: detail.code,
    message: detail.message === undefined ? fallback.message : detail.message,
    retryable: detail.retryable === undefined ? false : detail.retryable,
    ...(detail.details === undefined ? {} : {details: detail.details}),
  };
  return isApiErrorDetail(candidate) ? candidate : fallback;
}
