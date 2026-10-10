import json,math,collections,pathlib
p=pathlib.Path('/private/tmp/detuned-c2-load-full-v3-a1')
def rows(n):return [json.loads(x) for x in (p/(n+'.jsonl')).read_text().splitlines()]
r=rows('requests');o=rows('operations');z=rows('resources');s=rows('summary')[0]
m=[x for x in r if x['phase']=='measure'];ok=[x for x in m if 200<=x['status']<300];short=[x for x in m if x.get('short_chinese_query')];assert all(1<=x['query_chars']<=3 for x in short)
def ps(v):
 v=sorted(v);return {str(q):v[math.ceil(q*len(v))-1] if v else None for q in [.5,.95,.99]}
start=next(x['t_ms'] for x in o if x.get('type')=='window_start');end=next(x['t_ms'] for x in o if x.get('type')=='window_end');res=[x for x in z if start<=x['t_ms']<=end];assert res
result={'raw_independent':True,'original_complete':s['complete'],'original_failure':s['failure'],'requests':len(m),'statuses':dict(collections.Counter(x['status'] for x in m)),'classifications':dict(collections.Counter(x['classification'] for x in m)),'window_ms':end-start,'throughput_logical_per_s':24000/((end-start)/1000),'throughput_http_per_s':len(m)/((end-start)/1000),'success_latency_ms':ps([x['latency_ms'] for x in ok]),'short_chinese':{'all':len(short),'success':sum(200<=x['status']<300 for x in short),'limit422':sum(x['status']==422 for x in short),'success_ms':ps([x['latency_ms'] for x in short if 200<=x['status']<300])},'retry_attempts':sum(x.get('retry_attempt',0)>0 for x in m),'busy_or_locked_codes':dict(collections.Counter(x.get('code') for x in m if x.get('code') and ('BUSY' in x['code'] or 'LOCK' in x['code']))),'resource_measurement':{'samples':len(res),'server_rss_peak':max(x['server']['rss'] for x in res if x.get('server')),'runner_rss_peak':max(x['runner_rss'] for x in res),'combined_disk_peak':max(x['combined_bytes'] for x in res),'free_disk_min':min(x['free_bytes'] for x in res),'wal_peak':max(next((f['bytes'] for f in x['files'] if f['file']=='-wal'),0) for x in res)},'endpoint_groups':{},'internal_lock_wait':'not_observed','machine_limits':'actual Mac16,12 10CPU/16GiB; no 2CPU/4GiB resource certification'}
for group in ['context','search','posts','revisions','poll','ack','other']:
 def kind(x):
  e=x['endpoint'];return 'context' if e.endswith('/context') else 'search' if e.endswith('/search') else 'poll' if e.endswith('/poll') else 'ack' if e.endswith('/ack') else 'revisions' if '/revisions' in e else 'posts' if '/posts' in e else 'other'
 v=[x for x in m if kind(x)==group];result['endpoint_groups'][group]={'all':len(v),'success':sum(200<=x['status']<300 for x in v),'success_ms':ps([x['latency_ms'] for x in v if 200<=x['status']<300])}
assert len(m)==34782 and len(ok)==33572 and result['statuses'][409]==267 and result['statuses'][422]==943,result['statuses']
out=pathlib.Path('docs/reviews/2026-10-06-m2-4-c2/verification/raw-metrics.json');out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
