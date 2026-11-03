import { expect, it } from 'vitest';
// Integration helper is shared with the actual official registry experiment.
import { dshErrorCode } from '../../scripts/integrations/dsh-runtime/error-code.mjs';

it('reads exact error.code from failed MCP structured or dsh text envelopes', () => {
  expect(dshErrorCode({isError:true,structuredContent:{error:{code:'NOT_FOUND'}}})).toBe('NOT_FOUND');
  expect(dshErrorCode({isError:true,content:[{type:'text',text:'{"error":{"code":"VALIDATION_ERROR"}}'}]})).toBe('VALIDATION_ERROR');
  expect(dshErrorCode({isError:true,error:{message:'{"error":{"code":"NOT_FOUND"}}'},content:[{type:'text',text:'Error: {"error":{"code":"NOT_FOUND"}}'}]})).toBe('NOT_FOUND');
  expect(dshErrorCode({isError:true,structuredContent:{error:{code:'FORBIDDEN'}},content:[{type:'text',text:'{"error":{"code":"FORBIDDEN"}}'}]})).toBe('FORBIDDEN');
});
it('does not infer codes from unrelated strings, malformed envelopes, success or conflicting sources', () => {
  for (const value of [null, {content:[{type:'text',text:'{"error":{"code":"NOT_FOUND"}}'}]},
    {isError:false,structuredContent:{error:{code:'NOT_FOUND'}}},
    {isError:true,content:[{type:'text',text:'NOT_FOUND'}]},
    {isError:true,error:{message:'prefix {"error":{"code":"NOT_FOUND"}}'}},
    {isError:true,content:[{type:'text',text:'Unexpected Error: {"error":{"code":"NOT_FOUND"}}'}]},
    {isError:true,content:[{type:'text',text:'{"message":"NOT_FOUND","code":"FORBIDDEN"}'}]},
    {isError:true,content:[{type:'text',text:'{"error":{"message":"NOT_FOUND"}}'}]},
    {isError:true,content:[{type:'text',text:'{"error":{"code":"NOT_FOUND"}'}]},
    {isError:true,content:[{type:'image',text:'{"error":{"code":"NOT_FOUND"}}'}]},
    {isError:true,structuredContent:{error:{code:'NOT_FOUND'}},content:[{type:'text',text:'{"error":{"code":"FORBIDDEN"}}'}]},
  ]) expect(dshErrorCode(value)).toBeUndefined();
});
