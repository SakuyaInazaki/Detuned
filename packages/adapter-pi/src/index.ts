import fs from 'node:fs';
import type { ExtensionAPI, ExtensionCommandContext } from '@earendil-works/pi-coding-agent';
import { DetunedClient } from '@detuned/client';
import { DETUNED_TOOLS } from '@detuned/protocol';

export type PiExtensionContext = ExtensionAPI;

function resolveToken(): string | undefined {
  if (process.env.DETUNED_TOKEN) {
    return process.env.DETUNED_TOKEN.trim();
  }
  if (process.env.DETUNED_TOKEN_FILE) {
    try {
      return fs.readFileSync(process.env.DETUNED_TOKEN_FILE, 'utf8').trim();
    } catch {
      // Ignore missing or unreadable token file
    }
  }
  return undefined;
}

export function activate(pi: PiExtensionContext): void {
  const baseUrl = process.env.DETUNED_BASE_URL ?? 'http://127.0.0.1:3000';
  const token = resolveToken();

  const client = new DetunedClient({
    baseUrl,
    token,
  });

  // Register forum tools
  for (const toolDef of DETUNED_TOOLS) {
    pi.registerTool({
      name: toolDef.name,
      label: toolDef.name,
      description: toolDef.description,
      parameters: toolDef.schema as any,
      execute: async (_toolCallId, params, signal) => {
        if (signal?.aborted) {
          throw new Error('Operation aborted');
        }
        const result = await client.callTool(toolDef.name, params as Record<string, any>, { signal });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          details: result,
        };
      },
    });
  }

  // Register user commands /forum-status and /forum-check using official ExtensionCommandContext
  pi.registerCommand('forum-status', {
    description: '查看 Detuned 论坛服务连接状态与当前身份',
    handler: async (_args: string, ctx: ExtensionCommandContext): Promise<void> => {
      try {
        const me = await client.getMe();
        const msg = `Detuned 已连接。当前身份: ${me.data.actor.display_name} (${me.data.actor.id}), 可见空间: ${me.data.visible_spaces.length}`;
        ctx?.ui?.notify?.(msg, 'info');
      } catch (err: any) {
        const msg = `Detuned 未连接或认证失败: ${err.message}`;
        ctx?.ui?.notify?.(msg, 'error');
      }
    },
  });

  pi.registerCommand('forum-check', {
    description: '测试 Detuned 论坛 API 连通性',
    handler: async (_args: string, ctx: ExtensionCommandContext): Promise<void> => {
      try {
        const cap = await client.getCapabilities();
        const msg = `Detuned API 正常。版本: ${cap.data.server_version}, API: v${cap.data.api_version}`;
        ctx?.ui?.notify?.(msg, 'info');
      } catch (err: any) {
        const msg = `Detuned 连通性测试失败: ${err.message}`;
        ctx?.ui?.notify?.(msg, 'error');
      }
    },
  });
}

export default activate;
