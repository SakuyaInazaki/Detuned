#!/usr/bin/env node
import fs from 'node:fs';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { DetunedClient } from '@detuned/client';
import { DETUNED_TOOLS } from '@detuned/protocol';
function resolveToken() {
    if (process.env.DETUNED_TOKEN) {
        return process.env.DETUNED_TOKEN.trim();
    }
    if (process.env.DETUNED_TOKEN_FILE) {
        try {
            return fs.readFileSync(process.env.DETUNED_TOKEN_FILE, 'utf8').trim();
        }
        catch (err) {
            process.stderr.write(`[MCP] Failed to read token file: ${err.message}\n`);
        }
    }
    return undefined;
}
const baseUrl = process.env.DETUNED_BASE_URL ?? 'http://127.0.0.1:3000';
const token = resolveToken();
const client = new DetunedClient({
    baseUrl,
    token,
    timeoutMs: 60000,
});
const server = new Server({
    name: 'detuned',
    version: '0.1.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Clean stdout: No console.log allowed! All diagnostics go to stderr.
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: DETUNED_TOOLS.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.schema,
        })),
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        const result = await client.callTool(name, args ?? {});
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (err) {
        process.stderr.write(`[MCP Error in ${name}]: ${err.message}\n`);
        return {
            isError: true,
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        error: {
                            code: err.code ?? 'TOOL_EXECUTION_ERROR',
                            message: err.message,
                            details: err.details,
                        },
                    }, null, 2),
                },
            ],
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write('Detuned MCP Stdio server connected\n');
}
main().catch((err) => {
    process.stderr.write(`MCP server fatal error: ${err.message}\n`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map