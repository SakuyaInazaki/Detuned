from pathlib import Path
from datetime import datetime,timezone
import subprocess,json,sys
p=Path(__file__).resolve().parent
name=sys.argv[1];cmd=sys.argv[2:];start=datetime.now(timezone.utc).isoformat()
with (p/f'observed-{name}-2026-10-06.txt').open('x') as out,(p/f'observed-{name}-2026-10-06.stderr.txt').open('x') as err:
 r=subprocess.run(cmd,stdout=out,stderr=err)
f=p/'commands.json';a=json.loads(f.read_text()) if f.exists() else {'commands':[]};a['commands'].append({'command':' '.join(cmd),'exit_code':r.returncode,'started_at':start,'finished_at':datetime.now(timezone.utc).isoformat(),'output_file':out.name,'stderr_file':err.name});f.write_text(json.dumps(a,indent=2)+'\n');print(name,r.returncode);print(Path(out.name).read_text()[-1800:]);print(Path(err.name).read_text()[-700:]);sys.exit(r.returncode)
