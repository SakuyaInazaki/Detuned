from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,re,urllib.parse,subprocess
ROOT=Path.cwd();v=ROOT/'docs/reviews/2026-10-09-m6-4-b/verification';pkg=v.parent;author=pkg/'author/documentation';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();b=json.loads((v/'baseline.json').read_text());mf=author/'freeze-manifest.json';m=json.loads(mf.read_text());targets=json.loads((author/'metadata-targets.json').read_text())
def checkmap(mapping):return {'checked':len(mapping),'mismatches':[p for p,h in mapping.items() if not (ROOT/p).is_file() or sha(ROOT/p)!=h]}
manifestcheck={'path':str(mf.relative_to(ROOT)),'sha256':sha(mf),'files':len(m['files']),'mismatches':[e['path'] for e in m['files'] if sha(ROOT/e['path'])!=e['sha256']],'planning_mismatches':[e['path'] for e in m['planning'] if sha(ROOT/e['path'])!=e['sha256']]}
# Scoped Markdown links only these19 plus the two accepted current plan documents.
links=[];missing=[]
for name in [e['path'] for e in m['files'] if e['path'].endswith('.md')]+[e['path'] for e in m['planning'] if e['path'].endswith('.md')]:
 p=ROOT/name;text=re.sub(r'```[\s\S]*?```','',p.read_text())
 for match in re.finditer(r'\[[^\]\n]*\]\(([^)\n]+)\)',text):
  target=match.group(1).split()[0].strip('<>');u=urllib.parse.urlsplit(target)
  if u.scheme or not u.path:continue
  raw=urllib.parse.unquote(u.path);dest=(ROOT/raw.lstrip('/')) if raw.startswith('/') else p.parent/raw
  entry={'source':name,'target':target,'exists':dest.exists()};links.append(entry)
  if not entry['exists']:missing.append(entry)
jsonpaths=[e['path'] for e in m['files']+m['planning'] if e['path'].endswith('.json')]+[str(mf.relative_to(ROOT)),str((author/'metadata-targets.json').relative_to(ROOT))];jsonerrors=[]
for name in jsonpaths:
 try:json.loads((ROOT/name).read_text())
 except Exception as e:jsonerrors.append({'path':name,'error':str(e)})
# Author exactbefore for all seventeen existing docs, with explicit timing and original B guides.
before=[];bguide=json.loads((pkg/'author/cli/freeze-manifest.json').read_text())['files'];guides={e['path']:e['sha256'] for e in bguide if e['path'].endswith('.md')}
for e in targets['existing']:
 p=author/'before-current'/e['path'];fresh=b['current_document_hashes'].get(e['path'],b['mutable_status_document_hashes'].get(e['path']));row={'path':e['path'],'before_copy':str(p.relative_to(ROOT)),'actual_before_sha256':sha(p) if p.exists() else None,'author_recorded_sha256':e['current_sha256'],'matches_author':p.exists() and sha(p)==e['current_sha256'],'matches_fresh':fresh==e['current_sha256'] if fresh else None,'matches_B_frozen_guide':guides.get(e['path'])==e['current_sha256'] if e['path'] in guides else None,'timing':targets['capture_timing']};before.append(row)
# Original compat adapter scopes unchanged; only the three current review annotations and summary were added.
old=json.loads((author/'before-current/integrations/compatibility.json').read_text());new=json.loads((ROOT/'integrations/compatibility.json').read_text());changedadapters=[];compatbad=[]
for olda in old['adapters']:
 newa=next(a for a in new['adapters'] if a['name']==olda['name']);base_equal=all(newa.get(k)==val for k,val in olda.items());extra=set(newa)-set(olda)
 if newa!=olda:changedadapters.append(olda['name'])
 if not base_equal or (extra and (olda['name'] not in ['mcp-stdio-bridge','pi','dsh'] or extra!={'current_review_tools_status','current_tool_count','current_review_verified_via','current_review_notes'})) or (extra and newa['current_tool_count']!=9):compatbad.append(olda['name'])
freezes=[]
for name in ['author/tools/freeze-manifest-v2.json','author/cli/freeze-manifest.json']:
 p=pkg/name;d=json.loads(p.read_text());items=[e for e in d['files'] if not e['path'].endswith('.md')];freezes.append({'path':name,'manifest_sha256':sha(p),'code_test_items':len(items),'mismatches':[e['path'] for e in items if sha(ROOT/e['path'])!=e['sha256']],'authorized_guide_changes':[e['path'] for e in d['files'] if e['path'].endswith('.md')]})
D=json.loads((v/'final-source-manifest.json').read_text());Dcheck={'checked':len(D['D_files']),'mismatches':[e['path'] for e in D['D_files'] if sha(ROOT/e['path'])!=e['sha256']]};protected={k:checkmap(b[k]) for k in ['protected_review_probe_log_evidence_hashes','sql_archive_before_hashes','schema_profile_before_hashes']}
pre=json.loads((v/'integrity.json').read_text());distcheck=checkmap(pre['dist_current_hashes']);head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();diff=subprocess.run(['git','diff','--check'],capture_output=True,text=True);(v/'metadata-diffcheck.stdout.txt').write_text(diff.stdout);(v/'metadata-diffcheck.stderr.txt').write_text(diff.stderr)
result={'checked_at':datetime.now(timezone.utc).isoformat(),'scope':'only frozen19docs and approved current planning links/JSON, exactbefore and explicit source/protected hashes; no runtime/gates/environment action','manifest':manifestcheck,'links_checked':len(links),'missing_links':missing,'json_checked':jsonpaths,'json_errors':jsonerrors,'metadata_before':before,'compatibility':{'changed_adapters':changedadapters,'invalid_deltas':compatbad,'Claude_Codex_preserved':all(next(a for a in old['adapters'] if a['name']==name)==next(a for a in new['adapters'] if a['name']==name) for name in ['codex','claude-code'])},'author_code_test_freezes':freezes,'D_final_source':Dcheck,'protected':protected,'HEAD_unchanged':head==b['head'],'lock_unchanged':sha(ROOT/'pnpm-lock.yaml')==b['product_source_config_test_hashes']['pnpm-lock.yaml'],'JCS_Hasher_preserved':all(sha(ROOT/p)==b['product_source_config_test_hashes'][p] for p in ['modules/review/src/canonical-json.ts','packages/core/src/ports/hasher.ts']),'dist_after_runtime_preserved':distcheck,'diffcheck_exit_code':diff.returncode,'text_findings':[{'path':'docs/progress.md','issue':'M5 current table retains next M6.4-B待fresh'},{'path':'examples/README.md','issue':'HTTP example list still says CLI/宿主/Web后续接入'}],'not_a_final_seal':True}
(v/'metadata-audit-first.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['manifest','links_checked','missing_links','json_errors','compatibility','author_code_test_freezes','D_final_source','HEAD_unchanged','lock_unchanged','JCS_Hasher_preserved','diffcheck_exit_code']},ensure_ascii=False));print('before failures',[x for x in before if not x['matches_author']]);print('protection',protected,'distmismatch',distcheck['mismatches'])
