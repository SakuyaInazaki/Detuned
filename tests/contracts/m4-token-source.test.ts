import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolveCliToken } from '../../packages/cli/src/token-source.js';

function privateFixture(run: (root: string) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'detuned-token-source-'));
  try { run(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
function rejected(run: () => unknown) {
  try { run(); throw new Error('expected rejection'); } catch (error) {
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', statusCode: 400 });
    expect((error as Error).message).not.toContain('PRIVATE');
    expect((error as Error).message).not.toContain(os.tmpdir());
    expect((error as any).cause).toBeUndefined();
  }
}

describe('M4.1-E explicit CLI credential sources', () => {
  it('permits anonymous and each single source without ambient environment reads', () => privateFixture(root => {
    const file = path.join(root, 'private-token'); fs.writeFileSync(file, '  private-file-token\r\n', { mode: 0o600 });
    expect(resolveCliToken({}, {})).toBeUndefined(); expect(resolveCliToken({}, { DETUNED_TOKEN: '', DETUNED_TOKEN_FILE: '' })).toBeUndefined();
    expect(resolveCliToken({ token: ' private-explicit ' }, {})).toBe('private-explicit');
    expect(resolveCliToken({}, { DETUNED_TOKEN: 'private-env' })).toBe('private-env');
    expect(resolveCliToken({ tokenFile: file }, {})).toBe('private-file-token');
    expect(resolveCliToken({}, { DETUNED_TOKEN_FILE: file })).toBe('private-file-token');
  }));

  it('rejects every pair of selected sources, including identical values and empty explicit flags', () => {
    const sources = ['token', 'tokenFile', 'DETUNED_TOKEN', 'DETUNED_TOKEN_FILE'] as const;
    for (let a = 0; a < sources.length; a++) for (let b = a + 1; b < sources.length; b++) {
      const values = { [sources[a]!]: 'PRIVATE_same', [sources[b]!]: 'PRIVATE_same' };
      rejected(() => resolveCliToken(values, values));
    }
    rejected(() => resolveCliToken({ token: '' }, { DETUNED_TOKEN: 'PRIVATE' }));
    rejected(() => resolveCliToken({ tokenFile: '' }, { DETUNED_TOKEN_FILE: 'PRIVATE' }));
  });

  it('trims only exterior whitespace and rejects empty, interior JS whitespace and Unicode Cc without prefix restrictions', () => {
    for (const value of ['', ' \t\n', 'PRIVATE token', 'PRIVATE\u00a0token', 'PRIVATE\u2028token', 'PRIVATE\u0000token', 'PRIVATE\u0085token']) {
      rejected(() => resolveCliToken({ token: value }, {}));
      rejected(() => resolveCliToken({}, { DETUNED_TOKEN: value || ' ' }));
    }
    expect(resolveCliToken({ token: '\t未知凭据-é\n' }, {})).toBe('未知凭据-é');
    expect(resolveCliToken({ token: 'a\u200bb' }, {})).toBe('a\u200bb'); // Cf is not Cc; no normalization/ASCII policy.
  });

  it('enforces the original-byte 64KiB boundary without a generated-token length whitelist', () => privateFixture(root => {
    const file = path.join(root, 'bytes');
    fs.writeFileSync(file, 'x'.repeat(65536)); expect(resolveCliToken({ tokenFile: file }, {})).toHaveLength(65536);
    fs.writeFileSync(file, 'x'.repeat(65537)); rejected(() => resolveCliToken({ tokenFile: file }, {}));
    fs.writeFileSync(file, 'é'.repeat(32768)); expect(resolveCliToken({ tokenFile: file }, {})).toHaveLength(32768);
    fs.writeFileSync(file, 'é'.repeat(32769)); rejected(() => resolveCliToken({ tokenFile: file }, {}));
  }));

  it('rejects malformed UTF8 and empty/control file content without disclosing raw bytes', () => privateFixture(root => {
    const file = path.join(root, 'PRIVATE-file');
    for (const bytes of [Buffer.from([0xc3, 0x28]), Buffer.from(''), Buffer.from(' \r\n'), Buffer.from('PRIVATE\u0000secret'), Buffer.from('PRIVATE secret')]) {
      fs.writeFileSync(file, bytes); rejected(() => resolveCliToken({ tokenFile: file }, {}));
    }
  }));

  it('rejects missing, directory and last-component symlink with no fallback; ordinary broad mode is not a new denial policy', () => privateFixture(root => {
    const file = path.join(root, 'file'); fs.writeFileSync(file, 'private-token', { mode: 0o644 });
    fs.symlinkSync(file, path.join(root, 'link'));
    for (const candidate of [path.join(root, 'PRIVATE-missing'), root, path.join(root, 'link'), '']) rejected(() => resolveCliToken({ tokenFile: candidate }, {}));
    rejected(() => resolveCliToken({}, { DETUNED_TOKEN_FILE: path.join(root, 'PRIVATE-missing') }));
    expect(resolveCliToken({ tokenFile: file }, {})).toBe('private-token');
  }));

  it('rejects a real no-writer FIFO in a bounded child and closes successful or failed input FDs', () => privateFixture(root => {
    const fifo = path.join(root, 'fifo'); execFileSync('/usr/bin/mkfifo', [fifo]);
    const source = pathToFileURL(path.resolve('packages/cli/src/token-source.ts')).href;
    const script = `const {resolveCliToken}=await import(${JSON.stringify(source)});try{resolveCliToken({tokenFile:process.argv[1]},{});process.exitCode=2}catch(e){if(e.code!=='VALIDATION_ERROR')throw e;console.log('rejected')}`;
    expect(execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script, fifo], { timeout: 15000, encoding: 'utf8' }).trim()).toBe('rejected');
    const file = path.join(root, 'regular'); fs.writeFileSync(file, 'private-token');
    // Inspect only this fixture's open handles, never user files or secrets.
    const fdDirectory = process.platform === 'linux' ? '/proc/self/fd' : '/dev/fd';
    const count = () => fs.readdirSync(fdDirectory).length;
    const before = count();
    for (let n = 0; n < 32; n++) { expect(resolveCliToken({ tokenFile: file }, {})).toBe('private-token'); rejected(() => resolveCliToken({ tokenFile: root }, {})); }
    expect(count()).toBe(before);
  }));
});
