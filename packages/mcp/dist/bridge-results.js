import { DetunedError, ErrorCode } from '@detuned/protocol';
import { ClientTransportError, ClientProtocolError, TimeoutError, UserAbortError } from '@detuned/client';
const TEXT_LIMIT = 16384;
const encoder = new TextEncoder();
function text(value, summary) {
    const full = JSON.stringify(value, null, 2);
    return encoder.encode(full).byteLength <= TEXT_LIMIT ? full : JSON.stringify(summary);
}
export function bridgeSuccess(result) {
    return {
        structuredContent: { result },
        content: [{ type: 'text', text: text(result, { truncated: true, full_result: 'structuredContent.result', text_limit_bytes: TEXT_LIMIT }) }],
    };
}
export function bridgeFailure(cause) {
    let error;
    if (cause instanceof DetunedError)
        error = { code: cause.code, message: cause.message, ...(cause.details === undefined ? {} : { details: cause.details }) };
    else if (cause instanceof ClientTransportError)
        error = { code: cause.code === 'ABORT_ERROR' ? 'ABORT_ERROR' : 'TRANSPORT_ERROR', message: 'Transport request failed.' };
    else if (cause instanceof ClientProtocolError)
        error = { code: 'TOOL_EXECUTION_ERROR', message: 'Service response failed protocol validation.' };
    else if (cause instanceof TimeoutError)
        error = { code: 'TOOL_EXECUTION_ERROR', message: 'Request timed out.' };
    else if (cause instanceof UserAbortError)
        error = { code: 'TOOL_EXECUTION_ERROR', message: 'Operation was cancelled.' };
    else
        error = { code: 'TOOL_EXECUTION_ERROR', message: 'Tool execution failed.' };
    return {
        isError: true, structuredContent: { error },
        content: [{ type: 'text', text: text({ error }, { error: { code: error.code }, truncated: true, full_error: 'structuredContent.error', text_limit_bytes: TEXT_LIMIT }) }],
    };
}
export const unknownTool = () => new DetunedError(ErrorCode.VALIDATION_ERROR, 'Unknown forum tool.', 400);
//# sourceMappingURL=bridge-results.js.map