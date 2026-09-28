// No model accounts or HTTP calls. Checks published schemas, actual stdio discovery,
// and a Pi registration fixture grounded in the official ExtensionAPI signature.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { DETUNED_TOOLS, ToolPublishParamsSchema, ToolRelateParamsSchema } from '../../../packages/protocol/dist/index.js';
import activate from '../../../packages/adapter-pi/dist/index.js';

const protocolRequire = createRequire(new URL('../../../packages/protocol/package.json', import.meta.url));
const { TypeCompiler } = protocolRequire('@sinclair/typebox/compiler');
const results = [];
for (const [id, schema, payload] of [
  ['A01', ToolPublishParamsSchema, { space_id: 'space_fixture', request_key: 'key_fixture', op: 'thread', title: 'A valid title' }],
  ['A02', ToolRelateParamsSchema, { space_id: 'space_fixture', request_key: 'key_fixture', op: 'create', source_ref: { post_id: 'post_a', revision: 1 }, target_ref: { post_id: 'post_b', revision: 1 }, type: 'cites' }],
]) {
  const validator = TypeCompiler.Compile(schema);
  results.push({ id, description: 'Schema accepts its documented valid tool input', passes: validator.Check(payload), errors: [...validator.Errors(payload)].map(e => ({ path: e.path, message: e.message })) });
}

const tools = [];
const commands = [];
activate({
  registerTool(definition) { tools.push(definition); },
  registerCommand(...args) { commands.push(args); },
  on() {},
});
results.push({ id: 'A03', description: 'Pi commands follow registerCommand(name, options)', passes: commands.length === 2 && commands.every(args => args.length === 2 && typeof args[0] === 'string' && typeof args[1]?.handler === 'function'), observed: commands.map(args => ({ argument_count: args.length, first_argument_type: typeof args[0] })) });
results.push({ id: 'A04', description: 'Pi registered tool definitions include official required label field', passes: tools.every(t => typeof t.label === 'string'), observed_missing_labels: tools.filter(t => typeof t.label !== 'string').map(t => t.name) });

const bridge = new StdioClientTransport({
  command: process.execPath,
  args: [fileURLToPath(new URL('../../../packages/mcp/dist/index.js', import.meta.url))],
  env: { DETUNED_BASE_URL: 'http://127.0.0.1:1', DETUNED_TOKEN: 'synthetic-unused-review-token' },
  stderr: 'pipe',
});
bridge.stderr?.on('data', () => {});
const client = new Client({ name: 'detuned-review', version: '1.0.0' });
try {
  await client.connect(bridge);
  const listed = await client.listTools();
  results.push({ id: 'A05', description: 'Actual stdio bridge completes official SDK tool discovery', passes: listed.tools.length === DETUNED_TOOLS.length, count: listed.tools.length });
} catch (error) {
  results.push({ id: 'A05', description: 'Actual stdio bridge completes official SDK tool discovery', passes: false, error: String(error).slice(0, 2000) });
} finally {
  await client.close();
  await bridge.close();
}
const output = { reviewed_date: '2026-09-28', runtime: process.version, pi_real_runtime_tested: false, mcp_real_stdio_discovery_tested: true, probes: results, passed: results.filter(r => r.passes).length, failed: results.filter(r => !r.passes).length };
process.stdout.write(JSON.stringify(output, null, 2) + '\n');
process.exitCode = output.failed ? 1 : 0;
