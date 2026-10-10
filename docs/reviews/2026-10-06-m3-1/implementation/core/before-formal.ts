import {afterEach,beforeEach,describe,it,expect} from 'vitest';
import Database from 'better-sqlite3';
import {AuthService,CryptoHasher,CryptoIdGenerator,HmacTokenSigner,EventService,SpaceService,IdempotencyService,AuthenticatedContext} from '@detuned/core';
import {SqliteStorage,bootstrapDatabase} from '@detuned/storage-sqlite';

describe('M3.1 event core correctness',()=>{
 let db:Database.Database,storage:SqliteStorage,auth:AuthenticatedContext,as:AuthService,service:EventService,sid:string,seconds:number;
 const ids=new CryptoIdGenerator(),hasher=new CryptoHasher(),signer=new HmacTokenSigner(),secret='event-test';
 const clock={now:()=>new Date(seconds*1000),nowIso:()=>new Date(seconds*1000).toISOString()};
 beforeEach(()=>{seconds=Math.floor(Date.now()/1000);db=new Database(':memory:');const boot=bootstrapDatabase(db);storage=new SqliteStorage(db);as=new AuthService(storage,hasher,clock);auth=as.authenticateToken(boot.adminToken!);sid=new SpaceService(storage,ids,clock,as,new IdempotencyService(storage,hasher,clock)).createSpace(auth,{slug:'events',objective:'events',rules:[]},'space').space.id;service=new EventService(storage,ids,clock,signer,as,secret);});
 afterEach(()=>db.close());
 const sub=(key='one',types?:('post.created')[])=>service.subscribe(auth,sid,{consumer_key:key,start:'now',...(types?{event_types:types}:{})}).consumer;
 const event=(visibility:'public'|'review_assignment'='public')=>storage.appendEvent(sid,{id:ids.generateId(),space_id:sid,type:'post.created',object_id:'post',revision:1,visibility,actor_id:auth.actor.id,created_at:clock.nowIso()});
 it('E01 private events advance scan without public delivery, including pending projection',()=>{const c=sub();const p=event(),privateEvent=event('review_assignment');const batch=service.poll(auth,sid,c.id,{});expect(batch.events.map(e=>e.id)).toEqual([p.id]);expect(storage.findDeliveryBatchById(batch.batch_id!)!.through_seq).toBe(privateEvent.seq);db.prepare('UPDATE events SET visibility=? WHERE id=?').run('review_assignment',p.id);expect(service.poll(auth,sid,c.id,{})).toMatchObject({batch_id:batch.batch_id,events:[]});});
 it('E02 signing and expiry use injected floor Clock with equality valid and +1 rejected',()=>{const c=sub();event();seconds=1893456000;const batch=service.poll(auth,sid,c.id,{});const payload=signer.verify(batch.next_cursor!,secret,seconds)!;expect(payload.exp).toBe(seconds+86400);seconds+=86400;expect(service.ack(auth,sid,c.id,{batch_id:batch.batch_id!,next_cursor:batch.next_cursor!}).confirmed).toBe(true);seconds++;expect(()=>service.ack(auth,sid,c.id,{batch_id:batch.batch_id!,next_cursor:batch.next_cursor!})).toThrow(expect.objectContaining({code:'ACK_INVALID'}));});
 it('E03 repeat ack still checks persisted through_seq before idempotent success',()=>{const c=sub();event();const batch=service.poll(auth,sid,c.id,{});service.ack(auth,sid,c.id,{batch_id:batch.batch_id!,next_cursor:batch.next_cursor!});const payload=signer.verify(batch.next_cursor!,secret,seconds)!;const forged=signer.sign({...payload,through_seq:0},secret);const before=db.serialize();expect(()=>service.ack(auth,sid,c.id,{batch_id:batch.batch_id!,next_cursor:forged})).toThrow(expect.objectContaining({code:'ACK_INVALID'}));expect(db.serialize()).toEqual(before);});

});
