import { DetunedError, ErrorCode, resolveWriteRateLimits, type WriteRateLimits } from '@detuned/protocol';
import type { ClockPort } from '../ports/clock.js';

type Bucket = { units: bigint; observedAt: bigint };
const TOKEN = 60000n;

/** Process-local admission, independent of database transaction rollback. */
export class WriteRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly limits: WriteRateLimits;
  private readonly capacity: bigint;
  private readonly maxActors: number;
  private observedAt: bigint | undefined;

  constructor(private readonly clock: ClockPort, limits?: Partial<WriteRateLimits>, options: { maxActors?: number } = {}) {
    this.limits = resolveWriteRateLimits(limits);
    this.capacity = BigInt(this.limits.burst) * TOKEN;
    this.maxActors = options.maxActors ?? 10000;
    if (!Number.isSafeInteger(this.maxActors) || this.maxActors < 1 || this.maxActors > 10000) {
      throw new DetunedError(ErrorCode.VALIDATION_ERROR, '写入限流身份容量配置非法。', 400);
    }
  }

  private refill(bucket: Bucket, now: bigint): void {
    if (now <= bucket.observedAt) return;
    const replenished = bucket.units + (now - bucket.observedAt) * BigInt(this.limits.per_minute);
    bucket.units = replenished > this.capacity ? this.capacity : replenished;
    bucket.observedAt = now;
  }

  private seconds(units: bigint, lagMs = 0n): number {
    const rate = BigInt(this.limits.per_minute);
    const divisor = rate * 1000n;
    const seconds = (units + lagMs * rate + divisor - 1n) / divisor;
    // Extreme clock rollback: bounded recheck interval, not a guaranteed admission time.
    return Number(seconds > 600000n ? 600000n : seconds < 1n ? 1n : seconds);
  }

  private reject(scope: 'actor' | 'instance', seconds: number): never {
    throw new DetunedError(ErrorCode.RATE_LIMITED, '写入速率达到上限，请稍后重试。', 429, true,
      { scope, retry_after_seconds: seconds });
  }

  admit(actorId: string): void {
    const timestamp = this.clock.now().getTime();
    if (!Number.isSafeInteger(timestamp)) throw new DetunedError(ErrorCode.TEMPORARILY_UNAVAILABLE, '服务时钟不可用。', 503, true);
    const wallNow = BigInt(timestamp);
    if (this.observedAt === undefined || wallNow > this.observedAt) this.observedAt = wallNow;
    const now = this.observedAt;
    const lagMs = now - wallNow;
    let bucket = this.buckets.get(actorId);
    if (!bucket) {
      if (this.buckets.size >= this.maxActors) {
        let earliest = this.seconds(this.capacity, lagMs);
        for (const [id, entry] of this.buckets) {
          this.refill(entry, now);
          if (entry.units === this.capacity) this.buckets.delete(id);
          else earliest = Math.min(earliest, this.seconds(this.capacity - entry.units, lagMs));
        }
        if (this.buckets.size >= this.maxActors) this.reject('instance', earliest);
      }
      bucket = { units: this.capacity, observedAt: now };
      this.buckets.set(actorId, bucket);
    } else this.refill(bucket, now);
    if (bucket.units < TOKEN) this.reject('actor', this.seconds(TOKEN - bucket.units, lagMs));
    bucket.units -= TOKEN;
  }
}
