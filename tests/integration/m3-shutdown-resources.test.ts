import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ReadStream } from 'node:fs';
import { ArtifactFileStore, RuntimeResources } from '@detuned/server';
import { DirectoryLock } from '@detuned/storage-sqlite';
const roots:string[]=[], locks:DirectoryLock[]=[];
async function root() { const value=await mkdtemp(join(tmpdir(),'detuned-shutdown-'));roots.push(value);return value; }
async function file() { const dir=await root(),store=await ArtifactFileStore.create(dir);const staged=await store.stage((async function*(){yield Buffer.from('real owned attachment');})(),100);await store.publish(staged,'owned_object');return{dir,store}; }
function closed(stream:ReadStream,fd:number) { expect(stream.closed).toBe(true);expect(()=>fs.fstatSync(fd)).toThrow(expect.objectContaining({code:'EBADF'})); }
afterEach(async()=>{vi.restoreAllMocks();for(const lock of locks)lock.release();locks.length=0;for(const dir of roots)await rm(dir,{recursive:true,force:true});roots.length=0;});
describe('M3.4-B.2 explicit resource finalization',()=>{
 it('disposes a real unconsumed read handle and waits for FD close idempotently',async()=>{
   const {store}=await file(),handle=(await store.open('owned_object'))!,stream=handle.chunks as ReadStream,fd=stream.fd!;
   expect(typeof fd).toBe('number');const first=handle.dispose();await Promise.all([first,handle.dispose()]);closed(stream,fd);await handle.dispose();
 });
 it('disposes a late-open handle after cancellation before finishing its lease, and closes normal reads',async()=>{
   const {store}=await file(),resources=new RuntimeResources();let cancelled=false;
   const finish=resources.acquire(()=>{cancelled=true;});const pending=store.open('owned_object');resources.beginClosing();expect(cancelled).toBe(true);expect(resources.activeCount).toBe(1);
   const handle=(await pending)!,stream=handle.chunks as ReadStream,fd=stream.fd!;await handle.dispose();closed(stream,fd);finish();await resources.waitForIdle();
   const normal=(await store.open('owned_object'))!,normalStream=normal.chunks as ReadStream,normalFd=normalStream.fd!;const bytes:Buffer[]=[];
   for await(const chunk of normal.chunks)bytes.push(Buffer.from(chunk));await normal.dispose();expect(Buffer.concat(bytes).toString()).toBe('real owned attachment');closed(normalStream,normalFd);
 });
 it('cancels every lease synchronously and waits for whole finally before becoming idle',async()=>{
   const resources=new RuntimeResources(),cancelled:number[]=[];const one=resources.acquire(()=>cancelled.push(1)),two=resources.acquire(()=>cancelled.push(2));
   resources.beginClosing();resources.beginClosing();expect(cancelled).toEqual([1,2]);expect(()=>resources.acquire(()=>{})).toThrow(expect.objectContaining({code:'SERVICE_NOT_READY',statusCode:503,retryable:true}));
   let done=false;const idle=resources.waitForIdle().then(()=>{done=true;});one();one();await Promise.resolve();expect(done).toBe(false);expect(resources.activeCount).toBe(1);two();await idle;expect(done).toBe(true);expect(resources.activeCount).toBe(0);
 });
 it('isolates synchronous cancellation failures and only rejects after remaining owners finish',async()=>{
   const resources=new RuntimeResources();let other=false;const one=resources.acquire(()=>{throw Error('PRIVATE_CANCEL_CAUSE');}),two=resources.acquire(()=>{other=true;});resources.beginClosing();expect(other).toBe(true);
   const idle=resources.waitForIdle();one();two();await expect(idle).rejects.toThrow('活动资源取消失败。');await expect(resources.waitForIdle()).rejects.not.toThrow('PRIVATE_CANCEL_CAUSE');
 });
 it('strict release is repeatable and a failed close preserves the live FD and lock',async()=>{
   const dir=await root(),lock=new DirectoryLock(dir);locks.push(lock);lock.acquire();const fd=(lock as unknown as {lockFd:number}).lockFd;
   const close=vi.spyOn(fs,'closeSync').mockImplementationOnce(()=>{throw Error('PRIVATE_CLOSE_CAUSE');});expect(()=>lock.releaseStrict()).toThrow('目录锁文件描述符关闭失败，锁未释放。');expect(fs.fstatSync(fd).isFile()).toBe(true);expect(fs.existsSync(join(dir,'detuned.lock'))).toBe(true);close.mockRestore();lock.releaseStrict();lock.releaseStrict();expect(fs.existsSync(join(dir,'detuned.lock'))).toBe(false);
 });
 it('failed unlink preserves lock material but never closes the already closed FD twice',async()=>{
   const dir=await root(),lock=new DirectoryLock(dir);locks.push(lock);lock.acquire();const fd=(lock as unknown as {lockFd:number}).lockFd;
   const close=vi.spyOn(fs,'closeSync'),unlink=vi.spyOn(fs,'unlinkSync').mockImplementationOnce(()=>{throw Error('PRIVATE_UNLINK_CAUSE');});expect(()=>lock.releaseStrict()).toThrow('目录锁材料移除失败，锁释放未完成。');expect(()=>fs.fstatSync(fd)).toThrow(expect.objectContaining({code:'EBADF'}));expect(fs.existsSync(join(dir,'detuned.lock'))).toBe(true);unlink.mockRestore();lock.releaseStrict();lock.releaseStrict();expect(close).toHaveBeenCalledTimes(1);expect(fs.existsSync(join(dir,'detuned.lock'))).toBe(false);
 });
});
