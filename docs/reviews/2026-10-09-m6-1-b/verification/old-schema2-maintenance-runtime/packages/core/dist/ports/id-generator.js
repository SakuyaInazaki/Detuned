import { randomUUID } from 'node:crypto';
export class CryptoIdGenerator {
    generateId(prefix) {
        const uuid = randomUUID();
        return prefix ? `${prefix}_${uuid}` : uuid;
    }
}
//# sourceMappingURL=id-generator.js.map