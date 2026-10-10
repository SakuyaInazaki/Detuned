export interface ServerTlsOptions {
    cert: Buffer;
    key: Buffer;
}
/** Validate and copy caller bytes before composing the server; never retain mutable input buffers. */
export declare function resolveServerTlsOptions(value: ServerTlsOptions): ServerTlsOptions;
/** No path/default credential discovery; both files must independently pass same-FD checks. */
export declare function loadServerTlsOptions(certPath: string, keyPath: string): Promise<ServerTlsOptions>;
//# sourceMappingURL=tls-config.d.ts.map