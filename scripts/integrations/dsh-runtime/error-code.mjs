/** Read only explicit failed-tool error envelopes. Never search message substrings. */
export function dshErrorCode(result) {
  if (!record(result) || result.isError !== true) return undefined;
  const codes = [];
  const collect = value => {
    if (record(value) && record(value.error) && typeof value.error.code === 'string'
      && /^[A-Z][A-Z0-9_]{0,63}$/.test(value.error.code)) codes.push(value.error.code);
  };
  collect(result.structuredContent);
  // Official dsh ToolRuntime preserves a thrown MCP JSON error here.
  if (record(result.error) && typeof result.error.message === 'string' && result.error.message.length <= 16384) {
    try { collect(JSON.parse(result.error.message)); } catch { /* Not an envelope. */ }
  }
  if (Array.isArray(result.content)) for (const block of result.content) {
    if (!record(block) || block.type !== 'text' || typeof block.text !== 'string'
      || block.text.length > 16384) continue;
    try { collect(JSON.parse(block.text.startsWith('Error: ') ? block.text.slice(7) : block.text)); } catch { /* Plain diagnostic, not an envelope. */ }
  }
  return codes.length > 0 && codes.every(code => code === codes[0]) ? codes[0] : undefined;
}
function record(value) { return typeof value === 'object' && value !== null && !Array.isArray(value); }
