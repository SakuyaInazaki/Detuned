import type { Server, IncomingMessage, ServerResponse } from 'node:http';
import type { Socket } from 'node:net';

/** Parser-only connections have no business lease. Preserve complete requests'
 * responses, then flush this server's sockets without waiting on a peer FIN. */
export function trackHttpSockets(server: Server): { drain(): Promise<void>; dispose(): void } {
  type Response = { request: IncomingMessage; response: ServerResponse; done: () => void };
  type Connection = { closed: Promise<void>; responses: Set<Response>; flush: boolean; ending: boolean };
  const connections = new Map<Socket, Connection>();
  let draining = false;
  const settle = (socket: Socket, connection: Connection) => {
    if (!draining || connection.ending || socket.destroyed) return;
    if ([...connection.responses].some(row => row.request.complete && !row.response.destroyed && !row.response.writableFinished)) {
      connection.flush = true;
      return;
    }
    connection.ending = true;
    if (connection.flush) socket.end(() => socket.destroy());
    else socket.destroy();
  };
  const connected = (socket: Socket) => {
    const responses = new Set<Response>();
    const closed = new Promise<void>(resolve => socket.once('close', () => {
      for (const row of responses) {
        row.response.removeListener('finish', row.done);
        row.response.removeListener('close', row.done);
      }
      connections.delete(socket);
      resolve();
    }));
    const connection = {closed, responses, flush: false, ending: false};
    connections.set(socket, connection);
    settle(socket, connection);
  };
  const requested = (request: IncomingMessage, response: ServerResponse) => {
    const connection = connections.get(request.socket);
    if (!connection) return;
    const done = () => {
      response.removeListener('finish', done);
      response.removeListener('close', done);
      connection.responses.delete(row);
      if (response.writableFinished) connection.flush = true;
      settle(request.socket, connection);
    };
    const row = {request, response, done};
    connection.responses.add(row);
    response.once('finish', done);
    response.once('close', done);
    settle(request.socket, connection);
  };
  server.on('connection', connected);
  server.on('request', requested);
  return {
    async drain() {
      draining = true;
      for (const [socket, connection] of connections) settle(socket, connection);
      while (connections.size) await Promise.all([...connections.values()].map(connection => connection.closed));
    },
    dispose() {
      server.removeListener('connection', connected);
      server.removeListener('request', requested);
    },
  };
}
