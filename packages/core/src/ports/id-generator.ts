import { randomUUID } from 'node:crypto';

export interface IdGeneratorPort {
  generateId(prefix?: string): string;
}

export class CryptoIdGenerator implements IdGeneratorPort {
  generateId(prefix?: string): string {
    const uuid = randomUUID();
    return prefix ? `${prefix}_${uuid}` : uuid;
  }
}
