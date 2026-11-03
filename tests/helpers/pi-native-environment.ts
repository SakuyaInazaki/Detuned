import { chmod, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** An allowlisted environment: never inherit credentials or the real user home. */
export async function createPiNativeEnvironment() {
  const root = await mkdtemp(join(tmpdir(), 'detuned-pi-parent-'));
  try {
    await chmod(root, 0o700);
    const home = join(root, 'home'), temporary = join(root, 'tmp');
    await mkdir(home, { mode: 0o700 });
    await mkdir(temporary, { mode: 0o700 });
    return {
      root,
      env: { PATH: '/usr/bin:/bin', CI: 'true', HOME: home, TMPDIR: temporary,
        PI_CODING_AGENT_DIR: join(home, 'agent') },
      remove: () => rm(root, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}
