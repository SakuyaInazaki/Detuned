import type { Server } from 'node:http';
/** Parser-only connections have no business lease. Preserve complete requests'
 * responses, then flush this server's sockets without waiting on a peer FIN. */
export declare function trackHttpSockets(server: Server): {
    drain(): Promise<void>;
    dispose(): void;
};
//# sourceMappingURL=http-sockets.d.ts.map