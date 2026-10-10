import { isCreateReviewRequest, isCreateReviewSubmission, type CreateReviewRequest, type CreateReviewSubmission } from '@detuned/protocol';
export class ReviewInputError extends Error { constructor(message: string) { super(message); this.name = 'ReviewInputError'; } }
export function parseReviewArray(text: string, label: string): unknown[] {
  if (new TextEncoder().encode(text).byteLength > 262144) throw new ReviewInputError(`${label} 超过 256 KiB 输入上限。`);
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new ReviewInputError(`${label} 必须是有效 JSON 数组。`); }
  if (!Array.isArray(value)) throw new ReviewInputError(`${label} 必须是 JSON 数组。`);
  return value;
}
export function parseRequestInput(value: unknown): CreateReviewRequest {
  if (!isCreateReviewRequest(value)) throw new ReviewInputError('请求字段无效：请核对固定版本、政策版本、评审者及各数组的格式和数量。');
  return value;
}
export function parseSubmissionInput(value: unknown): CreateReviewSubmission {
  if (!isCreateReviewSubmission(value)) throw new ReviewInputError('初评字段无效：完整覆盖、检查、独立声明及会话必填；接受时待满足条件必须为空。');
  return value;
}
export type ReviewIntent =
  | { kind: 'request'; key: string; body: CreateReviewRequest }
  | { kind: 'submit'; key: string; requestId: string; body: CreateReviewSubmission }
  | { kind: 'finalize'; key: string; requestId: string; body: { expected_version: number } }
  | { kind: 'cancel'; key: string; requestId: string; body: { expected_version: number; reason: string } };
export function freezeReviewIntent<T extends ReviewIntent>(intent: T): T {
  // Own a detached JSON body: subsequent edits cannot change an unknown-result retry.
  return structuredClone(intent);
}
