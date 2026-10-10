from pathlib import Path
import hashlib,json,re,subprocess
from urllib.parse import unquote
p=Path(__file__).resolve().parent;root=p.parents[3];before=json.loads((p/'final-capture.json').read_text());after=json.loads((p/'finalization-capture.json').read_text());cats=[k for k in before if k.endswith('_hashes')]
allowed={'README.md','docs/00-implementation-brief.md','docs/08-roadmap.md','docs/09-validation.md','docs/progress.md','docs/reviews/README.md'}
delta={k:{'changed':sorted(x for x in before[k] if x in after[k] and before[k][x]!=after[k][x]),'added':sorted(set(after[k])-set(before[k])),'removed':sorted(set(before[k])-set(after[k]))} for k in cats}
violations=[]
for k,d in delta.items():
 for typ,files in d.items():
  for f in files:
   if k not in ['current_document_hashes','mutable_status_document_hashes'] or typ!='changed' or f not in allowed:violations.append(f'{k}:{typ}:{f}')
freeze={}
for unit in ['client','cli']:
 m=json.loads((p.parent/'implementation'/unit/'freeze-manifest.json').read_text());freeze[unit]=[x['path'] for x in m['files'] if hashlib.sha256((root/x['path']).read_bytes()).hexdigest()!=x['sha256']]
md=sorted(set(p.parent.rglob('*.md'))|{root/f for f in allowed});missing=[];checked=0;trailing=[]
for f in md:
 text=f.read_text();trailing.extend(f'{f.relative_to(root)}:{i}' for i,l in enumerate(text.splitlines(),1) if l.rstrip()!=l)
 for match in re.finditer(r'\[[^\]]*\]\(([^)]+)\)',text):
  target=match.group(1).strip().split(' "')[0].strip('<>');target=unquote(target.split('#')[0])
  if not target or re.match(r'^[a-zA-Z][\w+.-]*:',target):continue
  target=re.sub(r':\d+$','',target);checked+=1;dest=Path(target) if target.startswith('/') else f.parent/target
  if not dest.exists():missing.append({'file':str(f.relative_to(root)),'target':target})
check=subprocess.run(['git','diff','--check'],cwd=root,capture_output=True,text=True)
r={'status':'parent_accepted_doc_finalized','date':'2026-10-08','head_unchanged':before['head']==after['head'],'authorized_delta':delta,'unauthorized_delta':violations,'freeze_mismatches':freeze,'local_links':{'markdown_files':len(md),'checked':checked,'missing':missing},'trailing_whitespace':trailing,'git_diff_check':{'exit_code':check.returncode,'stdout_empty':not check.stdout,'stderr_empty':not check.stderr},'product_testing_rerun':False}
(p/'finalization.json').open('x').write(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps(r,ensure_ascii=False,indent=2));assert not violations and not missing and not any(freeze.values()) and r['head_unchanged'] and not trailing and check.returncode==0
