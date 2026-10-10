import { describe, expect, it } from 'vitest';
import { ClientProtocolError } from '@detuned/client';
import { parseFindings, parseFailures } from '../../packages/web/src/knowledge.js';

// Pure untrusted-input checks only; these do not prove database authorization.
const base = { post_id: 'claim', revision: 3, thread_id: 'thread', title: '<script>unsafe</script>',
  summary: '[link](javascript:alert(1))', snippet: '', tags: [], created_at: '2026-10-09T00:00:00.000Z',
  report_kind: 'author_report', formal_review_status: 'not_requested', formal_check_status: 'not_requested', formal_review: null, relations: [] };
const claim = () => ({ ...base, type: 'claim', kind: 'claim', material: {
  statement: null, assumptions: [], scope: 'finite scope', falsification_plan: null, missing_fields: ['statement', 'falsification_plan'],
} });
const failure = () => ({ ...base, post_id: 'failure', type: 'failure', kind: 'failure', material: {
  attempt: null, category: null, assumptions: null, tested_scope: null, expected: null, observed: null,
  evidence_refs: null, evidence_state: null, evidence_missing_reason: null, ruled_out: null,
  not_ruled_out: null, retry_when: null,
  missing_fields: ['attempt', 'category', 'assumptions', 'tested_scope', 'expected', 'observed', 'evidence_refs', 'evidence_state', 'evidence_missing_reason', 'ruled_out', 'not_ruled_out', 'retry_when'],
} });
const reviewed = () => ({ ...claim(), formal_review_status: 'accepted', formal_check_status: 'pending', formal_review: {
  request_id: 'request', snapshot_id: 'snapshot', phase: 'accepted', verification_status: 'pending',
  current_validity: 'superseded', validity_reasons: [], space_id: 'space', target_post_id: 'claim',
  round: 2, target_revision: 1, created_at: '2026-10-09T00:00:00.000Z',
} });

describe('M6.4-C2A Web knowledge input (pure parsing)', () => {
  it('preserves author material, null/missing and literal untrusted strings without normalization', () => {
    const value = claim(); expect(parseFindings([value], 'space')).toEqual([value]);
    expect(parseFailures([failure()], 'space')[0]?.material.evidence_refs).toBeNull();
    expect(parseFindings([], 'space')).toEqual([]);
  });
  it('preserves latest historical round, pending check and fixed old target separately', () => {
    const value = reviewed(); expect(parseFindings([value], 'space')).toEqual([value]);
    expect(parseFindings([value], 'space')[0]?.formal_review?.target_revision).toBe(1);
    expect(parseFindings([value], 'space')[0]?.revision).toBe(3);
  });
  it('rejects entire arrays when even one row is malformed, unknown, or over view bounds', () => {
    for (const bad of [{ ...claim(), unexpected: true }, { ...claim(), created_at: 'yesterday' },
      { ...claim(), material: { ...claim().material, scope: undefined } }, { ...claim(), kind: 'failure' }]) {
      expect(() => parseFindings([claim(), bad], 'space')).toThrow(ClientProtocolError);
    }
    expect(() => parseFindings(Array.from({ length: 26 }, claim))).toThrow(ClientProtocolError);
    expect(() => parseFailures(Array.from({ length: 51 }, failure))).toThrow(ClientProtocolError);
    expect(() => parseFailures([failure(), { ...failure(), formal_review: undefined }])).toThrow(ClientProtocolError);
  });
  it('rejects mismatched summary facts and cross-scope targets without inventing valid status', () => {
    const value = reviewed();
    for (const bad of [{ ...value, formal_check_status: 'passed' }, { ...value, formal_review_status: 'revealed' },
      { ...value, formal_review: { ...value.formal_review, space_id: 'other' } },
      { ...value, formal_review: { ...value.formal_review, target_post_id: 'other' } },
      { ...value, formal_review: { ...value.formal_review, target_revision: 4 } },
      { ...claim(), formal_check_status: 'pending' }]) {
      expect(() => parseFindings([bad], 'space')).toThrow(ClientProtocolError);
    }
  });
});
