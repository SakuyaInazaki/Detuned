import type { FastifyInstance } from 'fastify';
export interface RequestLogEntry {
    event: 'request_completed';
    timestamp: string;
    method: string;
    route: string;
    request_id: string;
    status_code: number | null;
    outcome: 'completed' | 'aborted';
    duration_ms: number;
    error_code?: string;
    actor_id?: string;
}
export type RequestLogSink = (entry: RequestLogEntry) => void;
export declare function installRequestLogging(app: FastifyInstance, sink?: RequestLogSink): void;
//# sourceMappingURL=observability.d.ts.map