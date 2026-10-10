import type Database from 'better-sqlite3';
import { type ResourceLimits } from '@detuned/protocol';
/** Runtime connection only. No migration, persistent metadata, or offline maintenance policy. */
export declare function configureSqliteResourceLimits(db: Database.Database, limits: ResourceLimits): void;
//# sourceMappingURL=sqlite-resource-limits.d.ts.map