import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DetunedClient, ClientProtocolError, ClientTransportError, TimeoutError, UserAbortError } from '@detuned/client';
import { DetunedError, type WebSessionResponse, type CreatePostRequest, type CreateThreadRequest, type SearchQuery, POST_KINDS } from '@detuned/protocol';
import { parseSearchItems, parseFailures, FailureReport, type SearchItem, type FailureItem } from './knowledge.js';
import { appendContent, CONTENT_BUDGET, initialContent, type FixedContent } from './content.js';

type SpaceItem = { id: string; slug: string };
type ThreadItem = { id: string; title: string; state: 'open' | 'archived' };
type PostItem = { id: string; kind: string; current_revision: number; lifecycle: string };
type SessionState = 'restoring' | 'anonymous' | 'authenticated' | 'logout-pending';
type SpaceView = 'discussion' | 'search' | 'failures';
type ResultReading = { origin: 'search' | 'failures'; threadId: string; postId: string; revision: number };
type ThreadIntent = { body: CreateThreadRequest; key: string; spaceId: string };
type Intent = { body: CreatePostRequest; key: string; spaceId: string; threadId: string };
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function spaces(data: unknown): SpaceItem[] {
  if (!Array.isArray(data)) throw new ClientProtocolError('Invalid space page.');
  return data.map((v: unknown) => {
    if (!isRecord(v) || typeof v.id !== 'string' || typeof v.slug !== 'string') throw new ClientProtocolError('Invalid space page.');
    return { id: v.id, slug: v.slug };
  });
}
function threads(data: unknown): ThreadItem[] {
  if (!Array.isArray(data)) throw new ClientProtocolError('Invalid thread page.');
  return data.map((v: unknown) => {
    if (!isRecord(v) || typeof v.id !== 'string' || typeof v.title !== 'string' || (v.state !== 'open' && v.state !== 'archived')) throw new ClientProtocolError('Invalid thread page.');
    return { id: v.id, title: v.title, state: v.state };
  });
}
function posts(data: unknown): PostItem[] {
  if (!isRecord(data) || !Array.isArray(data.posts)) throw new ClientProtocolError('Invalid post page.');
  return data.posts.map((v: unknown) => {
    if (!isRecord(v) || typeof v.id !== 'string' || typeof v.kind !== 'string' || typeof v.lifecycle !== 'string'
      || typeof v.current_revision !== 'number' || !Number.isSafeInteger(v.current_revision) || v.current_revision < 1) throw new ClientProtocolError('Invalid post page.');
    return { id: v.id, kind: v.kind, current_revision: v.current_revision, lifecycle: v.lifecycle };
  });
}
function nextCursor(meta: unknown): string | null {
  if (meta === undefined) return null;
  if (!isRecord(meta) || (meta.next_cursor !== undefined && meta.next_cursor !== null && typeof meta.next_cursor !== 'string')) throw new ClientProtocolError('Invalid directory cursor.');
  return typeof meta.next_cursor === 'string' && meta.next_cursor ? meta.next_cursor : null;
}
function errorText(error: unknown): string {
  if (error instanceof DetunedError) {
    if (error.statusCode === 401) return '登录已失效，请重新登录。';
    if (error.statusCode === 403) return '没有执行此操作的权限。';
    if (error.statusCode === 429) return '请求过于频繁，请稍后明确重试。';
    if (error.statusCode === 404) return '内容不存在或当前身份不可见。';
    if (error.statusCode === 410) return '该内容已脱敏，无法读取正文。';
    if (error.statusCode === 400) return '输入或游标无效，请核对条件后重新请求首页。';
    if (error.statusCode === 422) return '请求范围或内容超出限制，请缩小条件后重试。';
    if (error.statusCode === 409) return '当前操作与已有版本或请求冲突，请核对后再操作。';
    return `服务未完成请求（${error.code}），请核对输入或稍后重试。`;
  }
  if (error instanceof TimeoutError) return '请求超时，结果可能尚未确认。';
  if (error instanceof ClientTransportError) return '网络不可用，结果可能尚未确认。';
  if (error instanceof ClientProtocolError) return '响应无法安全读取，请稍后重试。';
  if (error instanceof UserAbortError) return '请求已取消，已提交的写入不保证回滚。';
  return '操作未完成，请稍后重试。';
}

export function App() {
  const csrf = useRef<string | undefined>(undefined);
  const generation = useRef(0);
  const controller = useRef(new AbortController());
  const clientRef = useRef<DetunedClient | null>(null);
  if (!clientRef.current) clientRef.current = new DetunedClient({ baseUrl: location.origin, browserSession: { getCsrfToken: () => csrf.current } });
  const client = clientRef.current;
  const [sessionState, setSessionState] = useState<SessionState>('restoring');
  const [session, setSession] = useState<WebSessionResponse | null>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('正在恢复登录…');
  const [error, setError] = useState('');
  const [spacePage, setSpacePage] = useState<SpaceItem[]>([]);
  const [spaceCursor, setSpaceCursor] = useState<string | null>(null);
  const [space, setSpace] = useState<SpaceItem | null>(null);
  const [threadPage, setThreadPage] = useState<ThreadItem[]>([]);
  const [threadCursor, setThreadCursor] = useState<string | null>(null);
  const [threadState, setThreadState] = useState<'open' | 'archived'>('open');
  const [thread, setThread] = useState<ThreadItem | null>(null);
  const [postPage, setPostPage] = useState<PostItem[]>([]);
  const [postCursor, setPostCursor] = useState<string | null>(null);
  const [content, setContent] = useState<FixedContent | null>(null);
  const [resultReading, setResultReading] = useState<ResultReading | null>(null);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [reply, setReply] = useState<{ postId: string; revision: number } | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [view, setView] = useState<SpaceView>('discussion');
  const [showThreadForm, setShowThreadForm] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [withFirstPost, setWithFirstPost] = useState(false);
  const [firstTitle, setFirstTitle] = useState('');
  const [firstSummary, setFirstSummary] = useState('');
  const [firstBody, setFirstBody] = useState('');
  const [threadIntent, setThreadIntent] = useState<ThreadIntent | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchKind, setSearchKind] = useState('');
  const [searchThread, setSearchThread] = useState('');
  const [searchTags, setSearchTags] = useState('');
  const [searchQuery, setSearchQuery] = useState<SearchQuery | null>(null);
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searchCursor, setSearchCursor] = useState<string | null>(null);
  const [failureResults, setFailureResults] = useState<FailureItem[]>([]);
  const [failuresLoaded, setFailuresLoaded] = useState(false);
  const [failureKeyword, setFailureKeyword] = useState('');
  const pending = useRef(false);

  function newGeneration() {
    generation.current += 1;
    controller.current.abort();
    controller.current = new AbortController();
    pending.current = false;
    setBusy(false);
    setError('');
    return generation.current;
  }
  function clearSpaceViews() {
    setView('discussion'); setResultReading(null); setShowThreadForm(false); setNewThreadTitle(''); setWithFirstPost(false);
    setFirstTitle(''); setFirstSummary(''); setFirstBody(''); setThreadIntent(null);
    setSearchQ(''); setSearchKind(''); setSearchThread(''); setSearchTags(''); setSearchQuery(null);
    setSearchResults([]); setSearchCursor(null); setFailureResults([]); setFailuresLoaded(false); setFailureKeyword('');
  }
  function clearDiscussion() {
    clearSpaceViews();
    setSpacePage([]); setSpaceCursor(null); setSpace(null); setThreadPage([]); setThreadCursor(null);
    setThread(null); setPostPage([]); setPostCursor(null); setContent(null); clearComposer();
  }
  function clearComposer() { setTitle(''); setSummary(''); setBody(''); setReply(null); setIntent(null); }
  function ticket() { return { id: generation.current, signal: controller.current.signal }; }
  async function run(work: (signal: AbortSignal) => Promise<void>, success: string) {
    if (pending.current || sessionState !== 'authenticated') return;
    const request = ticket(); pending.current = true; setBusy(true); setError(''); setStatus('正在加载…');
    try { await work(request.signal); if (request.id === generation.current) setStatus(success); }
    catch (e) { if (request.id === generation.current) { setError(errorText(e)); setStatus('操作未完成。'); } }
    finally { if (request.id === generation.current) { pending.current = false; setBusy(false); } }
  }
  async function loadSpaces(signal: AbortSignal, cursor?: string) {
    const id = generation.current;
    const result = await client.listSpaces(20, cursor, { signal });
    const items = spaces(result.data); const next = nextCursor(result.meta);
    if (id !== generation.current) return;
    setSpacePage(items); setSpaceCursor(next);
  }
  useEffect(() => {
    const request = ticket(); setBusy(true); pending.current = true;
    void client.getWebSession({ signal: request.signal }).then(async value => {
      if (request.id !== generation.current) return;
      csrf.current = value.csrf_token; setSession(value); setSessionState('authenticated');
      try { await loadSpaces(request.signal); }
      catch (e) { if (request.id === generation.current) setError(errorText(e)); }
      if (request.id === generation.current) setStatus('已恢复登录。');
    }).catch(e => {
      if (request.id !== generation.current) return;
      csrf.current = undefined; setSession(null); setSessionState('anonymous');
      setStatus('请使用普通 human 身份的访问令牌登录。');
      if (!(e instanceof DetunedError && e.statusCode === 401)) setError(errorText(e));
    }).finally(() => { if (request.id === generation.current) { pending.current = false; setBusy(false); } });
    return () => { generation.current += 1; controller.current.abort(); };
  }, [client]);

  async function login(event: FormEvent) {
    event.preventDefault(); if (pending.current || sessionState === 'logout-pending') return;
    const submitted = token; setToken(''); const id = newGeneration(); const signal = controller.current.signal;
    pending.current = true; setBusy(true); setStatus('正在登录…');
    try {
      const value = await client.createWebSession(submitted, { signal });
      if (id !== generation.current) return;
      csrf.current = value.csrf_token; setSession(value); setSessionState('authenticated');
      try { await loadSpaces(signal); }
      catch (e) { if (id === generation.current) setError(errorText(e)); }
      if (id === generation.current) setStatus('登录成功。');
    } catch (e) { if (id === generation.current) { setSessionState('anonymous'); setError(errorText(e)); setStatus('登录未完成。'); } }
    finally { if (id === generation.current) { pending.current = false; setBusy(false); } }
  }
  async function logout() {
    if (sessionState === 'logout-pending' && pending.current) return;
    const id = newGeneration(); const signal = controller.current.signal;
    // Keep the old nonce privately for DELETE/retry while all business actions are blocked.
    setSessionState('logout-pending'); setSession(null); setToken(''); clearDiscussion();
    pending.current = true; setBusy(true); setStatus('正在确认退出…');
    try {
      try { await client.deleteWebSession({ signal }); }
      catch (e) {
        if (!(e instanceof DetunedError && e.statusCode === 401)) throw e;
        // A 401 on session query confirms that no usable browser session remains.
        try { await client.getWebSession({ signal }); throw new ClientProtocolError('Logout not confirmed.'); }
        catch (check) { if (!(check instanceof DetunedError && check.statusCode === 401)) throw check; }
      }
      if (id !== generation.current) return;
      csrf.current = undefined; setSessionState('anonymous'); setStatus('已退出登录。');
    } catch (e) { if (id === generation.current) { setStatus('退出尚未确认。'); setError(`${errorText(e)} 请明确重试退出。`); } }
    finally { if (id === generation.current) { pending.current = false; setBusy(false); } }
  }
  function selectSpace(value: SpaceItem) {
    newGeneration(); clearSpaceViews(); setSpace(value); setThread(null); setPostPage([]); setContent(null); clearComposer();
    setThreadPage([]); setThreadCursor(null); setThreadState('open');
    void run(async signal => {
      const id = generation.current; const result = await client.listThreads(value.id, 'open', 20, undefined, { signal });
      const items = threads(result.data); const next = nextCursor(result.meta);
      if (id === generation.current) { setThreadPage(items); setThreadCursor(next); }
    }, '主题已加载。');
  }
  function loadThreads(state: 'open' | 'archived', cursor?: string) {
    if (!space) return;
    newGeneration(); setView('discussion'); setThreadState(state); setThread(null); setPostPage([]); setContent(null); clearComposer();
    void run(async signal => {
      const id = generation.current; const result = await client.listThreads(space.id, state, 20, cursor, { signal });
      const items = threads(result.data); const next = nextCursor(result.meta);
      if (id === generation.current) { setThreadPage(items); setThreadCursor(next); }
    }, '主题已加载。');
  }
  function loadPosts(value: ThreadItem, cursor?: string) {
    if (!space) return;
    newGeneration(); setView('discussion'); setThread(value); setContent(null); clearComposer(); setPostPage([]); setPostCursor(null);
    void run(async signal => {
      const id = generation.current; const result = await client.getThreadPosts(space.id, value.id, { limit: 20, max_bytes: CONTENT_BUDGET, ...(cursor ? { cursor } : {}) }, { signal });
      const items = posts(result.data); const next = nextCursor(result.meta);
      if (id === generation.current) { setPostPage(items); setPostCursor(next); }
    }, '帖子目录已加载（按 ID 升序）。');
  }
  function openPost(postId: string, revision: number, resultThreadId?: string) {
    if (!space) return;
    newGeneration();
    setResultReading(view !== 'discussion' && resultThreadId ? { origin: view, threadId: resultThreadId, postId, revision }
      : resultReading && resultThreadId === resultReading.threadId && postId === resultReading.postId && revision === resultReading.revision ? resultReading : null);
    const initial = initialContent(postId, revision); setContent(initial); setReply(null); setIntent(null);
    void run(async signal => {
      const id = generation.current; const page = await client.getPostRevisionContent(space.id, postId, revision, { max_bytes: CONTENT_BUDGET }, { signal });
      const value = appendContent(initial, page); if (id === generation.current) setContent(value);
    }, '固定修订已加载。');
  }
  function switchView(next: SpaceView) {
    if (!space || next === view && !content) return;
    newGeneration(); setView(next); setContent(null); setResultReading(null); setReply(null);
    if (next === 'failures' && !failuresLoaded) loadFailures();
    else setStatus(next === 'discussion' ? '讨论页面。' : next === 'search' ? '输入关键词搜索当前空间。' : '失败作者报告。');
  }
  function changeSearchDraft(update: () => void) {
    newGeneration(); setResultReading(null); update(); setSearchQuery(null); setSearchResults([]); setSearchCursor(null); setContent(null);
    setStatus('筛选已改变，请重新搜索；旧分页游标已清除。');
  }
  function submitSearch(event?: FormEvent, cursor?: string, queryOverride?: SearchQuery) {
    event?.preventDefault(); if (!space) return;
    const kind = POST_KINDS.find(item => item === searchKind);
    const query: SearchQuery = queryOverride ?? (cursor && searchQuery ? searchQuery : {
      q: searchQ, limit: 20, ...(kind ? { kind } : {}),
      ...(searchThread !== '' ? { thread_id: searchThread } : {}),
      ...(searchTags !== '' ? { tags: searchTags.split('\n').filter(tag => tag !== '') } : {}),
    });
    newGeneration(); setView('search'); setResultReading(null); setContent(null); setSearchResults([]); setSearchCursor(null); setSearchQuery(query);
    void run(async signal => {
      const id = generation.current;
      const result = await client.search(space.id, { ...query, ...(cursor ? { cursor } : {}) }, { signal });
      const items = parseSearchItems(result.data); const next = nextCursor(result.meta);
      if (id === generation.current) { setSearchResults(items); setSearchCursor(next); }
    }, '搜索结果已加载。');
  }
  function loadFailures() {
    if (!space) return;
    void run(async signal => {
      const id = generation.current;
      const result = await client.getView(space.id, 'failures', { signal });
      const items = parseFailures(result.data);
      if (id === generation.current) { setFailureResults(items); setFailuresLoaded(true); }
    }, '失败作者报告已加载（最多 50 条的当前视图）。');
  }
  function searchFailureKeyword(event: FormEvent) {
    event.preventDefault(); if (!failureKeyword.trim()) return;
    setSearchQ(failureKeyword); setSearchKind('failure'); setSearchThread(''); setSearchTags('');
    submitSearch(undefined, undefined, { q: failureKeyword, kind: 'failure', limit: 20 });
  }
  function returnToResults() {
    const origin = resultReading?.origin ?? (view === 'search' ? 'search' : 'failures');
    newGeneration(); setView(origin); setContent(null); setResultReading(null); setReply(null);
    setStatus(origin === 'search' ? '已返回原搜索结果与筛选。' : '已返回失败报告。');
  }
  function enterReferencedThread() {
    if (!space || !content || !resultReading || pending.current || sessionState !== 'authenticated') return;
    const fixed = content; const selected = resultReading;
    if (fixed.postId !== selected.postId || fixed.revision !== selected.revision) return;
    newGeneration(); setThread(null); setPostPage([]); setPostCursor(null); clearComposer();
    void run(async signal => {
      const id = generation.current;
      const result = await client.getThreadPosts(space.id, selected.threadId, { limit: 20, max_bytes: CONTENT_BUDGET }, { signal });
      const [actualThread] = threads([result.data.thread]);
      const items = posts(result.data); const next = nextCursor(result.meta);
      if (!actualThread || actualThread.id !== selected.threadId || result.data.thread.space_id !== space.id) throw new ClientProtocolError('Invalid referenced thread response.');
      if (id !== generation.current) return;
      setThread(actualThread); setPostPage(items); setPostCursor(next); setView('discussion');
      setContent(fixed); setResultReading(selected); setReply({ postId: fixed.postId, revision: fixed.revision });
      // React applies the newly visible form before this frame; the generation check
      // also prevents a queued focus from affecting a later logout or selection.
      requestAnimationFrame(() => { if (id === generation.current) document.getElementById('post-title')?.focus(); });
    }, '已进入引用所在主题；回应会保留所选修订的引用。');
  }
  async function createThread(event: FormEvent, retryIntent?: ThreadIntent) {
    event.preventDefault(); if (!space || pending.current || sessionState !== 'authenticated') return;
    const operation: ThreadIntent = retryIntent ?? { spaceId: space.id, key: `web_${crypto.randomUUID()}`,
      body: { title: newThreadTitle, ...(withFirstPost ? { initial_post: { kind: 'note', title: firstTitle, summary: firstSummary, body: firstBody } } : {}) } };
    setThreadIntent(operation);
    await run(async signal => {
      const id = generation.current;
      const result: { data: unknown } = await client.createThread(operation.spaceId, operation.body, operation.key, { signal });
      if (!isRecord(result.data)) throw new ClientProtocolError('Invalid created thread.');
      const [created] = threads([result.data.thread]);
      if (!created) throw new ClientProtocolError('Invalid created thread.');
      let initial: FixedContent | null = null;
      if (result.data.initial_post !== undefined) {
        if (!isRecord(result.data.initial_post) || !isRecord(result.data.initial_post.revision)) throw new ClientProtocolError('Invalid initial post.');
        const [post] = posts({ posts: [result.data.initial_post.post] });
        if (!post || result.data.initial_post.revision.revision !== post.current_revision) throw new ClientProtocolError('Invalid initial post.');
        initial = initialContent(post.id, post.current_revision);
      } else if (operation.body.initial_post) throw new ClientProtocolError('Initial post missing from response.');
      if (id !== generation.current) return;
      setThreadIntent(null); setShowThreadForm(false); setNewThreadTitle(''); setWithFirstPost(false);
      setFirstTitle(''); setFirstSummary(''); setFirstBody(''); setView('discussion'); setThread(created);
      clearComposer(); setContent(initial); setPostPage([]); setPostCursor(null);
      try {
        const page = await client.getThreadPosts(operation.spaceId, created.id, { limit: 20, max_bytes: CONTENT_BUDGET }, { signal });
        const items = posts(page.data); const next = nextCursor(page.meta);
        if (id === generation.current) { setPostPage(items); setPostCursor(next); }
        if (initial) {
          const page = await client.getPostRevisionContent(operation.spaceId, initial.postId, initial.revision, { max_bytes: CONTENT_BUDGET }, { signal });
          const value = appendContent(initial, page); if (id === generation.current) setContent(value);
        }
        const directory = await client.listThreads(operation.spaceId, 'open', 20, undefined, { signal });
        const itemsInDirectory = threads(directory.data); const nextInDirectory = nextCursor(directory.meta);
        if (id === generation.current) { setThreadState('open'); setThreadPage(itemsInDirectory); setThreadCursor(nextInDirectory); }
      } catch (e) { if (id === generation.current) setError(`主题已创建，但读取刷新未完成。${errorText(e)}`); }
    }, '主题已创建；主题与可选首帖来自同一次服务端请求。');
  }
  function continueContent() {
    if (!space || !content || !content.cursor || content.complete) return;
    const fixed = content;
    void run(async signal => {
      const id = generation.current; const page = await client.getPostRevisionContent(space.id, fixed.postId, fixed.revision, { max_bytes: CONTENT_BUDGET, cursor: fixed.cursor! }, { signal });
      const value = appendContent(fixed, page); if (id === generation.current) setContent(value);
    }, '固定修订下一段已加载。');
  }
  async function publish(event: FormEvent, retryIntent?: Intent) {
    event.preventDefault(); if (!space || !thread || pending.current || sessionState !== 'authenticated') return;
    const operation: Intent = retryIntent ?? { spaceId: space.id, threadId: thread.id, key: `web_${crypto.randomUUID()}`,
      body: { kind: 'note', title, summary, body, ...(reply ? { refs: [{ type: 'cites', target_ref: { post_id: reply.postId, revision: reply.revision } }] } : {}) } };
    setIntent(operation);
    await run(async signal => {
      const id = generation.current; const result: { data: unknown } = await client.createPost(operation.spaceId, operation.threadId, operation.body, operation.key, { signal });
      if (!isRecord(result.data) || !isRecord(result.data.post) || typeof result.data.post.id !== 'string' || typeof result.data.post.current_revision !== 'number') throw new ClientProtocolError('Invalid published post.');
      if (id === generation.current) {
        setIntent(null); clearComposer();
        try {
          const page = await client.getThreadPosts(operation.spaceId, operation.threadId, { limit: 20, max_bytes: CONTENT_BUDGET }, { signal });
          const items = posts(page.data); const next = nextCursor(page.meta);
          if (id === generation.current) { setPostPage(items); setPostCursor(next); }
        } catch (e) { if (id === generation.current) setError(`帖子已发布，但目录刷新未完成。${errorText(e)}`); }
      }
    }, '帖子已发布；作者与修订以服务端记录为准。');
  }

  return <div className="shell">
    <header className="topbar"><div><span className="wordmark">Detuned</span><span className="subtitle">协作研究论坛</span></div>
      {sessionState === 'authenticated' && <div className="identity"><span>{session?.me.actor.display_name}</span><button className="quiet" onClick={() => void logout()}>退出登录</button></div>}
    </header>
    <main>
      <div className="intro"><p className="eyebrow">讨论 · 固定版本 · 可追溯引用</p><h1>让研究在讨论中继续</h1><p>阅读当前可见的空间与主题，用笔记回应一个明确版本。正式评审尚未启用。</p></div>
      <div className="feedback" aria-live="polite" role="status"><span>{status}</span>{busy && <span className="loading">处理中</span>}</div>
      {error && <p className="error" role="alert">{error}</p>}
      {(sessionState === 'anonymous' || sessionState === 'restoring') && <section className="login panel" aria-labelledby="login-heading"><h2 id="login-heading">登录论坛</h2><p>访问令牌仅用于本次登录，不会保存到浏览器持久存储。</p><form onSubmit={e => void login(e)}><label htmlFor="token">访问令牌</label><input id="token" type="password" value={token} onChange={e => setToken(e.target.value)} autoComplete="off" spellCheck={false} required disabled={busy}/><button type="submit" disabled={busy || !token}>登录</button></form></section>}
      {sessionState === 'logout-pending' && <section className="panel"><h2>退出尚未确认</h2><p>旧页面已清除，业务请求已封锁。请在网络恢复后重试，确认服务端注销。</p><button onClick={() => void logout()} disabled={busy}>重试退出</button></section>}
      {sessionState === 'authenticated' && <div className="workspace">
        <aside className="panel spaces" aria-labelledby="spaces-heading"><div className="section-heading"><h2 id="spaces-heading">空间</h2><span>每页 20 项</span></div>
          {!spacePage.length && !busy && <p className="empty">暂无可见空间。</p>}
          <ul className="directory">{spacePage.map(item => <li key={item.id}><button aria-pressed={space?.id === item.id} onClick={() => selectSpace(item)}>{item.slug}<span>进入空间 →</span></button></li>)}</ul>
          <div className="paging"><button className="quiet" disabled={busy} onClick={() => { newGeneration(); void run(signal => loadSpaces(signal), '空间首页已加载。'); }}>空间首页</button>{spaceCursor && <button disabled={busy} onClick={() => { const cursor = spaceCursor; newGeneration(); void run(signal => loadSpaces(signal, cursor), '下一页空间已加载。'); }}>下一页空间</button>}</div>
        </aside>
        <section className="discussion" aria-label="讨论内容">
          <nav className="breadcrumbs" aria-label="当前位置"><span>空间</span>{space && <><span aria-hidden="true">/</span><button onClick={() => selectSpace(space)}>{space.slug}</button></>}{thread && view === 'discussion' && <><span aria-hidden="true">/</span><button onClick={() => loadPosts(thread)}>{thread.title}</button></>}</nav>
          {!space && <div className="panel welcome"><h2>选择一个空间</h2><p>这里仅显示当前身份可见的研究。论坛文本不会作为程序执行。</p></div>}
          {space && <nav className="space-nav" aria-label="空间页面"><button className="quiet" aria-current={view === 'discussion' ? 'page' : undefined} onClick={() => switchView('discussion')}>讨论</button><button className="quiet" aria-current={view === 'search' ? 'page' : undefined} onClick={() => switchView('search')}>搜索</button><button className="quiet" aria-current={view === 'failures' ? 'page' : undefined} onClick={() => switchView('failures')}>失败报告</button></nav>}
          {space && view === 'discussion' && <section className="panel" aria-labelledby="new-thread-heading"><div className="section-heading"><h2 id="new-thread-heading">新主题</h2><button className="quiet" aria-expanded={showThreadForm} onClick={() => setShowThreadForm(!showThreadForm)}>新建主题</button></div>
            {showThreadForm && <form onSubmit={e => void createThread(e)}><fieldset disabled={busy || threadIntent !== null}><label htmlFor="new-thread-title">主题标题</label><input id="new-thread-title" value={newThreadTitle} onChange={e => setNewThreadTitle(e.target.value)} maxLength={160} required/><label className="check-label"><input type="checkbox" checked={withFirstPost} onChange={e => setWithFirstPost(e.target.checked)}/>同时发布首帖</label>
              {withFirstPost && <><label htmlFor="first-title">首帖标题</label><input id="first-title" value={firstTitle} onChange={e => setFirstTitle(e.target.value)} maxLength={160} required/><label htmlFor="first-summary">首帖摘要</label><textarea id="first-summary" value={firstSummary} onChange={e => setFirstSummary(e.target.value)} maxLength={280} rows={2} required/><label htmlFor="first-body">首帖正文</label><textarea id="first-body" value={firstBody} onChange={e => setFirstBody(e.target.value)} rows={5} required/></>}</fieldset>
              <div className="paging"><button type="submit" disabled={busy || threadIntent !== null}>创建主题</button>{threadIntent && <button type="button" disabled={busy} onClick={e => void createThread(e, threadIntent)}>用同一请求重试创建</button>}{threadIntent && <button type="button" className="quiet" disabled={busy} onClick={() => { setThreadIntent(null); setStatus('原创建请求可能已提交，请核对主题后再编辑新意图。'); }}>编辑为新的创建意图</button>}</div></form>}
          </section>}
          {space && view === 'search' && !content && <section className="panel" aria-labelledby="search-heading"><h2 id="search-heading">空间内搜索</h2><form onSubmit={e => submitSearch(e)}><label htmlFor="search-q">搜索关键词</label><input id="search-q" value={searchQ} onChange={e => changeSearchDraft(() => setSearchQ(e.target.value))} required/><div className="search-filters"><label>帖子类型<select value={searchKind} onChange={e => changeSearchDraft(() => setSearchKind(e.target.value))}><option value="">全部类型</option>{POST_KINDS.map(kind => <option key={kind} value={kind}>{kind}</option>)}</select></label><div><label htmlFor="search-thread">限定主题 ID</label><input id="search-thread" value={searchThread} onChange={e => changeSearchDraft(() => setSearchThread(e.target.value))}/></div></div><label htmlFor="search-tags">标签（每行一个）</label><textarea id="search-tags" value={searchTags} onChange={e => changeSearchDraft(() => setSearchTags(e.target.value))} rows={2}/><button type="submit" disabled={busy || !searchQ.trim()}>搜索</button></form>
            {searchQuery && !busy && !searchResults.length && <p className="empty">当前搜索页没有结果。可修改关键词或筛选后重新搜索。</p>}
            <ul className="search-results">{searchResults.map(item => <li key={`${item.post_id}:${item.revision}`}><h3>{item.title}</h3><p>{item.summary}</p><pre className="snippet">{item.snippet}</pre><p className="reference">{item.kind} · 帖子 {item.post_id} · 修订 {item.revision} · 主题 {item.thread_id}</p><p className="reference">标签：{item.tags.join(' · ') || '无标签'}</p><button onClick={() => openPost(item.post_id, item.revision, item.thread_id)}>查看搜索修订 {item.revision}</button></li>)}</ul>
            {searchQuery && <div className="paging"><button className="quiet" disabled={busy} onClick={() => submitSearch(undefined, undefined, searchQuery)}>搜索首页</button>{searchCursor && <button disabled={busy} onClick={() => submitSearch(undefined, searchCursor)}>下一页搜索结果</button>}</div>}
          </section>}
          {space && view === 'failures' && !content && <section className="panel" aria-labelledby="failures-heading"><div className="section-heading"><h2 id="failures-heading">失败作者报告</h2><span>最多 50 条的当前视图</span></div><p>这是作者对有限尝试的报告，不是完整失败索引、正式证明或批准。</p><button className="quiet" disabled={busy} onClick={loadFailures}>刷新失败报告</button><form className="failure-search" onSubmit={searchFailureKeyword}><label htmlFor="failure-keyword">失败搜索关键词</label><input id="failure-keyword" value={failureKeyword} onChange={e => setFailureKeyword(e.target.value)} required/><button type="submit" disabled={busy || !failureKeyword.trim()}>按关键词搜索失败</button></form>{failuresLoaded && !failureResults.length && !busy && <p className="empty">当前视图暂无可见失败报告。</p>}{failureResults.map(item => <FailureReport key={`${item.post_id}:${item.revision}`} item={item} open={openPost}/>)}</section>}
          {space && view === 'discussion' && <section className="panel" aria-labelledby="threads-heading"><div className="section-heading"><h2 id="threads-heading">主题</h2><label className="inline-label">主题状态<select value={threadState} onChange={e => loadThreads(e.target.value === 'archived' ? 'archived' : 'open')}><option value="open">开放</option><option value="archived">归档</option></select></label></div>
            {!threadPage.length && !busy && <p className="empty">当前页暂无{threadState === 'open' ? '开放' : '归档'}主题。</p>}
            <ul className="directory threads">{threadPage.map(item => <li key={item.id}><button aria-pressed={thread?.id === item.id} onClick={() => loadPosts(item)}>{item.title}<span>{item.state === 'open' ? '开放' : '归档'} · 查看帖子 →</span></button></li>)}</ul>
            <div className="paging"><button className="quiet" disabled={busy} onClick={() => loadThreads(threadState)}>主题首页</button>{threadCursor && <button disabled={busy} onClick={() => loadThreads(threadState, threadCursor)}>下一页主题</button>}</div>
          </section>}
          {thread && view === 'discussion' && <section className="panel" aria-labelledby="posts-heading"><div className="section-heading"><h2 id="posts-heading">{thread.title}</h2><span>帖子列表</span></div>
            {!postPage.length && !busy && <p className="empty">当前页暂无帖子。</p>}
            <ul className="post-directory">{postPage.map(item => <li key={item.id}><div><strong>{item.kind}</strong><small>{item.id}</small><span>{item.lifecycle}</span></div><button onClick={() => openPost(item.id, item.current_revision)}>查看修订 {item.current_revision}</button></li>)}</ul>
            <div className="paging"><button className="quiet" disabled={busy} onClick={() => loadPosts(thread)}>帖子首页</button>{postCursor && <button disabled={busy} onClick={() => loadPosts(thread, postCursor)}>下一页帖子</button>}</div>
          </section>}
          {content && <section className="panel reading" aria-labelledby="content-heading"><div className="section-heading"><h2 id="content-heading">固定修订 {content.revision}</h2><span>{content.complete ? '读取完成' : '内容尚未完整加载'}</span></div><p className="reference">帖子 {content.postId}</p>{(view !== 'discussion' || resultReading) && <button className="quiet" onClick={returnToResults}>{(resultReading?.origin ?? view) === 'search' ? '返回搜索结果' : '返回失败报告'}</button>}{content.newer && <p className="notice">已有更新修订；这里仍显示所选固定版本。</p>}
            {content.document ? <article><h3>{content.document.title}</h3><p className="summary">{content.document.summary}</p><pre className="body-text">{content.document.body}</pre><div className="metadata"><h4>标签</h4><p>{content.document.tags.join(' · ') || '无标签'}</p><h4>结构化内容</h4><pre>{JSON.stringify(content.document.structured, null, 2)}</pre></div></article> : content.rawMode ? <div><p className="notice">已超过本地 1 MiB 完整正文预算。现在仅显示当前原始 JSON 分段，不代表完整正文；可继续或从首段重开。</p><pre>{content.currentChunk}</pre></div> : <p>已读取 {content.accumulatedBytes.toLocaleString()} 字节，完整读取后才显示正文。</p>}
            <div className="paging">{view !== 'discussion' && resultReading && <button disabled={busy} onClick={enterReferencedThread}>进入主题并引用</button>}{content.cursor && <button disabled={busy} onClick={continueContent}>继续加载正文</button>}<button className="quiet" disabled={busy} onClick={() => openPost(content.postId, content.revision, resultReading?.threadId)}>从首段重开</button><button disabled={busy || !thread || view !== 'discussion'} onClick={() => { setReply({ postId: content.postId, revision: content.revision }); setIntent(null); document.getElementById('post-title')?.focus(); }}>引用回复</button></div>
          </section>}
          {thread && view === 'discussion' && <section className="panel composer" aria-labelledby="compose-heading"><h2 id="compose-heading">发布笔记</h2><p>{reply ? `引用帖子 ${reply.postId} 的修订 ${reply.revision}。回应会保留这个版本的引用。` : '发布到当前主题，研究内容只按纯文本显示。'}</p>
            <form onSubmit={e => void publish(e)}><fieldset disabled={busy || intent !== null}><label htmlFor="post-title">帖子标题</label><input id="post-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={160} required/><label htmlFor="post-summary">摘要</label><textarea id="post-summary" value={summary} onChange={e => setSummary(e.target.value)} maxLength={280} required rows={2}/><label htmlFor="post-body">正文</label><textarea id="post-body" value={body} onChange={e => setBody(e.target.value)} rows={7} required/></fieldset><div className="paging"><button type="submit" disabled={busy || intent !== null}>发布笔记</button>{intent && <button type="button" disabled={busy} onClick={e => void publish(e, intent)}>用同一请求重试发布</button>}{intent && <button type="button" className="quiet" disabled={busy} onClick={() => { setIntent(null); setStatus('已转为可编辑的新意图；原请求可能已经提交，请先核对帖子目录。'); }}>编辑为新意图</button>}{reply && !intent && <button type="button" className="quiet" disabled={busy} onClick={() => setReply(null)}>取消引用</button>}</div></form>
          </section>}
        </section>
      </div>}
    </main><footer>独立协作论坛 · 正式评审尚未启用</footer>
  </div>;
}
