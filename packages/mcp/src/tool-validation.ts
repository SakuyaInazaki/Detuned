import {AjvJsonSchemaValidator} from '@modelcontextprotocol/sdk/validation/ajv';
import type {JsonSchemaType,JsonSchemaValidator} from '@modelcontextprotocol/sdk/validation';
import {DETUNED_TOOLS,validateToolParams,DetunedError,ErrorCode,isMeResponse,isSession,type MeResponse,type Session} from '@detuned/protocol';
import {ClientProtocolError} from '@detuned/client';

export type McpToolArguments = Record<string,unknown> & {space_id:string};
// Trusted protocol schemas only: TypeBox permits a broader contentEncoding string
// declaration than SDK JsonSchemaType. Preserve the exact object and every keyword;
// this boundary never casts unvalidated arguments or response data.
function sdkSchema(schema: (typeof DETUNED_TOOLS)[number]['schema']):JsonSchemaType {
  return schema as unknown as JsonSchemaType;
}
const provider = new AjvJsonSchemaValidator();
export type McpInputMode = 'flat'|'wrapped';
export function resolveMcpInputMode(value:unknown):McpInputMode {
  if(value===undefined||value==='flat')return 'flat';
  if(value==='wrapped')return 'wrapped';
  throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid MCP input mode.',400);
}
export function getMcpTools(mode:McpInputMode='flat') {
  resolveMcpInputMode(mode);
  return DETUNED_TOOLS.map(tool=>({name:tool.name,description:tool.description,inputSchema:mode==='flat'?tool.schema:{type:'object',properties:{input:tool.schema},required:['input'],additionalProperties:false}}));
}
const tools = new Map<string,JsonSchemaValidator<McpToolArguments>>(DETUNED_TOOLS.map(tool => [tool.name,provider.getValidator<McpToolArguments>(sdkSchema(tool.schema))]));

const wrappedTools = new Map<string,JsonSchemaValidator<{input:McpToolArguments}>>(getMcpTools('wrapped').map(tool=>[tool.name,provider.getValidator<{input:McpToolArguments}>(tool.inputSchema as JsonSchemaType)]));
/** Validate the advertised single-source schema without rewriting or copying input. */
export function validateMcpToolArguments(name:string,args:unknown,mode:McpInputMode='flat'):McpToolArguments {
  resolveMcpInputMode(mode);
  if(mode==='wrapped'){const result=wrappedTools.get(name)?.(args);if(result?.valid && validateToolParams(name,result.data.input))return result.data.input;throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid forum tool arguments.',400);}
  const validate = tools.get(name);
  if(validate){const result=validate(args);if(result.valid && validateToolParams(name,result.data))return result.data;}
  throw new DetunedError(ErrorCode.VALIDATION_ERROR,'Invalid forum tool arguments.',400);
}
export function parseMcpMe(data:unknown):MeResponse {
  if(isMeResponse(data))return data;
  throw new ClientProtocolError('Invalid identity response.');
}
export function parseMcpSession(data:unknown):Session {
  if(isSession(data))return data;
  throw new ClientProtocolError('Invalid session response.');
}
