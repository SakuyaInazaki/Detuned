export { Command } from 'commander';
import { DetunedError, ErrorCode } from '@detuned/protocol';
export const parserError = () => new DetunedError(ErrorCode.VALIDATION_ERROR, 'Invalid command arguments.', 400);
/** Only diagnostic output selection; Commander remains the command parser. */
export function diagnosticJsonMode(root, args) {
    const required = new Set();
    const visit = (command) => {
        for (const option of command.options) {
            if (option.optional || option.variadic || (option.required && option.short))
                throw parserError();
            if (option.required && option.long)
                required.add(option.long);
        }
        for (const child of command.commands)
            visit(child);
    };
    visit(root);
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--')
            break;
        if (arg.startsWith('--') && arg.includes('='))
            continue;
        if (required.has(arg)) {
            i++;
            continue;
        }
        if (arg === '--json')
            return true;
    }
    return false;
}
export function configureCliParser(root) {
    root.configureOutput({ writeErr: () => { }, outputError: () => { } }).exitOverride();
}
//# sourceMappingURL=argv-diagnostics.js.map