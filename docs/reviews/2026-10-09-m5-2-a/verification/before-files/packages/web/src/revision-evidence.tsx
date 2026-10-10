import type { PostRevisionMetadata, RevisionArtifactCatalogItem } from '@detuned/protocol';
import type { ContentComparison } from './content.js';

export function RevisionEvidence(props: {
  busy: boolean; revisions: PostRevisionMetadata[]; currentRevision: number | null; revisionsLoaded: boolean; revisionCursor: string | null;
  loadRevisions: (cursor?: string) => void; openRevision: (revision: number) => void;
  first: string; second: string; selectFirst: (value: string) => void; selectSecond: (value: string) => void;
  compare: () => void; comparison: ContentComparison | null; comparisonStatus: string;
  artifacts: RevisionArtifactCatalogItem[]; artifactsLoaded: boolean; artifactCursor: string | null;
  loadArtifacts: (cursor?: string) => void; download: (id: string) => void;
}) {
  const choices = [...new Set([...props.revisions.map(item => String(item.revision)), props.first, props.second].filter(Boolean))];
  return <div className="revision-evidence">
    <section aria-labelledby="revision-directory-heading"><h3 id="revision-directory-heading">修订目录</h3>
      <button className="quiet" disabled={props.busy} onClick={() => props.loadRevisions()}>加载修订目录</button>
      {props.currentRevision !== null && <p className="reference">目录查询时当前修订：{props.currentRevision}。正文仍保持已选版本。</p>}
      {props.revisionsLoaded && !props.revisions.length && <p className="empty">当前目录页没有修订。</p>}
      <ul className="revision-list">{props.revisions.map(item => <li key={item.revision}><div><strong>修订 {item.revision}</strong><small>{item.created_at}</small><small>编辑者 {item.editor_id}</small><small>内容摘要 {item.content_hash}</small></div><button className="quiet" disabled={props.busy} onClick={() => props.openRevision(item.revision)}>打开修订 {item.revision}</button></li>)}</ul>
      {props.revisionCursor && <button disabled={props.busy} onClick={() => props.loadRevisions(props.revisionCursor!)}>下一页修订</button>}
      <div className="compare-controls"><label>比较版本一<select value={props.first} disabled={props.busy} onChange={e => props.selectFirst(e.target.value)}><option value="">选择修订</option>{choices.map(revision => <option key={revision} value={revision}>{revision}</option>)}</select></label>
        <label>比较版本二<select value={props.second} disabled={props.busy} onChange={e => props.selectSecond(e.target.value)}><option value="">选择修订</option>{choices.map(revision => <option key={revision} value={revision}>{revision}</option>)}</select></label>
        <button disabled={props.busy || !props.first || !props.second} onClick={props.compare}>比较所选版本</button></div>
      <section aria-labelledby="comparison-heading"><h4 id="comparison-heading">五字段比较</h4><p aria-live="polite">{props.comparisonStatus || '选择同帖的两个明确修订后比较。'}</p>
        {props.comparison && <><p>修订 {props.comparison.beforeRevision} → 修订 {props.comparison.afterRevision}，五字段完整对比。</p>{props.comparison.fields.map(item => <section className="field-comparison" key={item.field}><h5>{item.field} · {item.changed ? '变化' : '相同'}</h5><div className="comparison-columns"><div><h6>前：修订 {props.comparison!.beforeRevision}</h6><pre>{item.before}</pre></div><div><h6>后：修订 {props.comparison!.afterRevision}</h6><pre>{item.after}</pre></div></div></section>)}</>}
      </section>
    </section>
    <section aria-labelledby="artifacts-heading"><h3 id="artifacts-heading">本修订附件</h3><p>仅列此固定修订关联的附件。下载不会自动预览或执行。</p>
      <button className="quiet" disabled={props.busy} onClick={() => props.loadArtifacts()}>加载附件目录</button>
      {props.artifactsLoaded && !props.artifacts.length && <p className="empty">当前目录页没有关联附件。</p>}
      <ul className="artifact-list">{props.artifacts.map(item => <li key={item.id}>{item.state === 'redacted' ? <p>附件已遮蔽 {item.id}</p> : <><strong>{item.id}</strong><p>{item.state === 'ready' ? '可用' : '附件缺失，无法下载'} · {item.bytes.toLocaleString()} 字节 · {item.mime}</p><p className="reference">所有者 {item.owner_id}<br/>用途：{item.purpose || '未指定'}<br/>SHA-256：{item.sha256}<br/>{item.created_at}</p>{item.state === 'ready' && (item.bytes > 26_214_400 ? <p className="notice">此历史登记附件超过当前 25 MiB 下载上限。</p> : <button disabled={props.busy} onClick={() => props.download(item.id)}>下载附件 {item.id}</button>)}</>}</li>)}</ul>
      {props.artifactCursor && <button disabled={props.busy} onClick={() => props.loadArtifacts(props.artifactCursor!)}>下一页附件</button>}
    </section>
  </div>;
}
