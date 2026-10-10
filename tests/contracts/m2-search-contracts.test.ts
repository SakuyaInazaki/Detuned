import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import Database from 'better-sqlite3';
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Value } from '@sinclair/typebox/value';
import { SearchPage, SearchQuerySchema, SearchQStringSchema, SearchCursorPayloadSchema, ToolSearchParamsSchema, normalizeSearchQuery, isSearchCursorPayload, SEARCH_LIMITS, generateOpenApiSpec } from '@detuned/protocol';
import { activate } from '@detuned/adapter-pi';
import { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const req = createRequire(new URL('../../packages/server/package.json', import.meta.url));
const compilerReq = createRequire(createRequire(req.resolve('fastify')).resolve('@fastify/ajv-compiler'));
const Ajv = compilerReq('ajv');

import { bootstrapDatabase, SqliteStorage } from '@detuned/storage-sqlite';
import { buildApp } from '@detuned/server';
import { DetunedClient } from '@detuned/client';

// Initial no-alias run used the compiled baseline; final run uses workspace source aliases.
describe('M2.3 actual search transport and tool pagination', () => {
  let db: Database.Database; let app: ReturnType<typeof buildApp>; let client: DetunedClient; let sid: string; let tid: string; let token: string; let baseUrl: string;
  beforeEach(async () => {
    db = new Database(':memory:'); token = bootstrapDatabase(db).adminToken!;
    app = buildApp({ storage: new SqliteStorage(db) });
    const url = await app.listen({ port: 0, host: '127.0.0.1' }); baseUrl = url;
    client = new DetunedClient({ baseUrl: url, token, maxRetries: 0 });
    sid = (await client.createSpace({ slug: 'search-contract', objective: 'search', rules: [] }, 'space')).data.space.id;
    tid = (await client.createThread(sid, { title: 'search' }, 'thread')).data.thread.id;
  });
  afterEach(async () => { await app?.close(); db?.close(); });
  const note = async (client: DetunedClient, sid: string, tid: string, key: string, tags: string[]) => client.createPost(sid, tid, { kind: 'note', title: 'needle', summary: 'needle', body: 'needle', tags }, key);
  it('S01: shared tool call retains real pagination meta and lossless exact tags', async () => {
    await note(client, sid, tid, 'one', [' a,b ']); await note(client, sid, tid, 'two', [' a,b ']);
    const first = await client.callTool('forum_search', { space_id: sid, q: 'needle', filters: { tags: [' a,b '] }, limit: 1 });
    expect(first).toHaveProperty('meta.next_cursor'); expect(first.data).toHaveLength(1);
    const second = await client.callTool('forum_search', { space_id: sid, q: 'needle', filters: { tags: [' a,b '] }, limit: 1, cursor: first.meta.next_cursor });
    expect(second.data).toHaveLength(1); expect(second.data[0].post_id).not.toBe(first.data[0].post_id); expect(second.meta.next_cursor).toBeNull();
  });
  it('S02: actual app/client accepts approved Unicode and encoded long URL boundaries', async () => {
    const tags = ['图'.repeat(2729)]; expect(Buffer.byteLength(JSON.stringify(tags))).toBe(8191);
    const result = await client.search(sid, { q: '😀'.repeat(256), tags });
    expect(result.data).toEqual([]); expect(result.meta).toEqual({ truncated: false, next_cursor: null });
  });
  it('S03: HTTP JSON tags preserve all exact strings, with strict carrier/CSV/query rejection', async () => {
    await note(client, sid, tid, 'exact', [' a,b ', '', 'Case']);
    const get = (query: string) => app.inject({ method: 'GET', url: `/api/v1/spaces/${sid}/search?q=needle&${query}`, headers: { authorization: `Bearer ${token}` } });
    for (const tags of [[' a,b '], [''], ['Case', 'Case'], []]) expect((await get(`tags_json=${encodeURIComponent(JSON.stringify(tags))}`)).json().data).toHaveLength(1);
    expect((await get('tags_json=%5B%22case%22%5D')).json().data).toEqual([]);
    for (const query of ['tags=&tags_json=[]', 'tags_json=[]&tags_json=[]', 'tags_json={}', 'tags_json=null', 'tags_json=[42]', 'tags_json=', 'tags_json=%5B', 'unknown=x', 'cursor=', 'cursor=%20', 'cursor=pst_legacy']) {
      const res = await get(query); expect(res.statusCode, query).toBe(400); expect(res.json().error).toMatchObject({ code: 'VALIDATION_ERROR', retryable: false });
    }
    expect((await get('tags=Case')).json().data).toHaveLength(1);
    expect((await get('tags=')).statusCode).toBe(200);
    expect((await get(`tags_json=${encodeURIComponent(' '.repeat(8191) + '[]')}`)).statusCode).toBe(400);
    expect((await get(`tags_json=${encodeURIComponent(JSON.stringify(Array.from({length:101}, (_,i)=>String(i))))}`)).statusCode).toBe(400);
    const first = await client.search(sid, {q:'needle',limit:1});
    // Add a second matching item so a signed continuation exists.
    await note(client,sid,tid,'other',['Case']);
    const page = await client.search(sid,{q:'needle',limit:1});
    expect(page.meta.next_cursor).toEqual(expect.any(String));
    await expect(client.search(sid,{q:'different',cursor:page.meta.next_cursor!})).rejects.toMatchObject({statusCode:400,code:'VALIDATION_ERROR',retryable:false});
    expect(first.data).toHaveLength(1);
  });

  it('S04: installed Pi validator + registered executor and MCP stdio retain search meta', async () => {
    await note(client,sid,tid,'one',['Case']); await note(client,sid,tid,'two',['Case']);
    const previous = { base:process.env.DETUNED_BASE_URL, token:process.env.DETUNED_TOKEN };
    const registered = new Map<string,any>();
    try {
      process.env.DETUNED_BASE_URL=baseUrl; process.env.DETUNED_TOKEN=token;
      activate({ registerTool:(t:any)=>registered.set(t.name,t), registerCommand:()=>{}, on:()=>{} } as any);
      const piPath = realpathSync(new URL('../../packages/adapter-pi/node_modules/@earendil-works/pi-coding-agent/package.json',import.meta.url));
      const {validateToolArguments} = await import(new URL('../pi-ai/dist/utils/validation.js',pathToFileURL(piPath)).href);
      const tool=registered.get('forum_search');
      expect(validateToolArguments(tool,{type:'toolCall',id:'unicode',name:'forum_search',arguments:{space_id:sid,q:'😀'.repeat(256)}}).q).toBe('😀'.repeat(256));
      expect(()=>validateToolArguments(tool,{type:'toolCall',id:'unicode-invalid',name:'forum_search',arguments:{space_id:sid,q:'😀'.repeat(257)}})).toThrow();
      const args={space_id:sid,q:'needle',limit:1};
      const validated=validateToolArguments(tool,{type:'toolCall',id:'search',name:'forum_search',arguments:args});
      const result=await tool.execute('search',validated,undefined);
      const piPage=JSON.parse(result.content[0].text); expect(piPage.data).toHaveLength(1); expect(piPage.meta.next_cursor).toEqual(expect.any(String));
      expect(result.details).toEqual(piPage);
      const mcp=new McpClient({name:'m23-contract',version:'1'}, {capabilities:{}});
      const transport=new StdioClientTransport({command:process.execPath,args:['packages/mcp/dist/index.js'],env:{...Object.fromEntries(Object.entries(process.env).filter((e):e is [string,string]=>e[1]!==undefined)),DETUNED_BASE_URL:baseUrl,DETUNED_TOKEN:token},stderr:'pipe'});
      try {
        await mcp.connect(transport);
        const list=await mcp.listTools(); expect(list.tools.find(t=>t.name==='forum_search')?.inputSchema.properties?.q).toEqual(JSON.parse(JSON.stringify(SearchQStringSchema)));
        const result=await mcp.callTool({name:'forum_search',arguments:args});
        const page=JSON.parse((result.content as any[])[0].text); expect(page.data).toHaveLength(1); expect(page.meta.next_cursor).toEqual(expect.any(String));
        const next=await mcp.callTool({name:'forum_search',arguments:{...args,cursor:page.meta.next_cursor}});
        expect(JSON.parse((next.content as any[])[0].text).meta.next_cursor).toBeNull();
      } finally { await mcp.close(); await transport.close(); }
    } finally {
      if(previous.base===undefined) delete process.env.DETUNED_BASE_URL; else process.env.DETUNED_BASE_URL=previous.base;
      if(previous.token===undefined) delete process.env.DETUNED_TOKEN; else process.env.DETUNED_TOKEN=previous.token;
    }
  },10000);

});


describe('M2.3 shared logical query contracts',()=>{
  it('S05: Unicode boundaries agree across TypeBox and both installed AJV RegExp flags',()=>{
    const matrix: [string,boolean][]=[['a'.repeat(256),true],['a'.repeat(257),false],['😀'.repeat(256),true],['😀'.repeat(257),false],['  '+ '😀'.repeat(256)+' \n',true],['a\nb',true],['a\u0301'.repeat(128),true],['a\u0301'.repeat(129),false],[' '.repeat(8192),false],[' '.repeat(8192)+'a'.repeat(257),false]];
    for(const [q,expected] of matrix){ expect(Value.Check(SearchQStringSchema,q)).toBe(expected); for(const unicodeRegExp of [true,false]) expect(new Ajv({strict:false,unicodeRegExp}).compile(SearchQStringSchema)(q)).toBe(expected); }
    const raw={q:' needle ',tags:[' b ','a,b',' b '],limit:2}; const before=JSON.stringify(raw);
    expect(normalizeSearchQuery(raw)).toEqual({q:'needle',tags:[' b ','a,b'],limit:2}); expect(JSON.stringify(raw)).toBe(before);
    expect(normalizeSearchQuery({q:'needle',tags:Array(101).fill('same')}).tags).toEqual(['same']);
    for(const tags of [Array.from({length:101},(_,i)=>String(i)),['图'.repeat(2730)]]) expect(()=>normalizeSearchQuery({q:'needle',tags})).toThrow();
    const payload={v:1,purpose:'search',actor_id:'a',space_id:'s',query_hash:'a'.repeat(64),sort:'id_desc',before_id:'p',exp:1};
    expect(isSearchCursorPayload(payload)).toBe(true); expect(isSearchCursorPayload({...payload,extra:1})).toBe(false);
    expect(new Ajv({strict:false}).compile(SearchCursorPayloadSchema)(payload)).toBe(true);
    expect(Value.Check(ToolSearchParamsSchema,{space_id:'s',q:'😀'.repeat(256)})).toBe(true);
    expect(Value.Check(SearchQuerySchema,{q:'needle',unknown:1})).toBe(false);
    expectTypeOf<ReturnType<DetunedClient['search']>>().toEqualTypeOf<Promise<SearchPage>>();
    const spec=generateOpenApiSpec() as any; const op=spec.paths['/spaces/{space_id}/search'].get;
    expect(op.parameters.find((p:any)=>p.name==='q').schema).toEqual(SearchQStringSchema);
    expect(op.parameters.find((p:any)=>p.name==='tags_json')['x-max-utf8-bytes']).toBe(SEARCH_LIMITS.tags_json_bytes);
    expect(op.responses['200'].content['application/json'].schema.required).toContain('meta');
  });
});
