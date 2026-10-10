import type { Server as HttpsServer } from 'node:https';
import type { Server as HttpServer } from 'node:http';
import type { Socket } from 'node:net';

/** Own only socket observation; drain is called after business handlers/finally have settled. */
export function trackTlsSockets(server: HttpServer | HttpsServer): { drain(): Promise<void>; dispose(): void } {
  const sockets = new Map<Socket, Promise<void>>(); let draining = false;
  const connected = (socket: Socket) => {
    const closed = new Promise<void>(resolve => socket.once('close', () => { sockets.delete(socket); resolve(); }));
    sockets.set(socket, closed);
    if (draining) socket.destroy();
  };
  server.on('connection', connected);
  return {
    async drain() {
      draining = true;
      const pending = [...sockets.values()];
      for (const socket of sockets.keys()) socket.destroy();
      await Promise.all(pending);
    },
    dispose() { server.removeListener('connection', connected); },
  };
}
