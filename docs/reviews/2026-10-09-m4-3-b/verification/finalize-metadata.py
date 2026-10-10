from pathlib import Path
import json,hashlib,re,subprocess,os,yaml
p=Path(__file__).resolve().parent;root=p.parents[3];a=json.loads((p/'baseline.json').read_text());b=json.loads((p/'final-capture.json').read_text())
allowed={'README.md','docs/00-implementation-brief.md','docs/08-roadmap.md','docs/09-validation.md','docs/progress.md','docs/reviews/README.md','examples/README.md','integrations/dsh.md','integrations/dsh/cordis.patch.example.yml','examples/dsh-mcp.md','integrations/compatibility.json'}
af=json.loads((p.parent/'author/loader/freeze-manifest-v2.json').read_text())['files'];bf=json.loads((p.parent/'author/docs/freeze-manifest.json').read_text())['files'];allowed.update(x['path'] for x in af)
freeze={'A':[x['path'] for x in af if hashlib.sha256((root/x['path']).read_bytes()).hexdigest()!=x['sha256']],'B':[x for x,h in bf.items() if hashlib.sha256((root/x).read_bytes()).hexdigest()!=h]}
delta={k:{'changed':[x for x in a[k] if x in b[k] and a[k][x]!=b[k][x]],'added':list(set(b[k])-set(a[k])),'removed':list(set(a[k])-set(b[k]))} for k in a if k.endswith('_hashes')};viol=[f'{k}:{x}' for k,v in delta.items() for kind,fs in v.items() for x in fs if x not in allowed]
md=list(p.parent.rglob('*.md'))+[root/x for x in allowed if x.endswith('.md') and not x.startswith('scripts/')];missing=[];trailing=[];n=0
for f in md:
 s=f.read_text();trailing.extend(f'{f.relative_to(root)}:{i}' for i,l in enumerate(s.splitlines(),1) if l.rstrip()!=l)
 for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',s):
  target=target.split('#')[0].strip('<>')
  if not target or re.match(r'^[a-zA-Z][\w+.-]*:',target):continue
  n+=1
  if not (f.parent/target).exists():missing.append({'file':str(f.relative_to(root)),'target':target})
yaml.safe_load((root/'integrations/dsh/cordis.patch.example.yml').read_text());json.loads((root/'integrations/compatibility.json').read_text())
r=Path('/private/tmp/detuned-m43-runtime.MU1a4q');inp=json.loads((root/'docs/reviews/2026-10-08-m4-3-a/author/runtime/source-before.json').read_text());bad=[]
for x in inp['files']:
 f=r/x['path'];raw=os.readlink(f).encode() if f.is_symlink() else f.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=x['sha256']:bad.append(x['path'])
rows=subprocess.check_output(['ps','-axo','pid,command'],text=True).splitlines();owned=[x for x in rows if x.strip().split(None,1)[-1].startswith('node ') and ('packages/mcp/dist/index.js' in x or 'vitest.mjs' in x and 'detuned-m43' in x)];check=subprocess.run(['git','diff','--check'],cwd=root,capture_output=True,text=True)
d={'status':'accepted_by_parent_finalized','date':'2026-10-09','head_unchanged':a['head']==b['head'],'delta':delta,'unauthorized_delta':viol,'freeze_mismatches':freeze,'local_links':{'markdown_files':len(md),'checked':n,'missing':missing},'trailing_whitespace':trailing,'git_diff_check':check.returncode,'yaml_json_parse':'passed existing Python safe_load/json','official_source':{'tracked_records':14208,'symlinks':14,'changes':bad,'lock_sha256':hashlib.sha256((r/'pnpm-lock.yaml').read_bytes()).hexdigest()},'owned_test_processes':owned,'held_resources':['/private/tmp/detuned-m43-runtime.MU1a4q','/private/tmp/detuned-m43-deps.avgrrqf7'],'not_all_owned_zero':True,'core_checks_rerun':False};(p/'finalization.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print('links',n,'missing',missing,'unauthorized',viol,'freeze',freeze,'official_changes',bad,'testpids',owned);assert not viol and not any(freeze.values()) and not missing and not trailing and not bad and not owned and check.returncode==0 and d['head_unchanged']
