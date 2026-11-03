import { DetunedClient } from '@detuned/client';
export declare function safePiError(error: unknown): Error;
/** Pi's agent loop retains only error.message for failed tools. Keep the thrown
 * business type/metadata while making its stable code visible in that channel. */
export declare function piToolError(error: unknown): Error;
export declare function piResult(result: unknown): {
    content: {
        type: "text";
        text: string;
    }[];
    details: unknown;
};
type Client = Pick<DetunedClient, 'getCapabilities' | 'getMe' | 'createSession' | 'callTool'>;
export interface PiRuntimeOptions {
    snapshot(): {
        baseUrl: string;
        environmentToken?: string;
        environmentTokenFile?: string;
    };
    createClient?(options: {
        baseUrl: string;
        token?: string;
    }): Client;
    shutdownTimeoutMs?: number;
}
/** Activation-local state. It never reads ambient configuration itself. */
export declare function createPiRuntime(options: PiRuntimeOptions): {
    tool(name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<{
        content: {
            type: "text";
            text: string;
        }[];
        details: unknown;
    }>;
    me(): Promise<{
        data: any;
        meta?: any;
    }>;
    capabilities(): Promise<{
        data: any;
        meta?: any;
    }>;
    close: () => Promise<void>;
    start(): Promise<void>;
};
export {};
//# sourceMappingURL=runtime.d.ts.map