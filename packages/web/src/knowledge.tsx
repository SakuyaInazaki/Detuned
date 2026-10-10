import { ClientProtocolError } from '@detuned/client';
import { POST_KINDS, isFindingsView, isFailuresView, type PostKind, type FindingViewItem, type FailureViewItem, type RelationProjection } from '@detuned/protocol';
import { SafeMarkdown } from './safe-markdown.js';

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
export type FindingItem = FindingViewItem;
export type FailureItem = FailureViewItem;
type Open = (postId: string, revision: number, threadId?: string) => void;
export function parseFindings(value: unknown, spaceId?: string): FindingItem[] {
  if (!isFindingsView(value, spaceId)) throw new ClientProtocolError('Invalid findings view.');
  return value;
}
export function parseFailures(value: unknown, spaceId?: string): FailureItem[] {
  if (!isFailuresView(value, spaceId)) throw new ClientProtocolError('Invalid failure view.');
  return value;
}
const findingFields = [['statement', '主张'], ['assumptions', '适用假设'], ['scope', '适用范围'], ['falsification_plan', '证伪计划']] as const;
function MaterialValue({ value }: { value: string | string[] | null }) {
  return value === null ? <>未提供</> : Array.isArray(value) ? value.length ? <ul>{value.map((text, i) => <li key={i}>{text}</li>)}</ul> : <>已提供空列表</> : <>{value}</>;
}
const phaseLabels: Record<FindingItem['formal_review_status'], string> = {
  not_enabled: '未启用', not_requested: '未发起', collecting: '收集初评中', revealed: '已揭示',
  accepted: '历史裁决：接受', rejected: '历史裁决：拒绝', changes_requested: '要求修改', stale: '已失效', cancelled: '已取消',
};
const checkLabels: Record<FindingItem['formal_check_status'], string> = {
  not_enabled: '未启用', not_requested: '未发起', not_required: '此轮无需检查（不表示检查通过）',
  pending: '待完成', passed: '已通过', failed: '失败', error: '检查错误',
};
function FormalFacts({ item, open }: { item: FindingItem | FailureItem; open: Open }) {
  const round = item.formal_review;
  const validity = { current: '当前有效', superseded: '材料或规则已有更新', challenged: '受到挑战', invalidated: '已失效' };
  return <section className="knowledge-formal" aria-label="正式状态">
    <h4>正式状态</h4><dl className="knowledge-facts">
      <dt>正式评审</dt><dd>{phaseLabels[item.formal_review_status]}</dd>
      <dt>正式检查</dt><dd>{checkLabels[item.formal_check_status]}</dd>
      <dt>当前材料有效性</dt><dd>{round ? validity[round.current_validity] : '无评审轮次，未产生评审有效性结论'}</dd>
    </dl>{round && <><p className="reference">最近评审轮次 {round.round} · 请求 {round.request_id} · 评审对象固定修订 {round.target_revision}</p>
      <p className="reference">快照 {round.snapshot_id} · 创建时间 {round.created_at}</p>
      <p>有效性原因：{round.validity_reasons.length ? round.validity_reasons.join('、') : '无'}</p>
      <p className="notice">评审结论针对固定材料；历史接受不代表当前条目修订获批。检查状态与评审结论分别展示。</p>
      <button className="quiet" onClick={() => open(round.target_post_id, round.target_revision, item.thread_id)}>阅读评审对象修订 {round.target_revision}</button>
      <p className="reference">打开固定正文后，可进入正式评审目录选择轮次。</p></>}
    {item.kind === 'failure' && <p className="reference">失败报告不能作为正式评审对象；其作为依赖材料被评审，不赋予本报告批准。</p>}
  </section>;
}
function Relations({ relations, open, item }: { relations: RelationProjection[]; open: Open; item: FindingItem | FailureItem }) {
  return <section><h4>公共来源关系</h4>{relations.length ? <ul className="evidence-list">{relations.map(relation => <li key={relation.relation_id}>
    <span>{relation.relation_type} · {relation.state} · 关系 {relation.relation_id} / 版本 {relation.version}</span>
    <p className="reference">创建者 {relation.creator_id} · 来源作者 {relation.source_author_id} · 对象作者 {relation.target_author_id}</p>
    {(['source', 'target'] as const).map(endpoint => { const ref = endpoint === 'source' ? relation.source_ref : relation.target_ref;
      const status = endpoint === 'source' ? relation.source_status : relation.target_status;
      const newer = endpoint === 'source' ? relation.source_has_newer_revision : relation.target_has_newer_revision;
      return <div key={endpoint}><span>{endpoint === 'source' ? '来源' : '对象'}：帖子 {ref.post_id} · 固定修订 {ref.revision} · {status} · {newer === null ? '更新情况未知' : newer ? '已有更新修订' : '无更新修订'}</span>
        <button className="quiet" onClick={() => open(ref.post_id, ref.revision, ref.post_id === item.post_id ? item.thread_id : undefined)}>阅读{endpoint === 'source' ? '来源' : '对象'}修订 {ref.revision}</button></div>;
    })}
  </li>)}</ul> : <p>暂无公共来源关系；这不表示已独立验证。</p>}</section>;
}
export function FindingReport({ item, open }: { item: FindingItem; open: Open }) {
  return <article className="finding-report">
    <div className="section-heading"><h3>{item.title}</h3><span className="report-badge">作者报告</span></div>
    <SafeMarkdown source={item.summary} label="发现摘要"/><p className="reference">帖子 {item.post_id} · 当前条目修订 {item.revision}</p>
    <dl className="failure-material">{findingFields.map(([field, name]) => <div key={field}><dt>{name}</dt><dd><MaterialValue value={item.material[field]}/></dd></div>)}</dl>
    <p className="notice">{item.material.missing_fields.length ? `历史主张缺失字段：${item.material.missing_fields.join('、')}。未提供不代表已验证。` : '作者提供了结构字段；这不代表主张已独立验证。'}</p>
    <Relations relations={item.relations} item={item} open={open}/><FormalFacts item={item} open={open}/>
    <button onClick={() => open(item.post_id, item.revision, item.thread_id)}>阅读当前条目修订 {item.revision}</button>
  </article>;
}
export function FailureReport({ item, open }: { item: FailureItem; open: Open }) {
  const label = (key: string) => failureFields.find(field => field[0] === key)?.[1] ?? (key === 'evidence_refs' ? '证据引用' : key);
  const evidence = item.material.evidence_refs;
  return <article className="failure-report">
    <div className="section-heading"><h3>{item.title}</h3><span className="report-badge">作者报告</span></div>
    <SafeMarkdown source={item.summary} label="失败摘要"/><p className="reference">帖子 {item.post_id} · 修订 {item.revision}</p>
    <dl className="failure-material">{failureFields.map(([field, name]) => <div key={field}><dt>{name}</dt><dd><MaterialValue value={item.material[field]}/></dd></div>)}</dl>
    <h4>证据引用</h4>{evidence === null ? <p>未提供</p> : evidence.length ? <ul className="evidence-list">{evidence.map((ref, i) => <li key={i}>{ref.kind === 'post' ? <><span>帖子 {ref.post_id} · 修订 {ref.revision}</span><button className="quiet" onClick={() => open(ref.post_id, ref.revision, ref.post_id === item.post_id ? item.thread_id : undefined)}>查看证据修订 {ref.revision}</button></> : <span>附件 {ref.artifact_id}（此页仅列引用）</span>}</li>)}</ul> : <p>已提供空列表</p>}
    <p className="notice">{item.material.missing_fields.length ? `历史报告缺失字段：${item.material.missing_fields.map(label).join('、')}。未提供不代表已验证。` : '报告已提供这些结构字段；这不代表证据已独立验证。'}</p>
    <Relations relations={item.relations} item={item} open={open}/><FormalFacts item={item} open={open}/>
    <p className="reference">以下动作阅读当前报告条目，与评审对象固定修订区分。</p>
    <button onClick={() => open(item.post_id, item.revision, item.thread_id)}>查看报告修订 {item.revision}</button>
  </article>;
}
