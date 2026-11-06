export { Command } from 'commander';
import { DetunedError, ErrorCode } from '@detuned/protocol';
export function parserError(root, code, argv = []) {
    let message = 'Invalid command arguments.';
    if (root && typeof code === 'string') {
        let command = root;
        for (let depth = 0; depth < 8; depth++) {
            const child = command.commands.find(item => item.name() === command.args[0]);
            if (!child)
                break;
            command = child;
        }
        if (code === 'commander.optionMissingArgument') {
            const options = [...root.options, ...command.options];
            for (let index = 0; index < argv.length; index++) {
                if (argv[index] === '--')
                    break;
                const option = options.find(item => item.long === argv[index] || item.short === argv[index]);
                if (!option?.required)
                    continue;
                const next = argv[index + 1];
                if (next === undefined || options.some(item => item.long === next || item.short === next)) {
                    const flag = option.long ?? option.short;
                    if (flag)
                        message = `选项 ${flag} 需要参数。`;
                    break;
                }
                index++;
            }
        }
        else if (code === 'commander.missingMandatoryOptionValue') {
            const option = command.options.find(item => item.mandatory && command.getOptionValue(item.attributeName()) === undefined);
            if (option?.long)
                message = `缺少必需选项 ${option.long}。`;
        }
        else if (code === 'commander.missingArgument') {
            const argument = command.registeredArguments.find((item, index) => item.required && command.args[index] === undefined);
            if (argument)
                message = `缺少必需位置参数 <${argument.name()}>。`;
        }
        else if (code === 'commander.help' && command.commands.length > 0) {
            message = `请指定子命令：${command.commands.slice(0, 8).map(item => item.name()).join(' / ')}。`;
        }
    }
    return new DetunedError(ErrorCode.VALIDATION_ERROR, message, 400);
}
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