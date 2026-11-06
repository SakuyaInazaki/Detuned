import { Command } from 'commander';
export { Command } from 'commander';
import { DetunedError } from '@detuned/protocol';
export declare function parserError(root?: Command, code?: unknown, argv?: readonly string[]): DetunedError;
/** Only diagnostic output selection; Commander remains the command parser. */
export declare function diagnosticJsonMode(root: Command, args: readonly string[]): boolean;
export declare function configureCliParser(root: Command): void;
//# sourceMappingURL=argv-diagnostics.d.ts.map