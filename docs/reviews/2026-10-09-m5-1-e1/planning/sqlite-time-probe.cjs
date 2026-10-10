const Database=require('../../../../node_modules/better-sqlite3');
const fs=require('node:fs');
const db=new Database(':memory:');
try {
db.exec('CREATE TABLE times(id TEXT PRIMARY KEY,t TEXT NOT NULL)');
const values=['2026-10-09T00:00:00.000Z','2026-10-09T01:00:00.000+01:00','2026-10-09t00:00:00.000z','2026-10-09T00:00:60.000Z','2026-13-09T00:00:00.000Z','2026-02-30T00:00:00.000Z','2026-10-09T00:00:00.0001Z','2026-10-09T00:00:00.0004Z','2026-10-09T00:00:00.0005Z','2026-10-09T00:00:00.0009Z','2026-10-09T00:00:00.001Z','2026-10-09T00:00:00.1Z','2026-10-09T00:00:00.100Z','2026-10-09T00:00:00.1000Z','2026-10-09T00:00:00Z'];
values.forEach((t,i)=>db.prepare('INSERT INTO times VALUES (?,?)').run(String(i).padStart(2,'0'),t));
const result={sqlite_version:db.prepare('select sqlite_version() as version').get().version,rows:db.prepare("SELECT id,t,julianday(t) AS jd,strftime('%Y-%m-%dT%H:%M:%fZ',t) AS normalized FROM times ORDER BY id").all(),order:db.prepare('SELECT id FROM times ORDER BY julianday(t),id').all(),plan:db.prepare('EXPLAIN QUERY PLAN SELECT id FROM times ORDER BY julianday(t),id LIMIT 20').all()};
fs.writeFileSync(__dirname+'/sqlite-time-probe.json',JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result));
} finally {db.close();}
