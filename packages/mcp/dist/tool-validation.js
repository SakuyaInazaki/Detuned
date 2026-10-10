import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import { DETUNED_TOOLS, validateToolParams, DetunedError, ErrorCode, isMeResponse, isSession } from '@detuned/protocol';
import { ClientProtocolError } from '@detuned/client';
// Trusted protocol schemas only: TypeBox permits a broader contentEncoding string
// declaration than SDK JsonSchemaType. Preserve the exact object and every keyword;
// this boundary never casts unvalidated arguments or response data.
function sdkSchema(schema) {
    return schema;
}
const provider = new AjvJsonSchemaValidator();
export function resolveMcpInputMode(value) {
    if (value === undefined || value === 'flat')
        return 'flat';
    if (value === 'wrapped')
        return 'wrapped';
    throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid MCP input mode.', 400);
}
export function getMcpTools(mode = 'flat') {
    resolveMcpInputMode(mode);
    return DETUNED_TOOLS.map(tool => ({ name: tool.name, description: tool.description, inputSchema: mode === 'flat' ? tool.schema : { type: 'object', properties: { input: tool.schema }, required: ['input'], additionalProperties: false } }));
}
const tools = new Map(DETUNED_TOOLS.map(tool => [tool.name, provider.getValidator(sdkSchema(tool.schema))]));
const wrappedTools = new Map(getMcpTools('wrapped').map(tool => [tool.name, provider.getValidator(tool.inputSchema)]));
/** Validate the advertised single-source schema without rewriting or copying input. */
export function validateMcpToolArguments(name, args, mode = 'flat') {
    resolveMcpInputMode(mode);
    if (mode === 'wrapped') {
        const result = wrappedTools.get(name)?.(args);
        if (result?.valid && validateToolParams(name, result.data.input))
            return result.data.input;
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid forum tool arguments.', 400);
    }
    const validate = tools.get(name);
    if (validate) {
        const result = validate(args);
        if (result.valid && validateToolParams(name, result.data))
            return result.data;
    }
    throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid forum tool arguments.', 400);
}
export function parseMcpMe(data) {
    if (isMeResponse(data))
        return data;
    throw new ClientProtocolError('Invalid identity response.');
}
export function parseMcpSession(data) {
    if (isSession(data))
        return data;
    throw new ClientProtocolError('Invalid session response.');
}
//# sourceMappingURL=tool-validation.js.map