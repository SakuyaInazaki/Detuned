import { describe, it, expect } from 'vitest';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import {
  CreatePostRequestSchema,
  CreateThreadRequestSchema,
  ToolPublishParamsSchema,
  ToolSearchParamsSchema,
  ToolRelateParamsSchema,
  ErrorCode,
  generateOpenApiSpec,
  DETUNED_TOOLS,
} from '../src/index.js';

describe('Protocol Schemas', () => {
  it('validates a valid proposal post request', () => {
    const C = TypeCompiler.Compile(CreatePostRequestSchema);
    const validProposal = {
      kind: 'proposal',
      title: 'Dijkstra 变体候选方案',
      summary: '提出使用非负权优先队列的单源最短路径方案',
      body: '详细描述...',
      tags: ['graph', 'algorithm'],
      structured: {
        statement: '在非负权图中，基于优先队列的方案能够正确求解单源最短路径。',
        assumptions: ['图是有向或无向的', '所有边权非负'],
        scope: '有限简单非负权图',
        falsification_plan: '寻找包含非负权边的三点反例',
      },
    };
    expect(C.Check(validProposal)).toBe(true);
  });

  it('validates a valid failure post request with category and scope', () => {
    const C = TypeCompiler.Compile(CreatePostRequestSchema);
    const validFailure = {
      kind: 'failure',
      title: '尝试首次发现固定距离失败',
      summary: '反例表明首次发现某点并不能直接固定距离',
      body: '反例: s->a=10, s->b=1, b->a=1',
      tags: ['counterexample', 'graph'],
      structured: {
        attempt: '贪心策略直接固定首次访问点',
        category: 'counterexample',
        assumptions: ['边权非负'],
        tested_scope: '3 点有向图',
        expected: '正确得到距离 2',
        observed: '错误得到距离 10',
        evidence_refs: [],
        evidence_state: 'provided',
        ruled_out: '贪心直接固定策略在一般非负权图不可行',
        not_ruled_out: ['基于松弛的 Dijkstra 策略'],
        retry_when: ['增加松弛队列与更新逻辑'],
      },
    };
    expect(C.Check(validFailure)).toBe(true);
  });

  it('rejects unknown fields on strict schemas', () => {
    const C = TypeCompiler.Compile(CreateThreadRequestSchema);
    const invalidThread = {
      title: 'Valid title',
      extra_unknown_field: 'should fail',
    };
    expect(C.Check(invalidThread)).toBe(false);
  });

  it('validates forum tools definitions', () => {
    expect(DETUNED_TOOLS.length).toBe(8);
    const toolNames = DETUNED_TOOLS.map((t) => t.name);
    expect(toolNames).toContain('forum_context');
    expect(toolNames).toContain('forum_search');
    expect(toolNames).toContain('forum_read');
    expect(toolNames).toContain('forum_publish');
    expect(toolNames).toContain('forum_relate');
    expect(toolNames).toContain('forum_subscribe');
    expect(toolNames).toContain('forum_poll');
    expect(toolNames).toContain('forum_ack');
    expect(toolNames).not.toContain('forum_review');
  });

  it('generates a valid OpenAPI spec object', () => {
    const spec = generateOpenApiSpec();
    expect(spec.openapi).toBe('3.1.0');
    expect(spec.paths).toBeDefined();
    expect(Object.keys(spec.paths as Record<string, unknown>).length).toBeGreaterThan(5);
  });
});
