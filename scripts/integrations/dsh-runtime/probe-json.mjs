import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

// Final handshake files become visible only after their complete JSON is written.
// Both paths live in the caller's existing private fixture directory.
export async function publishProbeJson(file, value, io = fs) {
  const staging = file + '.tmp-' + randomUUID();
  try {
    await io.writeFile(staging, JSON.stringify(value), {flag: 'wx', mode: 0o600});
    await io.rename(staging, file);
  } finally {
    await io.rm(staging, {force: true});
  }
}
