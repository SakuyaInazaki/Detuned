import { ClientProtocolError } from '@detuned/client';
import { POST_KINDS, type PostKind, type EvidenceRef } from '@detuned/protocol';

export type SearchItem = { post_id: string; revision: number; thread_id: string; kind: PostKind;
  title: string; summary: string; snippet: string; tags: string[] };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((item: unknown) => typeof item === 'string');
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
function searchItem(v: unknown): SearchItem {
  if (!record(v) || typeof v.post_id !== 'string' || !positive(v.revision) || typeof v.thread_id !== 'string'
    || typeof v.kind !== 'string' || !POST_KINDS.some(kind => kind === v.kind)
    || typeof v.title !== 'string' || typeof v.summary !== 'string' || typeof v.snippet !== 'string' || !strings(v.tags)) {
    throw new ClientProtocolError('Invalid search result.');
  }
  const kind = POST_KINDS.find(kind => kind === v.kind);
  if (!kind) throw new ClientProtocolError('Invalid search result.');
  return { post_id: v.post_id, revision: v.revision, thread_id: v.thread_id, kind,
    title: v.title, summary: v.summary, snippet: v.snippet, tags: v.tags };
}
export function parseSearchItems(value: unknown): SearchItem[] {
  if (!Array.isArray(value)) throw new ClientProtocolError('Invalid search result page.');
  return value.map(searchItem);
}
export const failureFields = [
  ['attempt', '尝试'], ['category', '失败类别'], ['assumptions', '适用假设'], ['tested_scope', '实际测试范围'],
  ['expected', '预期'], ['observed', '观察结果'], ['evidence_state', '证据状态'], ['evidence_missing_reason', '证据缺失原因'],
  ['ruled_out', '已排除'], ['not_ruled_out', '尚未排除'], ['retry_when', '重试条件'],
] as const;
type FailureField = typeof failureFields[number][0];
export type FailureItem = SearchItem & {
  material: Record<FailureField, string | string[] | null>;
  evidence: EvidenceRef[] | null; missing: string[];
};
function evidenceRef(v: unknown): EvidenceRef {
  if (record(v) && v.kind === 'artifact' && typeof v.artifact_id === 'string') return { kind: 'artifact', artifact_id: v.artifact_id };
  if (record(v) && v.kind === 'post' && typeof v.post_id === 'string' && positive(v.revision)) return { kind: 'post', post_id: v.post_id, revision: v.revision };
  throw new ClientProtocolError('Invalid failure evidence reference.');
}
const nullableString = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') throw new ClientProtocolError('Invalid failure material.');
  return v;
};
const nullableStrings = (v: unknown): string[] | null => {
  if (v === null || v === undefined) return null;
  if (!strings(v)) throw new ClientProtocolError('Invalid failure material.');
  return v;
};
export function parseFailures(value: unknown): FailureItem[] {
  if (!Array.isArray(value) || value.length > 50) throw new ClientProtocolError('Invalid failure view.');
  return value.map((v: unknown) => {
    const item = searchItem(v);
    if (!record(v) || v.kind !== 'failure' || v.type !== 'failure' || v.report_kind !== 'author_report'
      || v.formal_review_status !== 'not_enabled' || v.formal_check_status !== 'not_enabled' || !record(v.material)) {
      throw new ClientProtocolError('Invalid failure view.');
    }
    const m = v.material;
    if (!strings(m.missing_fields)) throw new ClientProtocolError('Invalid failure material.');
    const evidence = m.evidence_refs === null || m.evidence_refs === undefined ? null : Array.isArray(m.evidence_refs) ? m.evidence_refs.map(evidenceRef) : undefined;
    if (evidence === undefined) throw new ClientProtocolError('Invalid failure evidence.');
    return { ...item, material: {
      attempt: nullableString(m.attempt), category: nullableString(m.category), assumptions: nullableStrings(m.assumptions),
      tested_scope: nullableString(m.tested_scope), expected: nullableString(m.expected), observed: nullableString(m.observed),
      evidence_state: nullableString(m.evidence_state), evidence_missing_reason: nullableString(m.evidence_missing_reason),
      ruled_out: nullableString(m.ruled_out), not_ruled_out: nullableStrings(m.not_ruled_out), retry_when: nullableStrings(m.retry_when),
    }, evidence, missing: m.missing_fields };
  });
}
export function FailureReport({ item, open }: { item: FailureItem; open: (postId: string, revision: number, threadId?: string) => void }) {
  const label = (key: string) => failureFields.find(field => field[0] === key)?.[1] ?? (key === 'evidence_refs' ? '证据引用' : key);
  return <article className="failure-report">
    <div className="section-heading"><h3>{item.title}</h3><span className="report-badge">作者报告</span></div>
    <p className="summary">{item.summary}</p><p className="reference">帖子 {item.post_id} · 修订 {item.revision}</p>
    <dl className="failure-material">{failureFields.map(([field, name]) => <div key={field}><dt>{name}</dt><dd>{item.material[field] === null ? '未提供' : Array.isArray(item.material[field]) ? (item.material[field].length ? <ul>{item.material[field].map((text, i) => <li key={i}>{text}</li>)}</ul> : '已提供空列表') : item.material[field]}</dd></div>)}</dl>
    <h4>证据引用</h4>{item.evidence === null ? <p>未提供</p> : item.evidence.length ? <ul className="evidence-list">{item.evidence.map((ref, i) => <li key={i}>{ref.kind === 'post' ? <><span>帖子 {ref.post_id} · 修订 {ref.revision}</span><button className="quiet" onClick={() => open(ref.post_id, ref.revision, ref.post_id === item.post_id ? item.thread_id : undefined)}>查看证据修订 {ref.revision}</button></> : <span>附件 {ref.artifact_id}（此页仅列引用）</span>}</li>)}</ul> : <p>已提供空列表</p>}
    <p className="notice">{item.missing.length ? `历史报告缺失字段：${item.missing.map(label).join('、')}。未提供不代表已验证。` : '报告已提供这些结构字段；这不代表证据已独立验证。'}</p>
    <p className="reference">正式评审与正式检查尚未启用。</p><button onClick={() => open(item.post_id, item.revision, item.thread_id)}>查看报告修订 {item.revision}</button>
  </article>;
}
