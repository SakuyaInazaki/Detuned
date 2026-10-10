import { DetunedError, ErrorCode } from '@detuned/protocol';
/** Only new management actions use this safe input boundary; server validates fields. */
export function readAdminInput(read) {
    try {
        const value = read();
        if (value === null || typeof value !== 'object' || Array.isArray(value))
            throw new Error('object required');
        return value;
    }
    catch {
        throw new DetunedError(ErrorCode.VALIDATION_ERROR, 'Management input must be a readable JSON object.', 400);
    }
}
//# sourceMappingURL=admin-input.js.map