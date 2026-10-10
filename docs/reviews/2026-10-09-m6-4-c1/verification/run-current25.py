from pathlib import Path
import subprocess,sys,json,hashlib
v=Path(__file__).resolve().parent
assert json.loads((v/'core-first.json').read_text())['exit_code']==0
for n in range(5,30):
 result=subprocess.run([sys.executable,str(v/'run-final-stage.py'),f'current-{n:02d}'])
 if result.returncode:raise SystemExit(result.returncode)
selection=json.loads((v/'current29-first-selection.json').read_text())
for r in selection['probes']:
 receipt=v/f"current-{r['number']:02d}-first.json"
 r['state']='passed';r['receipt']=receipt.name;r['receipt_sha256']=hashlib.sha256(receipt.read_bytes()).hexdigest()
selection['state']='executed_final_build_type_lint_core_plus25'
selection['seconds_current25']=round(sum(json.loads((v/f'current-{n:02d}-first.json').read_text())['seconds'] for n in range(5,30)),3)
(v/'current29-final-selection.json').write_text(json.dumps(selection,indent=2)+'\n')
print('All 25 selected sources passed; no new adapter.')
