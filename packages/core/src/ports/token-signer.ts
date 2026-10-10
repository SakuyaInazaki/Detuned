import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TokenSignerPort {
  sign(payload: Record<string, unknown>, secret: string): string;
  verify(token: string, secret: string, nowSeconds?: number): Record<string, unknown> | null;
}

export class HmacTokenSigner implements TokenSignerPort {
  sign(payload: Record<string, unknown>, secret: string): string {
    const jsonStr = JSON.stringify(payload);
    const dataB64 = Buffer.from(jsonStr, 'utf8').toString('base64url');
    const hmac = createHmac('sha256', secret).update(dataB64).digest('base64url');
    return `${dataB64}.${hmac}`;
  }

  verify(token: string, secret: string, nowSeconds?: number): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return null;
      const [dataB64, hmac] = parts;
      if (!dataB64 || !hmac) return null;

      const expectedHmac = createHmac('sha256', secret).update(dataB64).digest('base64url');
      const sigA = Buffer.from(hmac);
      const sigB = Buffer.from(expectedHmac);
      if (sigA.length !== sigB.length || !timingSafeEqual(sigA, sigB)) {
        return null;
      }

      const jsonStr = Buffer.from(dataB64, 'base64url').toString('utf8');
      const payload = JSON.parse(jsonStr) as Record<string, unknown>;

      // Check expiry if exp is set
      if (typeof payload['exp'] === 'number' && (nowSeconds ?? Date.now() / 1000) > payload['exp']) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}
