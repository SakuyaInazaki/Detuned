import { Readable, Writable } from 'node:stream';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { DetunedClient } from '@detuned/client';
import { type McpInputMode } from './tool-validation.js';
import { type McpSessionBinding } from './session-binding.js';
export declare class BridgeShutdownError extends Error {
    constructor();
}
export interface McpBridgeOptions {
    client: Pick<DetunedClient, 'callTool'>;
    inputMode?: McpInputMode;
    input?: Readable;
    output?: Writable;
    shutdownTimeoutMs?: number;
    sessionBinding?: McpSessionBinding;
}
/** Importing this module does not connect streams, read credentials or make HTTP requests. */
export declare function createMcpBridge(options: McpBridgeOptions): {
    server: Server<{
        method: string;
        params?: {
            [x: string]: unknown;
            _meta?: {
                [x: string]: unknown;
                progressToken?: string | number | undefined;
                "io.modelcontextprotocol/related-task"?: {
                    taskId: string;
                } | undefined;
            } | undefined;
        } | undefined;
    }, {
        method: string;
        params?: {
            [x: string]: unknown;
            _meta?: {
                [x: string]: unknown;
                progressToken?: string | number | undefined;
                "io.modelcontextprotocol/related-task"?: {
                    taskId: string;
                } | undefined;
            } | undefined;
        } | undefined;
    }, {
        [x: string]: unknown;
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
    }>;
    start: () => Promise<void>;
    close: () => Promise<void>;
    closed: Promise<void>;
};
//# sourceMappingURL=bridge.d.ts.map