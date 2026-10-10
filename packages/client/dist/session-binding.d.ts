import type { DetunedClient } from './client.js';
export interface RuntimeSessionBindingOptions {
    client: Pick<DetunedClient, 'getCapabilities' | 'getMe' | 'createSession'>;
    clientName: string;
    clientVersion: string;
}
export interface RuntimeSessionBinding {
    prepare(spaceId: string, signal: AbortSignal): Promise<void>;
    beginClosing(): void;
    waitForIdle(): Promise<void>;
}
/** Runtime-local diagnostic association; it does not add session_id to forum writes. */
export declare function createRuntimeSessionBinding(config: RuntimeSessionBindingOptions): RuntimeSessionBinding;
//# sourceMappingURL=session-binding.d.ts.map