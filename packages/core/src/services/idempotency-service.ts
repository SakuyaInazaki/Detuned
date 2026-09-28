import { DetunedError, ErrorCode } from '@detuned/protocol';
import { StoragePort, IdempotencyRecord } from '../ports/storage.js';
import { HasherPort } from '../ports/hasher.js';
import { ClockPort } from '../ports/clock.js';

export class IdempotencyService {
  constructor(
    private readonly storage: StoragePort,
    private readonly hasher: HasherPort,
    private readonly clock: ClockPort
  ) {}

  executeIdempotent<T>(
    actorId: string,
    spaceId: string,
    operation: string,
    key: string,
    payload: unknown,
    statusCode: number,
    action: (tx: StoragePort) => T
  ): { data: T; isReplay: boolean } {
    if (!key || typeof key !== 'string') {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        '缺少 Idempotency-Key / request_key。',
        400
      );
    }

    const requestHash = this.hasher.sha256(this.hasher.canonicalJson(payload));

    return this.storage.transaction((tx) => {
      const existing = tx.getIdempotencyRecord(actorId, spaceId, operation, key);
      if (existing) {
        if (existing.request_hash !== requestHash) {
          throw new DetunedError(
            ErrorCode.IDEMPOTENCY_CONFLICT,
            '同名 Idempotency-Key 包含不同的请求内容。',
            409,
            false,
            { key }
          );
        }
        // Identical request retry: return reconstructed result
        const parsed = JSON.parse(existing.result_ref) as T;
        return { data: parsed, isReplay: true };
      }

      // Execute fresh business action
      const result = action(tx);

      // Save idempotency record
      const record: IdempotencyRecord = {
        actor_id: actorId,
        space_id: spaceId,
        operation,
        key,
        request_hash: requestHash,
        result_ref: JSON.stringify(result),
        http_status: statusCode,
        created_at: this.clock.nowIso(),
      };
      tx.createIdempotencyRecord(record);

      return { data: result, isReplay: false };
    });
  }
}
