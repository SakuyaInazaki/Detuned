import type { ExtensionAPI, ToolDefinition } from '@earendil-works/pi-coding-agent';
import { DETUNED_TOOLS } from '@detuned/protocol';
export type PiExtensionContext = ExtensionAPI;
export declare function adaptToolSchema(schema: (typeof DETUNED_TOOLS)[number]['schema']): ToolDefinition['parameters'];
export declare function activate(pi: PiExtensionContext): void;
export default activate;
//# sourceMappingURL=index.d.ts.map