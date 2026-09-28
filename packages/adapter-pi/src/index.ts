import fs from 'node:fs';
import { DetunedClient } from '@detuned/client';
import { DETUNED_TOOLS } from '@detuned/protocol';

export interface PiExtensionContext {
  registerTool(tool: {
    name: string;
    label: string;
    description: string;
    parameters: any;
    execute: (toolCallId: string, params: any, signal?: AbortSignal, context?: any) => Promise<any>;
  }): void;
  registerCommand(
    name: string,
    options: {
      description?: string;
      handler: (args: string[], context?: any) => Promise<void | string>;
    }
  ): void;
  on?(event: string, handler: (...args: any[]) => void): void;
}

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
      parameters: toolDef.schema,
      execute: async (_toolCallId, params, signal) => {
        if (signal?.aborted) {
          throw new Error('Operation aborted');
        }
        try {
          const result = await client.callTool(toolDef.name, params);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            details: result,
          };
        } catch (err: any) {
          return {
            isError: true,
            content: [{ type: 'text', text: `[Error ${err.code ?? 'ERROR'}]: ${err.message}` }],
            details: { code: err.code, message: err.message, details: err.details },
          };
        }
      },
    });
  }

  // Register user commands /forum-status and /forum-check using official 2-argument signature
  pi.registerCommand('forum-status', {
    description: '查看 Detuned 论坛服务连接状态与当前身份',
    handler: async () => {
      try {
        const me = await client.getMe();
        return `Detuned 已连接。当前身份: ${me.data.actor.display_name} (${me.data.actor.id}), 可见空间: ${me.data.visible_spaces.length}`;
      } catch (err: any) {
        return `Detuned 未连接或认证失败: ${err.message}`;
      }
    },
  });

  pi.registerCommand('forum-check', {
    description: '测试 Detuned 论坛 API 连通性',
    handler: async () => {
      try {
        const cap = await client.getCapabilities();
        return `Detuned API 正常。版本: ${cap.data.server_version}, API: v${cap.data.api_version}`;
      } catch (err: any) {
        return `Detuned 连通性测试失败: ${err.message}`;
      }
    },
  });
}

export default activate;
