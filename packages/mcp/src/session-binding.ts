import { createRuntimeSessionBinding, type RuntimeSessionBindingOptions } from '@detuned/client';

// Preserve the adapter API while sharing the runtime-local coordination algorithm.
export interface McpSessionBinding extends RuntimeSessionBindingOptions {}
export function createSessionBinding(config: McpSessionBinding) {
  return createRuntimeSessionBinding(config);
}
