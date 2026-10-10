import { resolveLocalToken } from '@detuned/client/node';
/** Preserve the CLI two-argument composition contract; shared logic reads no ambient environment. */
export function resolveCliToken(options, env) {
    return resolveLocalToken({
        token: options.token, tokenFile: options.tokenFile,
        environmentToken: env.DETUNED_TOKEN, environmentTokenFile: env.DETUNED_TOKEN_FILE,
    });
}
//# sourceMappingURL=token-source.js.map