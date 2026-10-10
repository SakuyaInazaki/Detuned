import { DetunedError } from '@detuned/protocol';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
export declare function bridgeSuccess(result: unknown): CallToolResult;
export declare function bridgeFailure(cause: unknown): CallToolResult;
export declare const unknownTool: () => DetunedError;
//# sourceMappingURL=bridge-results.d.ts.map