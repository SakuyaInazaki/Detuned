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

import type {RelationReadView,RelationHistoryPage} from '@detuned/protocol';
export function humanRelationHistory(page:RelationHistoryPage):string {
 const lines=['关系理由历史（仅本页）: '+terminalText(page.data.relation_id)];
 for(const row of page.data.resolutions)lines.push('版本 '+terminalText(row.version)+' / '+terminalText(row.action)+'；理由: '+terminalText(row.reason_ref)+'；可见性: '+terminalText(row.reason_status));
 lines.push('next_cursor: '+terminalText(page.meta.next_cursor));return lines.join('\n')+'\n';
}
export function humanRelation(relation:RelationReadView,history?:RelationHistoryPage):string {
 const lines=['关系: '+terminalText(relation.relation_id),'类型: '+terminalText(relation.relation_type)+'；关系状态: '+terminalText(relation.state)+'；版本: '+terminalText(relation.version),
  '固定来源: '+terminalText(relation.source_ref),'固定目标: '+terminalText(relation.target_ref),
  '固定端点有更新修订: 来源='+terminalText(relation.source_has_newer_revision)+'；目标='+terminalText(relation.target_has_newer_revision)+'。这不表示异议未解决，也不移动固定端点。'];
 if(relation.relation_type==='addresses')lines.push('addresses仅表示已关联回应，不会关闭任何challenge；其resolved是本关系状态。');
 else if(relation.relation_type==='challenges'){
  lines.push('异议状态: '+terminalText(relation.state));
  const current=history?.data.resolutions.find(row=>row.version===relation.version);
  if(current)lines.push('当前状态理由: '+terminalText(current.reason_ref)+'；'+terminalText(current.reason_status)+'；动作: '+terminalText(current.action));
  else lines.push(relation.version===1?'当前版本尚无resolve/reopen理由。':'当前版本理由未载入；不能把历史首条当成当前理由。');
  if(history)lines.push('理由历史next_cursor: '+terminalText(history.meta.next_cursor));
 }
 return lines.join('\n')+'\n';
}
