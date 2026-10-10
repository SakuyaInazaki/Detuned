import fs from 'node:fs';
import { DetunedError, ErrorCode } from '@detuned/protocol';
const MAX_TOKEN_FILE_BYTES = 64 * 1024;
const invalid = () => new DetunedError(ErrorCode.VALIDATION_ERROR, 'Select one valid credential source; token files must be readable regular UTF-8 files of at most 64 KiB.', 400);
function tokenValue(value) {
    const token = value.trim();
    if (!token || /[\s\p{Cc}]/u.test(token))
        throw invalid();
    return token;
}
function readTokenFile(file) {
    let fd;
    try {
        fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
        const before = fs.fstatSync(fd);
        if (!before.isFile() || before.size > MAX_TOKEN_FILE_BYTES)
            throw invalid();
        const bytes = new Uint8Array(MAX_TOKEN_FILE_BYTES + 1);
        let count = 0;
        while (count < bytes.length) {
            const read = fs.readSync(fd, bytes, count, Math.min(8192, bytes.length - count), null);
            if (read === 0)
                break;
            count += read;
        }
        const after = fs.fstatSync(fd);
        if (count > MAX_TOKEN_FILE_BYTES || count !== before.size || after.size !== before.size ||
            after.mtimeMs !== before.mtimeMs || after.ctimeMs !== before.ctimeMs)
            throw invalid();
        return tokenValue(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, count)));
    }
    catch {
        throw invalid();
    }
    finally {
        if (fd !== undefined) {
            try {
                fs.closeSync(fd);
            }
            catch {
                throw invalid();
            }
        }
    }
}
/** Composition supplies environment explicitly; no ambient configuration is read here. */
export function resolveLocalToken(input) {
    const sources = [
        { value: input.token, file: false, selected: input.token !== undefined },
        { value: input.tokenFile, file: true, selected: input.tokenFile !== undefined },
        { value: input.environmentToken, file: false, selected: input.environmentToken !== undefined && input.environmentToken !== '' },
        { value: input.environmentTokenFile, file: true, selected: input.environmentTokenFile !== undefined && input.environmentTokenFile !== '' },
    ].filter(source => source.selected);
    if (sources.length > 1)
        throw invalid();
    if (sources.length === 0)
        return undefined;
    const source = sources[0];
    if (typeof source.value !== 'string' || source.value === '')
        throw invalid();
    return source.file ? readTokenFile(source.value) : tokenValue(source.value);
}
//# sourceMappingURL=local-token.js.map