/** Escape every dynamic value; no terminal control sequence, bidi override or ANSI styling. */
export declare function terminalText(value: unknown): string;
export declare function humanPost(value: {
    ref: unknown;
    post_kind: string;
    lifecycle: string;
    has_newer_revision: boolean;
    content: {
        title: string;
        summary: string;
        body: string;
        tags: string[];
        structured: unknown;
    };
    bytes: number;
    pages: number;
}): string;
export declare function humanThread(page: {
    data: {
        thread: unknown;
        posts: Array<{
            id: string;
            kind: string;
            current_revision: number;
            lifecycle: string;
            title?: string;
        }>;
    };
    meta: {
        truncated: boolean;
        next_cursor: string | null;
    };
}): string;
import type { RelationReadView, RelationHistoryPage } from '@detuned/protocol';
export declare function humanRelationHistory(page: RelationHistoryPage): string;
export declare function humanRelation(relation: RelationReadView, history?: RelationHistoryPage): string;
//# sourceMappingURL=reading-output.d.ts.map