import { constants } from 'node:fs';
import { mkdir, lstat, open, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { ClientProtocolError } from '@detuned/client';
import { DetunedError, ErrorCode, validateCreateSpaceRequest } from '@detuned/protocol';
import { CliSafeError } from './cli-errors.js';
export function validateSetupOptions(input, labels, output) {
    validateCreateSpaceRequest(input);
    if (!Array.isArray(labels) || labels.length < 1 || labels.length > 32 || labels.some(v => typeof v !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/.test(v)) || new Set(labels).size !== labels.length)
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'setup需要1–32个唯一participant；标签为1–32位ASCII字母、数字、下划线或短横线并以字母数字开始。', 400);
    if (typeof output !== 'string' || !output.trim())
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'setup需要新的私有output目录。', 400);
    return { space: input, labels: [...labels], output: path.resolve(output) };
}
export function createSetupWriteGate(wait = ms => new Promise(resolve => setTimeout(resolve, ms)), now = () => performance.now()) {
    let count = 0;
    let previous;
    return async () => { count++; if (count >= 19 && previous !== undefined) {
        const remaining = 1100 - (now() - previous);
        if (remaining > 0)
            await wait(remaining);
    } previous = now(); };
}
function safeId(value) { return typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\s\x00-\x1f\x7f]/.test(value); }
function knownRejection(error) { return error instanceof DetunedError && error.statusCode >= 400 && error.statusCode < 500; }
/** Explicit bounded setup, never automatically resumes or rolls back service writes. */
export async function setupParticipants(client, options) {
    const { space, labels, output } = options;
    try {
        await lstat(output);
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'setup output目录必须不存在；已有结果不得覆盖或重放。', 400);
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
    }
    // Resolve/validate current HTTP identity, but service business permissions remain authoritative.
    await client.getMe();
    try {
        await mkdir(output, { mode: 0o700 });
    }
    catch {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'setup无法新建私有output目录；没有发送业务写入。', 400);
    }
    const info = await lstat(output);
    if (!info.isDirectory() || info.isSymbolicLink() || info.uid !== process.getuid?.() || (info.mode & 0o777) !== 0o700)
        throw new CliSafeError('setup output必须为本人拥有的真实0700目录。');
    const receipt = { version: 1, status: 'running', steps: [], participants: [] };
    let serial = 0;
    const beforeWrite = createSetupWriteGate();
    const receiptPath = path.join(output, 'receipt.json');
    const first = await open(receiptPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    try {
        await first.writeFile(JSON.stringify(receipt, null, 2) + '\n');
        await first.sync();
    }
    finally {
        await first.close();
    }
    const persist = async () => {
        const tmp = path.join(output, `.receipt-${++serial}.tmp`);
        const fd = await open(tmp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
        try {
            await fd.writeFile(JSON.stringify(receipt, null, 2) + '\n');
            await fd.sync();
        }
        finally {
            await fd.close();
        }
        await rename(tmp, receiptPath);
        const directory = await open(output, constants.O_RDONLY | constants.O_DIRECTORY);
        try {
            await directory.sync();
        }
        finally {
            await directory.close();
        }
    };
    const execute = async (operation, participant, fn) => {
        const step = { operation, ...(participant ? { participant } : {}), status: 'started' };
        receipt.steps.push(step);
        await persist();
        try {
            await beforeWrite();
            const result = await fn(step);
            if (step.status === 'started')
                step.status = 'completed';
            await persist();
            return result;
        }
        catch (error) {
            if (step.status === 'started')
                step.status = knownRejection(error) ? 'failed' : 'unknown';
            if (error instanceof DetunedError && Object.values(ErrorCode).some(code => code === error.code))
                step.code = error.code;
            receipt.status = step.status === 'unknown' ? 'unknown' : 'failed';
            try {
                await persist();
            }
            catch {
                throw new CliSafeError('setup已停止且收据保存失败；保留私有目录及已发凭据，管理员须核对实际服务状态，不要重复执行。');
            }
            throw new CliSafeError('setup未完成；查看私有output中的receipt.json及已保存token。unknown表示写入结果未知；received_not_saved表示凭据已签发但未保存，须管理员撤销对应credential_id。不要重放setup或删除服务端材料。');
        }
    };
    const spaceId = await execute('space.create', undefined, async () => { const created = await client.createSpace(space, 'setup-space-' + randomBytes(16).toString('hex')); const id = created.data?.space?.id; if (!safeId(id) || created.data?.revision?.space_id !== id || created.data?.space?.slug !== space.slug)
        throw new ClientProtocolError('Invalid setup space response.'); receipt.space_id = id; return id; });
    for (const label of labels) {
        const actor = await execute('actor.create', label, async (step) => { const actor = await client.createActor({ kind: 'agent', display_name: label }); if (!safeId(actor.id) || actor.kind !== 'agent' || actor.display_name !== label)
            throw new ClientProtocolError('Invalid setup actor response.'); step.actor_id = actor.id; return actor; });
        await execute('membership.create', label, async (step) => { step.actor_id = actor.id; const member = await client.createMembership(spaceId, { actor_id: actor.id, role: 'contributor' }); if (member.actor_id !== actor.id || member.space_id !== spaceId || member.role !== 'contributor' || member.active !== true)
            throw new ClientProtocolError('Invalid setup membership response.'); return member; });
        const tokenPath = path.join(output, `actor-${label}.token`);
        // Reserve the destination before a once-only credential request, avoiding clobber after issuance.
        await execute('credential.create', label, async (step) => {
            step.actor_id = actor.id;
            let tokenFile;
            try {
                tokenFile = await open(tokenPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
            }
            catch {
                step.status = 'failed';
                throw new CliSafeError('Token file reservation failed before credential request.');
            }
            try {
                const result = await client.createCredential({ actor_id: actor.id, allowed_space_ids: [spaceId], capabilities: ['read', 'write'] });
                if (safeId(result.credential_id))
                    step.credential_id = result.credential_id;
                if (typeof result.token !== 'string' || result.token.length < 1 || result.token.length > 65536 || /[\s\x00-\x1f\x7f]/.test(result.token))
                    throw new ClientProtocolError('Invalid setup credential response.');
                try {
                    await tokenFile.writeFile(result.token + '\n');
                    await tokenFile.sync();
                    step.token_file = tokenPath;
                }
                catch {
                    // An independent no-clobber recovery location can retain a token if the reserved file fails.
                    const recovery = path.join(output, `recovery-${label}.token`);
                    try {
                        const fd = await open(recovery, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
                        try {
                            await fd.writeFile(result.token + '\n');
                            await fd.sync();
                        }
                        finally {
                            await fd.close();
                        }
                        step.token_file = recovery;
                    }
                    catch {
                        step.status = 'received_not_saved';
                        throw new CliSafeError('Issued credential could not be saved.');
                    }
                    step.status = 'failed';
                    throw new CliSafeError('Issued credential saved only to private recovery file.');
                }
                if (!safeId(result.credential_id) || result.actor_id !== actor.id)
                    throw new ClientProtocolError('Invalid setup credential association.');
                receipt.participants.push({ label, actor_id: actor.id, credential_id: result.credential_id, token_file: tokenPath });
            }
            finally {
                await tokenFile.close();
            }
        });
    }
    receipt.status = 'completed';
    await persist();
    return { space_id: spaceId, output_dir: output, receipt_file: receiptPath, participants: receipt.participants, next: '每位参与者只使用自己的token_file与space_id；不要分发管理员token。' };
}
//# sourceMappingURL=setup.js.map