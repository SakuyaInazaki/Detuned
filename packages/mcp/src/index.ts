#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DetunedClient } from '@detuned/client';
import { resolveLocalToken } from '@detuned/client/node';
import { resolveMcpInputMode } from './tool-validation.js';
import { createMcpBridge } from './bridge.js';
export { createMcpBridge, BridgeShutdownError, type McpBridgeOptions } from './bridge.js';
export type { McpSessionBinding } from './session-binding.js';

async function main(): Promise<void> {
  const inputMode = resolveMcpInputMode(process.env.DETUNED_MCP_INPUT_MODE);
  const token = resolveLocalToken({ environmentToken: process.env.DETUNED_TOKEN, environmentTokenFile: process.env.DETUNED_TOKEN_FILE });
  const client = new DetunedClient({ baseUrl: process.env.DETUNED_BASE_URL ?? 'http://127.0.0.1:3000', token, timeoutMs: 60000 });
  const bridge = createMcpBridge({ client, inputMode, sessionBinding: { client, clientName: 'detuned-mcp', clientVersion: '0.1.0' } });
  const signal = () => { void bridge.close().catch(() => {}); };
  process.on('SIGINT', signal); process.on('SIGTERM', signal);
  try { await bridge.start(); await bridge.closed; process.exitCode = 0; }
  catch { process.stderr.write('Detuned MCP bridge failed to start or close safely.\n'); process.exit(1); }
  finally { process.off('SIGINT', signal); process.off('SIGTERM', signal); }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  void main().catch(() => { process.stderr.write('Detuned MCP bridge failed to start or close safely.\n'); process.exit(1); });
}
