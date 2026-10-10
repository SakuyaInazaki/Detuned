import type { ExtensionAPI, ExtensionCommandContext, ToolDefinition } from '@earendil-works/pi-coding-agent';
import { createPiRuntime, safePiError } from './runtime.js';
import { DETUNED_TOOLS } from '@detuned/protocol';

export type PiExtensionContext = ExtensionAPI;

export function adaptToolSchema(
  schema: (typeof DETUNED_TOOLS)[number]['schema']
): ToolDefinition['parameters'] {
  // Protocol uses @sinclair/typebox; Pi 0.87.1 uses typebox. Their TS schema
  // markers differ, but Pi accepts this JSON Schema through its validator.
  // Keep the original object and every union constraint at this type boundary.
  return schema as unknown as ToolDefinition['parameters'];
}

export function activate(pi: PiExtensionContext): void {
  const runtime = createPiRuntime({ snapshot: () => ({
    baseUrl: process.env.DETUNED_BASE_URL ?? 'http://127.0.0.1:3000',
    environmentToken: process.env.DETUNED_TOKEN,
    environmentTokenFile: process.env.DETUNED_TOKEN_FILE,
  }) });
  pi.on('session_shutdown', async () => { await runtime.close(); });
  pi.on('session_start', async () => { await runtime.start(); });

  // Register forum tools
  for (const toolDef of DETUNED_TOOLS) {
    pi.registerTool({
      name: toolDef.name,
      label: toolDef.name,
      description: toolDef.description,
      parameters: adaptToolSchema(toolDef.schema),
      execute: async (_toolCallId, params, signal, _onUpdate, _ctx) => {
        return runtime.tool(toolDef.name, params as Record<string, unknown>, signal);
      },
    });
  }

  // Register user commands /forum-status and /forum-check using official ExtensionCommandContext
  pi.registerCommand('forum-status', {
    description: '查看 Detuned 论坛服务连接状态与当前身份',
    handler: async (_args: string, ctx: ExtensionCommandContext): Promise<void> => {
      try {
        if (_args.trim()) throw new Error('Invalid command usage.');
        const me = await runtime.me();
        const msg = `Detuned 已连接。当前身份: ${me.data.actor.display_name} (${me.data.actor.id}), 可见空间: ${me.data.visible_spaces.length}`;
        if (ctx?.hasUI && typeof ctx.ui?.notify === 'function') {
          ctx.ui.notify(msg, 'info');
        } else {
          console.log(`[forum-status] ${msg}`);
        }
      } catch (err: any) {
        const msg = `Detuned 未连接或认证失败: ${safePiError(err).message}`;
        if (ctx?.hasUI && typeof ctx.ui?.notify === 'function') {
          ctx.ui.notify(msg, 'error');
        } else {
          console.error(`[forum-status] ${msg}`);
        }
      }
    },
  });

  pi.registerCommand('forum-check', {
    description: '测试 Detuned 论坛 API 连通性',
    handler: async (_args: string, ctx: ExtensionCommandContext): Promise<void> => {
      try {
        if (_args.trim()) throw new Error('Invalid command usage.');
        const cap = await runtime.capabilities();
        const msg = `Detuned API 正常。版本: ${cap.data.server_version}, API: v${cap.data.api_version}`;
        if (ctx?.hasUI && typeof ctx.ui?.notify === 'function') {
          ctx.ui.notify(msg, 'info');
        } else {
          console.log(`[forum-check] ${msg}`);
        }
      } catch (err: any) {
        const msg = `Detuned 连通性测试失败: ${safePiError(err).message}`;
        if (ctx?.hasUI && typeof ctx.ui?.notify === 'function') {
          ctx.ui.notify(msg, 'error');
        } else {
          console.error(`[forum-check] ${msg}`);
        }
      }
    },
  });
}

export default activate;
