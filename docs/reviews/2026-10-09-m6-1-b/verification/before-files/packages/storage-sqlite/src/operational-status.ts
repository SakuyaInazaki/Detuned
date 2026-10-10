import Database from 'better-sqlite3';
import { accessSync, closeSync, constants, fstatSync, lstatSync, openSync } from 'node:fs';
import type { FileSample, StorageOperationalStatus } from '@detuned/protocol';
import { CURRENT_SCHEMA_VERSION } from './bootstrap.js';

export interface OperationalOptions { dataDir?: string; }
export function directoryAvailable(dataDir: string): boolean {
  try { if (!lstatSync(dataDir).isDirectory() || lstatSync(dataDir).isSymbolicLink()) return false;
    accessSync(dataDir, constants.R_OK | constants.W_OK | constants.X_OK); return true;
  } catch { return false; }
}
/** Point checks supplement startup classification; they are not a full integrity audit. */
export function checkSqliteReadiness(db: Database.Database, options: OperationalOptions): boolean {
  try {
    if (!db.open || (options.dataDir !== undefined && !directoryAvailable(options.dataDir))) return false;
    db.prepare('SELECT 1').get();
    const row = db.prepare('SELECT COUNT(*) count, MIN(version) first, MAX(version) last FROM schema_migrations').get() as {count:number;first:number;last:number};
    if (row.count !== CURRENT_SCHEMA_VERSION || row.first !== 1 || row.last !== CURRENT_SCHEMA_VERSION) return false;
    return Boolean(db.prepare("SELECT 1 FROM instance_metadata WHERE key='initialized' AND value='true'").get()) &&
      Boolean(db.prepare("SELECT 1 FROM instance_metadata WHERE key='token_secret' AND length(trim(value))>0").get());
  } catch { return false; }
}
function fileSample(path: string, applicable: boolean): FileSample {
  if (!applicable) return { applicable:false, state:'not_applicable', bytes:null };
  let fd: number | undefined;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const info = fstatSync(fd, { bigint:true });
    if (!info.isFile()) return { applicable:true, state:'unavailable', bytes:null };
    return { applicable:true, state:'regular', bytes:decimal(info.size) };
  } catch (error) {
    return { applicable:true, state:(error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'unavailable', bytes:null };
  } finally { if (fd !== undefined) closeSync(fd); }
}
function decimal(value: bigint): string {
  const result = value.toString();
  if (!/^[0-9]{1,32}$/.test(result)) throw new Error('Invalid operational sample.');
  return result;
}
function pageValue(db: Database.Database, pragma: string): number {
  const value = db.pragma(pragma, { simple:true });
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid operational sample.');
  return value;
}
export function sampleSqliteStatus(db: Database.Database, options: OperationalOptions,
  usage: {objects:number;bytes:bigint}): StorageOperationalStatus {
  const page_size=pageValue(db,'main.page_size'), page_count=pageValue(db,'main.page_count');
  const free_pages=pageValue(db,'main.freelist_count'), max_pages=pageValue(db,'main.max_page_count');
  const mode=db.pragma('main.journal_mode', {simple:true});
  const journal_mode = typeof mode === 'string' && ['wal','delete','truncate','persist','memory','off'].includes(mode) ? mode as StorageOperationalStatus['database']['journal_mode'] : 'unknown';
  const applicable=journal_mode === 'wal';
  let busy:boolean|null=null, log_frames:number|null=null, checkpointed_frames:number|null=null;
  if (applicable) {
    const rows=db.pragma('main.wal_checkpoint(NOOP)') as {busy:number;log:number;checkpointed:number}[];
    const row=rows[0];
    if (!row || ![row.busy,row.log,row.checkpointed].every(Number.isSafeInteger) || ![0,1].includes(row.busy) || row.log < -1 || row.checkpointed < -1) throw new Error('Invalid operational sample.');
    busy=Boolean(row.busy); log_frames=row.log < 0 ? null : row.log; checkpointed_frames=row.checkpointed < 0 ? null : row.checkpointed;
  }
  return {
    database:{page_size,page_count,free_pages,max_pages,allocated_bytes:decimal(BigInt(page_count)*BigInt(page_size)),max_allocated_bytes:decimal(BigInt(max_pages)*BigInt(page_size)),journal_mode,wal:{applicable,busy,log_frames,checkpointed_frames}},
    files:{database:fileSample(db.name,!db.memory),wal:fileSample(`${db.name}-wal`,!db.memory && applicable)},
    data_directory:{configured:options.dataDir !== undefined,available:options.dataDir === undefined ? null : directoryAvailable(options.dataDir)},
    artifacts:{objects_observed:usage.objects,bytes_observed:decimal(usage.bytes),complete:usage.objects<=10000},
  };
}
