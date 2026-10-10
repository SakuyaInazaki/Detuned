import { DetunedError, ErrorCode } from '@detuned/protocol';

export function parsePageLimit(value: string): number {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 100) {
    throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'limit 必须为1–100的整数。', 400);
  }
  return Number(value);
}

export function parsePollWait(value: string): number {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 0 || Number(value) > 25000) {
    throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'wait-ms 必须为0–25000的整数。', 400);
  }
  return Number(value);
}
