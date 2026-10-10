import { DetunedError, NormalizedSearchQuery } from '@detuned/protocol';
import { HasherPort } from '../ports/hasher.js';
import { ClockPort } from '../ports/clock.js';
import { TokenSignerPort } from '../ports/token-signer.js';
export interface SearchCursorDependencies {
    signer: TokenSignerPort;
    secret: string;
    clock: ClockPort;
    hasher: HasherPort;
}
export declare const invalidSearchCursor: () => DetunedError;
export declare function searchQueryHash(deps: SearchCursorDependencies, query: NormalizedSearchQuery): string;
export declare function readSearchCursor(deps: SearchCursorDependencies, actorId: string, spaceId: string, query: NormalizedSearchQuery): string | undefined;
export declare function createSearchCursor(deps: SearchCursorDependencies, actorId: string, spaceId: string, query: NormalizedSearchQuery, beforeId: string): string;
//# sourceMappingURL=search-cursor.d.ts.map