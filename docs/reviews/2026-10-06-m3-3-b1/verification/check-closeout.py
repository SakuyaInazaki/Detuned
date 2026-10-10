from pathlib import Path
import json,re,tempfile,subprocess,hashlib
p=Path(__file__).resolve().parent;package=p.parent
# Finite local current-package text scan for minted credential shape, no global repository scan.
files=[];matches=[]
for f in package.rglob('*'):
 if not f.is_file():continue
 try:text=f.read_text()
 except UnicodeError:continue
 files.append(f)
 count=len(re.findall(r'detuned_(?:adm|tok)_[0-9a-f]{48}\b',text))
 if count:matches.append({'path':str(f.relative_to(package)),'match_count':count})
credential={'scope':'only current new review package UTF8 text; minted admin/ordinary token shape; exact fixture live tokens were separately checked in-memory via boolean assertions, not retained','scanned_file_count':len(files),'matches':matches,'no_minted_shape_matches':not matches,'limitations':'Shape-only archive scan does not prove arbitrary research text free of secrets, token hash or64hex token_secret absence; no physical backup/restore exists in this export package.'}
(p/'credential-evidence-check.json').write_text(json.dumps(credential,indent=2)+'\n')
# Read-only inventory: never print process arguments that might contain credentials, never broad cleanup.
raw=subprocess.check_output(['ps','-axo','pid=,args='],text=True)
processes=[]
for line in raw.splitlines():
 if 'tests/helpers/m3-export-worker.mjs' in line or ('packages/cli/dist/index.js' in line and 'detuned-export-' in line):processes.append({'pid':int(line.strip().split(None,1)[0]),'classification':'owned export acceptance process; command omitted'})
temp=Path(tempfile.gettempdir());dirs=sorted(str(f) for f in temp.glob('detuned-export-*') if f.is_dir())
result={'scope':'exact independent export worker, CLI export-specific argv paths and known new export test temporary prefixes; inventory only, no unrelated deletion','matching_processes':processes,'remaining_private_fixture_directories':dirs,'cleanup_complete':not processes and not dirs}
(p/'cleanup-check.json').write_text(json.dumps(result,indent=2)+'\n')
print('Finite credential matches',len(matches),'text files',len(files),'owned process count',len(processes),'private fixture count',len(dirs))
assert not matches and result['cleanup_complete']
