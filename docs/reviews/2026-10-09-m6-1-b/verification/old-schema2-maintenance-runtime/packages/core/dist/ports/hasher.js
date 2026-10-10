import { createHash } from 'node:crypto';
export function canonicalJsonStringify(data) {
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
        const keys = Object.keys(data).sort();
        const parts = [];
        for (const key of keys) {
            const val = data[key];
            if (val !== undefined && typeof val !== 'function' && typeof val !== 'symbol') {
                parts.push(`${JSON.stringify(key)}:${canonicalJsonStringify(val)}`);
            }
        }
        return '{' + parts.join(',') + '}';
    }
    return JSON.stringify(data);
}
export class CryptoHasher {
    sha256(data) {
        return createHash('sha256').update(data).digest('hex');
    }
    canonicalJson(data) {
        return canonicalJsonStringify(data);
    }
}
//# sourceMappingURL=hasher.js.map