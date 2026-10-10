import { resolveLocalToken } from '@detuned/client/node';

/** Preserve the CLI two-argument composition contract; shared logic reads no ambient environment. */
export function resolveCliToken(
  options: { token?: string; tokenFile?: string },
  env: { DETUNED_TOKEN?: string; DETUNED_TOKEN_FILE?: string }
): string | undefined {
  return resolveLocalToken({
    token: options.token, tokenFile: options.tokenFile,
    environmentToken: env.DETUNED_TOKEN, environmentTokenFile: env.DETUNED_TOKEN_FILE,
  });
}
