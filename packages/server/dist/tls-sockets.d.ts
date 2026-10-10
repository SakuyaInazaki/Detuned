import type { Server as HttpsServer } from 'node:https';
import type { Server as HttpServer } from 'node:http';
/** Own only socket observation; drain is called after business handlers/finally have settled. */
export declare function trackTlsSockets(server: HttpServer | HttpsServer): {
    drain(): Promise<void>;
    dispose(): void;
};
//# sourceMappingURL=tls-sockets.d.ts.map