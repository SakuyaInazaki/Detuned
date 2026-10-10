import { Component, useEffect, useState, type ReactNode } from 'react';
import Markdown from 'react-markdown';

const INPUT_BYTES = 131_072;
const elements = ['p', 'br', 'em', 'strong', 'blockquote', 'ul', 'ol', 'li', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'code', 'a', 'img'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
/** Read-only traversal of actual parsed child nodes. No HTML conversion or AST mutation. */
function astBudget() {
  return (tree: unknown): void => {
    const stack: { value: unknown; depth: number }[] = [{ value: tree, depth: 0 }];
    let count = 0;
    while (stack.length) {
      const item = stack.pop()!;
      if (++count > 20_000 || item.depth > 64 || !record(item.value) || typeof item.value.type !== 'string') throw new Error('Markdown AST budget exceeded.');
      if (item.value.children !== undefined) {
        if (!Array.isArray(item.value.children) || item.value.children.length + stack.length + count > 20_000) throw new Error('Markdown AST budget exceeded.');
        for (const child of item.value.children) stack.push({ value: child, depth: item.depth + 1 });
      }
    }
  };
}
function safeLink(href: string | undefined): string | null {
  if (!href || !/^https?:\/\//i.test(href) || /[\u0000-\u0020\u007f]/.test(href)) return null;
  try {
    const url = new URL(href);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
class MarkdownBoundary extends Component<{ source: string; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidUpdate(previous: Readonly<{ source: string; children: ReactNode }>) {
    if (previous.source !== this.props.source && this.state.failed) this.setState({ failed: false });
  }
  override render() {
    return this.state.failed ? <><p className="notice">Markdown 降级：结构超过预算或解析/显示未完成，以下保留原文。</p><pre className="body-text markdown-original">{this.props.source}</pre></> : this.props.children;
  }
}
/** Bounded CommonMark rendering; a text switch always preserves the exact research string. */
export function SafeMarkdown({ source, label }: { source: string; label: string }) {
  const [raw, setRaw] = useState(false);
  useEffect(() => { setRaw(false); }, [source]);
  const oversized = new TextEncoder().encode(source).byteLength > INPUT_BYTES;
  return <section className="safe-markdown" aria-label={`${label}内容`}>
    <button type="button" className="quiet markdown-toggle" aria-label={`${label}：${raw ? '显示 Markdown' : '显示原文'}`} onClick={() => setRaw(value => !value)}>{raw ? '显示 Markdown' : '显示原文'}</button>
    {raw ? <pre className="body-text markdown-original">{source}</pre> : oversized ? <><p className="notice">Markdown 降级：超过 128 KiB 输入预算，以下显示原文。</p><pre className="body-text markdown-original">{source}</pre></> : <MarkdownBoundary source={source}>
      <div className="markdown-rendered"><Markdown allowedElements={elements} remarkPlugins={[astBudget]} urlTransform={url => url}
        components={{
          a: ({ href, children }) => { const safe = safeLink(href); return safe ? <a href={safe} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>; },
          img: ({ alt, src }) => <span className="markdown-image">图片：{alt || '未提供说明'} · 来源：{typeof src === 'string' ? src : '未指定'}</span>,
        }}>{source}</Markdown></div>
    </MarkdownBoundary>}
  </section>;
}
