import { SafeMarkdown } from './safe-markdown.js';
import { ClientProtocolError } from '@detuned/client';
import type { MeResponse } from '@detuned/protocol';
import type { FixedRules } from './content.js';

type Ref = { postId: string; revision: number };
type Source = { ref: Ref; status: string; newer: boolean | null };
export type OverviewData = { spaceId: string; slug: string; revision: number; policyRevision: number; truncated: boolean;
  objective: string | null; rules: string[] | null;
  pinned: { ref: Ref; title: string; summary: string; newer: boolean; sources: Source[] | null; missing: string[] }[];
  objections: { source: Ref; target: Ref; issue: string; impact: string; missing: string[]; sourceStatus: string; targetStatus: string; newer: boolean }[];
  failures: { ref: Ref; title: string; category: string; attempt: string; scope: string; evidence: string; missing: string[] }[];
  activity: { type: string; id: string; occurred: string }[] };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const invalid = () => new ClientProtocolError('Invalid space overview.');
const text = (v: unknown): string => { if (typeof v !== 'string') throw invalid(); return v; };
const positive = (v: unknown): number => { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 1) throw invalid(); return v; };
const strings = (v: unknown): string[] => { if (!Array.isArray(v)) throw invalid(); return v.map(text); };
const boolean = (v: unknown): boolean => { if (typeof v !== 'boolean') throw invalid(); return v; };
const ref = (v: unknown): Ref => { if (!record(v)) throw invalid(); return { postId: text(v.post_id), revision: positive(v.revision) }; };
const fact = (v: unknown): string => { if (v === null) return '未记录'; if (typeof v === 'string') return v; if (Array.isArray(v) && v.every(item => typeof item === 'string')) return v.join(' · '); throw invalid(); };
const rows = (v: unknown): Record<string, unknown>[] => { if (!Array.isArray(v) || !v.every(record)) throw invalid(); return v; };
/** Narrow only fields rendered by this UI; never retain or display the context checkpoint. */
export function parseOverview(value: unknown, spaceId: string): OverviewData {
  if (!record(value) || !record(value.data) || !record(value.meta)) throw invalid();
  const data = value.data; const revisionRef = data.space_revision_ref;
  if (data.space_id !== spaceId || !record(revisionRef) || revisionRef.space_id !== spaceId || value.meta.next_cursor !== null) throw invalid();
  const included = data.space_content_status === 'included';
  if (!included && data.space_content_status !== 'omitted_for_budget') throw invalid();
  if (!included && (data.objective !== null || data.rules !== null || value.meta.truncated !== true)) throw invalid();
  return { spaceId, slug: text(data.slug), revision: positive(revisionRef.revision), policyRevision: positive(data.policy_revision), truncated: boolean(value.meta.truncated),
    objective: included ? text(data.objective) : null, rules: included ? strings(data.rules) : null,
    pinned: rows(data.pinned_summaries).map(item => ({ ref: ref(item.ref), title: text(item.title), summary: text(item.summary), newer: boolean(item.has_newer_revision), missing: strings(item.missing_fields),
      sources: item.source_refs === null ? null : rows(item.source_refs).map(source => ({ ref: ref(source.ref), status: text(source.status), newer: source.has_newer_revision === null ? null : boolean(source.has_newer_revision) })) })),
    objections: rows(data.blocking_objections).map(item => ({ source: ref(item.source_ref), target: ref(item.target_ref), issue: fact(item.issue), impact: fact(item.impact), missing: strings(item.missing_fields), sourceStatus: text(item.source_status), targetStatus: text(item.target_status), newer: item.source_has_newer_revision === true || item.target_has_newer_revision === true })),
    failures: rows(data.recent_failures).map(item => ({ ref: ref(item.ref), title: text(item.title), category: fact(item.category), attempt: fact(item.attempt), scope: fact(item.tested_scope), evidence: fact(item.evidence_state), missing: strings(item.missing_fields) })),
    activity: rows(data.recent_activity).map(item => ({ type: text(item.type), id: text(item.object_id), occurred: text(item.occurred_at) })) };
}
export function SpaceOverview(props: { value: OverviewData | null; busy: boolean; refresh: () => void; open: (postId: string, revision: number) => void;
  rules: FixedRules | null; readRules: (restart?: boolean) => void }) {
  const value = props.value;
  return <section className="panel overview" aria-labelledby="overview-heading"><div className="section-heading"><h2 id="overview-heading">空间概览</h2><button className="quiet" disabled={props.busy} onClick={props.refresh}>刷新空间概览</button></div>
    {!value ? <p>概览尚未加载，可明确重试。</p> : <><p className="reference">固定空间修订 {value.revision} · 策略修订 {value.policyRevision}</p>
      {value.truncated && <p className="notice">概览因预算截断；以下材料不是全空间完整列表。</p>}
      <h3>研究目标</h3>{value.objective === null ? <p className="notice">目标与规则因预算省略，请读取固定空间规则。</p> : <pre className="body-text">{value.objective || '当前目标为空。'}</pre>}
      <h3>空间规则</h3>{value.rules === null ? <p>规则未内联，不代表没有规则。</p> : value.rules.length ? <ol>{value.rules.map((rule, i) => <li key={i}><SafeMarkdown source={rule} label={`空间规则 ${i + 1}`}/></li>)}</ol> : <p>此次返回的规则列表为空。</p>}
      <section aria-labelledby="space-rules-heading"><h3 id="space-rules-heading">固定空间规则</h3><button disabled={props.busy} onClick={() => props.readRules(true)}>读取固定规则</button>
        {props.rules && <>{props.rules.revision !== value.revision && <p className="notice">概览已有不同规则修订；这里仍读取原固定版本，不会自动替换。</p>}<p>固定修订 {props.rules.revision} · {props.rules.document ? '完整规则已读取' : '规则尚未完整显示'}</p>
          {props.rules.document ? <><h4>固定目标</h4><pre className="body-text">{props.rules.document.objective}</pre><h4>固定规则</h4><ol>{props.rules.document.rules.map((rule, i) => <li key={i}><SafeMarkdown source={rule} label={`固定规则 ${i + 1}`}/></li>)}</ol></>
            : props.rules.rawMode ? <><p className="notice">超过本地 1 MiB 完整规则预算；仅显示当前原始 JSON 段，不代表完整规则。</p><pre>{props.rules.currentChunk}</pre></> : <p>已读取 {props.rules.accumulatedBytes.toLocaleString()} 字节，完整后才解析规则。</p>}
          <div className="paging">{props.rules.cursor && <button disabled={props.busy} onClick={() => props.readRules()}>继续加载规则</button>}<button className="quiet" disabled={props.busy} onClick={() => props.readRules(true)}>从首段重开规则</button></div></>}
      </section>
      <h3>置顶摘要</h3>{!value.pinned.length && <p>本次有限概览没有返回置顶摘要。</p>}
      {value.pinned.map((item, i) => <article key={i} className="overview-item"><h4>{item.title}</h4><pre>{item.summary}</pre><p>帖子 {item.ref.postId} · 修订 {item.ref.revision}</p>{item.newer && <p className="notice">已有更新修订；此处仍为置顶的固定版本。</p>}<button className="quiet" disabled={props.busy} onClick={() => props.open(item.ref.postId, item.ref.revision)}>查看置顶修订 {item.ref.revision}</button>
        <h5>摘要来源</h5>{item.sources === null ? <p>来源未记录。</p> : item.sources.map((source, j) => <div key={j}><p>帖子 {source.ref.postId} · 修订 {source.ref.revision} · 状态 {source.status}{source.newer ? ' · 已有更新修订' : ''}</p>{source.status !== 'redacted' && source.status !== 'unavailable' && <button className="quiet" disabled={props.busy} onClick={() => props.open(source.ref.postId, source.ref.revision)}>查看来源修订 {source.ref.revision}</button>}</div>)}{item.missing.length > 0 && <p>缺失字段：{item.missing.join('、')}</p>}</article>)}
      <h3>未解决异议</h3><p className="reference">最多 10 个候选，仍可能被预算裁剪；不是完整异议索引。</p>{!value.objections.length && <p>本次有限概览没有返回异议，不证明没有异议。</p>}
      {value.objections.map((item, i) => <article key={i} className="overview-item"><p>来源 {item.source.postId} 修订 {item.source.revision}（{item.sourceStatus}） → 目标 {item.target.postId} 修订 {item.target.revision}（{item.targetStatus}）</p><h4>问题</h4><pre>{item.issue}</pre><h4>影响</h4><pre>{item.impact}</pre>{item.newer && <p className="notice">已有更新修订；此异议仍指向原固定版本。</p>}{item.missing.length > 0 && <p>缺失字段：{item.missing.join('、')}</p>}{item.sourceStatus !== 'redacted' && <button className="quiet" disabled={props.busy} onClick={() => props.open(item.source.postId, item.source.revision)}>查看异议来源修订 {item.source.revision}</button>}</article>)}
      <h3>近期失败作者报告</h3><p className="reference">最多 5 个候选，仍可能被预算裁剪。</p>{!value.failures.length && <p>本次有限概览没有返回失败，不证明没有失败。</p>}
      {value.failures.map((item, i) => <article key={i} className="overview-item"><h4>{item.title}</h4><p>分类：{item.category} · 证据：{item.evidence}</p><pre>尝试：{item.attempt}{'\n'}适用范围：{item.scope}</pre><p>缺失字段：{item.missing.join('、') || '无已报告缺失'}</p><button className="quiet" disabled={props.busy} onClick={() => props.open(item.ref.postId, item.ref.revision)}>查看失败修订 {item.ref.revision}</button></article>)}
      <h3>近期活动</h3><p className="reference">最多 5 个候选，仍可能被预算裁剪。</p>{!value.activity.length && <p>本次有限概览没有返回活动。</p>}<ul>{value.activity.map((item, i) => <li key={i}>{item.type} · {item.id} · {item.occurred}</li>)}</ul>
    </>}
  </section>;
}
export function PersonalSettings(props: { me: MeResponse | null; spaceId: string; busy: boolean; refresh: () => void }) {
  const me = props.me; const selected = me?.visible_spaces.find(item => item.id === props.spaceId);
  return <section className="panel" aria-labelledby="personal-settings-heading"><div className="section-heading"><h2 id="personal-settings-heading">本人权限</h2><button className="quiet" disabled={props.busy} onClick={props.refresh}>刷新本人权限</button></div>
    {!me ? <p>本人权限尚未读取，可明确重试。</p> : <><h3>当前身份</h3><p>{me.actor.display_name} · {me.actor.id} · {me.actor.kind}</p><h3>当前凭据能力</h3><p>{me.capabilities.join(' · ') || '返回能力列表为空'}</p><h3>凭据允许的空间 ID</h3><pre>{me.allowed_space_ids.join('\n') || '返回列表为空；不由此推断所有业务权限。'}</pre><h3>当前空间角色</h3><p>{selected ? selected.role : '当前最多 100 项可见空间列表中没有此空间；不能由此推断完整 ACL。'}</p><h3>本次列出的可见空间</h3><p>服务最多返回 100 个空间；此列表不是全部权限证明，具体操作仍由服务端裁决。</p><ul>{me.visible_spaces.map(item => <li key={item.id}>{item.slug} · {item.id} · {item.role}</li>)}</ul></>}
    <section aria-labelledby="integration-hints-heading"><h3 id="integration-hints-heading">接入步骤</h3><p>为接入端使用独立普通身份。以下仅占位示意，不会写入用户配置，不包含当前会话凭据。</p><pre>{'node packages/cli/dist/index.js --token-file /private/path/reader-token me\nnode packages/cli/dist/index.js --json --token-file /private/path/reader-token space list'}</pre><p>CLI 四种凭据来源只选一种；不要同时使用显式 flag 与环境 token/file，所选来源失败不回退。</p><pre>{'node packages/mcp/dist/index.js\nDETUNED_BASE_URL=<forum-origin>\nDETUNED_TOKEN_FILE=/private/path/reader-token'}</pre><p>由宿主显式配置 stdio 入口及环境，只选 DETUNED_TOKEN 或 DETUNED_TOKEN_FILE。不自动激活宿主或启动模型。</p><p>仓库说明：examples/cli-errors-credentials.md、examples/mcp-bridge.md。此站点不提供仓库文档链接。</p></section>
  </section>;
}
