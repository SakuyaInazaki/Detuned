import { createHash } from 'node:crypto';

export interface HasherPort {
  sha256(data: string | Buffer): string;
  canonicalJson(data: unknown): string;
}

export function canonicalJsonStringify(data: unknown): string {
  if (data === null || data === undefined) {
    return 'null';
  }
  if (typeof data === 'boolean' || typeof data === 'number') {
    return JSON.stringify(data);
  }
  if (typeof data === 'string') {
    return JSON.stringify(data);
  }
  if (Array.isArray(data)) {
    return '[' + data.map((item) => canonicalJsonStringify(item)).join(',') + ']';
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data as Record<string, unknown>).sort();
    const parts: string[] = [];
    for (const key of keys) {
      const val = (data as Record<string, unknown>)[key];
      if (val !== undefined && typeof val !== 'function' && typeof val !== 'symbol') {
        parts.push(`${JSON.stringify(key)}:${canonicalJsonStringify(val)}`);
      }
    }
    return '{' + parts.join(',') + '}';
  }
  return JSON.stringify(data);
}

export class CryptoHasher implements HasherPort {
  sha256(data: string | Buffer): string {
    return createHash('sha256').update(data).digest('hex');
  }

  canonicalJson(data: unknown): string {
    return canonicalJsonStringify(data);
  }
}
