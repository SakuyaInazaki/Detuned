import { DetunedClient } from '@detuned/client';
import { type CreateSpaceRequest } from '@detuned/protocol';
type Participant = {
    label: string;
    actor_id: string;
    credential_id: string;
    token_file: string;
};
export declare function validateSetupOptions(input: unknown, labels: unknown, output: unknown): {
    space: CreateSpaceRequest;
    labels: string[];
    output: string;
};
export declare function createSetupWriteGate(wait?: (ms: number) => Promise<void>, now?: () => number): () => Promise<void>;
/** Explicit bounded setup, never automatically resumes or rolls back service writes. */
export declare function setupParticipants(client: DetunedClient, options: {
    space: CreateSpaceRequest;
    labels: string[];
    output: string;
}): Promise<{
    space_id: string;
    output_dir: string;
    receipt_file: string;
    participants: Participant[];
    next: string;
}>;
export {};
//# sourceMappingURL=setup.d.ts.map