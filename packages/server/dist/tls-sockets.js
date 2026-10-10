/** Own only socket observation; drain is called after business handlers/finally have settled. */
export function trackTlsSockets(server) {
    const sockets = new Map();
    let draining = false;
    const connected = (socket) => {
        const closed = new Promise(resolve => socket.once('close', () => { sockets.delete(socket); resolve(); }));
        sockets.set(socket, closed);
        if (draining)
            socket.destroy();
    };
    server.on('connection', connected);
    return {
        async drain() {
            draining = true;
            const pending = [...sockets.values()];
            for (const socket of sockets.keys())
                socket.destroy();
            await Promise.all(pending);
        },
        dispose() { server.removeListener('connection', connected); },
    };
}
//# sourceMappingURL=tls-sockets.js.map