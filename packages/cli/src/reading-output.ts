/** Escape every dynamic value; no terminal control sequence, bidi override or ANSI styling. */
export function terminalText(value:unknown):string {
 const text=typeof value==='string'?value:JSON.stringify(value)??String(value);
 return text.replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u206f]/g,ch=>'\\u'+ch.charCodeAt(0).toString(16).padStart(4,'0'));
}
function indentedText(value:string):string {return '  '+value.split('\n').map(line=>terminalText(line)).join('\n  ');}
export function humanPost(value:{ref:unknown;post_kind:string;lifecycle:string;has_newer_revision:boolean;content:{title:string;summary:string;body:string;tags:string[];structured:unknown};bytes:number;pages:number}):string {
 return ['固定引用: '+terminalText(value.ref),'类型: '+terminalText(value.post_kind)+'；状态: '+terminalText(value.lifecycle)+'；有更新修订: '+terminalText(value.has_newer_revision),'标题: '+terminalText(value.content.title),'摘要:\n'+indentedText(value.content.summary),'正文:\n'+indentedText(value.content.body),'标签: '+terminalText(value.content.tags),'结构化: '+terminalText(value.content.structured),'读取完成: '+terminalText(value.pages)+'页 / '+terminalText(value.bytes)+'字节'].join('\n')+'\n';
}
export function humanThread(page:{data:{thread:unknown;posts:Array<{id:string;kind:string;current_revision:number;lifecycle:string;title?:string}>};meta:{truncated:boolean;next_cursor:string|null}}):string {
 const lines=['主题: '+terminalText(page.data.thread)];
 for(const post of page.data.posts)lines.push(terminalText(post.id)+' @'+terminalText(post.current_revision)+' ['+terminalText(post.kind)+' / '+terminalText(post.lifecycle)+'] '+terminalText(post.title??'(无可见标题)'));
 lines.push(page.meta.next_cursor===null?'本页为末页。':'未完；仅显示本页，续页保持--human与原next_cursor。');
 lines.push('truncated: '+terminalText(page.meta.truncated),'next_cursor: '+terminalText(page.meta.next_cursor));return lines.join('\n')+'\n';
}
