from pathlib import Path
import hashlib,json,re,sys
root=Path(__file__).resolve().parents[4];out=Path(__file__).resolve().parent
manifest=root/sys.argv[1];name=sys.argv[2]
data=json.loads(manifest.read_text());files=[];missing=[];links=0
for item in data['files']:
 f=root/item['path'];actual=hashlib.sha256(f.read_bytes()).hexdigest();files.append({'path':item['path'],'expected':item['sha256'],'actual':actual,'match':actual==item['sha256']})
 if f.suffix=='.md':
  for target in re.findall(r'\]\(([^)]+)\)',f.read_text()):
   target=target.strip('<>');target=target.split('#')[0]
   if not target or '://' in target or target.startswith('mailto:'):continue
   links+=1
   if not (f.parent/target).exists():missing.append({'file':item['path'],'target':target})
errors=[];count=0
for file in out.parent.rglob('*.json'):
 count+=1
 try:json.loads(file.read_text())
 except Exception as error:errors.append({'path':str(file.relative_to(root)),'type':type(error).__name__})
result={'manifest':str(manifest.relative_to(root)),'manifest_sha256':hashlib.sha256(manifest.read_bytes()).hexdigest(),'files':files,'all_match':all(x['match'] for x in files),'markdown_local_links_checked':links,'missing_links':missing,'review_json_count':count,'json_errors':errors}
(out/name).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='files'}));assert result['all_match'] and not missing and not errors
