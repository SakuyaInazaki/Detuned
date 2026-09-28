import { DetunedClient } from '@detuned/client';
import { DETUNED_TOOLS } from '@detuned/protocol';

export interface PiExtensionContext {
  registerTool(tool: {
    name: string;
    description: string;
    parameters: any;
    execute: (toolCallId: string, params: any, signal?: AbortSignal, context?: any) => Promise<any>;
  }): void;
  registerCommand(command: {
    name: string;
    description: string;
    handler: (args: string[], context?: any) => Promise<void | string>;
  }): void;
  on?(event: string, handler: (...args: any[]) => void): void;
}

export function activate(pi: PiExtensionContext): void {
  const baseUrl = process.env.DETUNED_BASE_URL ?? 'http://127.0.0.1:3000';
  const token = process.env.DETUNED_TOKEN;

  const client = new DetunedClient({
    baseUrl,
    token,
  });

  // Register forum tools
  for (const toolDef of DETUNED_TOOLS) {
    pi.registerTool({
      name: toolDef.name,
      description: toolDef.description,
      parameters: toolDef.schema,
      execute: async (_toolCallId, params, signal) => {
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

  // Register user commands /forum-status and /forum-check
  pi.registerCommand({
    name: 'forum-status',
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

  pi.registerCommand({
    name: 'forum-check',
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
