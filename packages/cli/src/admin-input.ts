import {DetunedError,ErrorCode} from '@detuned/protocol';

/** Only new management actions use this safe input boundary; server validates fields. */
export function readAdminInput<T extends object>(read: () => unknown): T {
  try {
    const value = read();
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('object required');
    return value as T;
  } catch {
    throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Management input must be a readable JSON object.', 400);
  }
}
