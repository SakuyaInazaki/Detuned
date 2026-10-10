from pathlib import Path
import json,hashlib,re,urllib.parse,subprocess,sys
v=Path(__file__).resolve().parent; pkg=v.parent; root=v.parents[3]
manifest=pkg/('author/docs/'+sys.argv[1]); m=json.loads(manifest.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
rows=m['files']; mismatch=[x['path'] for x in rows if sha(root/x['path'])!=x['sha256']]
planning=m.get('bound_next_planning',[]); pm=[x['path'] for x in planning if sha(root/x['path'])!=x['sha256']]
markdown={root/x['path'] for x in rows if x['path'].endswith('.md')}
for p in pkg.rglob('*.md'):
 if any(x in p.parts for x in ['before-files','metadata-diffs','old-schema3-review-runtime']):continue
 # exact-before snapshots may use a separate directory name
 if any(x.startswith('before') for x in p.relative_to(pkg).parts):continue
 markdown.add(p)
missing=[]; n=0
for p in sorted(markdown):
 text=p.read_text()
 # Do not treat code examples as live Markdown destinations.
 text=re.sub(r'```[\s\S]*?```','',text)
 for match in re.finditer(r'!?\[[^\]\n]*\]\(([^)]+)\)',text):
  dest=match.group(1).strip().split(' \"')[0].strip('<>')
  if not dest or dest.startswith('#') or re.match(r'[a-zA-Z][a-zA-Z0-9+.-]*:',dest):continue
  dest=urllib.parse.unquote(dest.split('#')[0]); dest=dest.split('?')[0]
  target=Path(dest) if dest.startswith('/') else p.parent/dest
  n+=1
  if not target.exists():missing.append({'source':str(p.relative_to(root)),'target':dest})
jsons=[]; bad=[]
for p in pkg.rglob('*.json'):
 try:json.loads(p.read_text());jsons.append(str(p.relative_to(pkg)))
 except Exception as e:bad.append({'path':str(p.relative_to(pkg)),'error':type(e).__name__})
diff=subprocess.run(['git','diff','--check'],cwd=root,text=True,capture_output=True)
(v/'diffcheck-metadata-final.txt').write_text(diff.stdout+diff.stderr)
out={'metadata_manifest':str(manifest.relative_to(root)),'metadata_manifest_sha256':sha(manifest),'metadata_files':len(rows),'metadata_hash_mismatches':mismatch,'bound_planning_mismatches':pm,'markdown_files_checked':len(markdown),'local_links_checked':n,'missing_local_links':missing,'package_json_files_valid':len(jsons),'invalid_json':bad,'diffcheck_exit_code':diff.returncode,'runtime_checks_rerun':False}
(v/'metadata-final-check.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
