import { DetunedError } from '@detuned/protocol';
import { ClientTransportError, ClientProtocolError, TimeoutError, UserAbortError, RequestKeyError } from '@detuned/client';
import { MaintenanceError, ImportError, UpgradeError, DirectoryLockUnavailableError } from '@detuned/storage-sqlite';
/** Internal local diagnostics only; never constructed from raw input or cause.message. */
export class CliSafeError extends Error {
}
export function renderCliError(error) {
    if (error instanceof DetunedError)
        return { code: error.code, message: error.message, details: error.details };
    if (error instanceof RequestKeyError || error instanceof MaintenanceError || error instanceof ImportError || error instanceof UpgradeError)
        return { code: error.code, message: error.message };
    if (error instanceof ClientTransportError)
        return { code: error.code === 'ABORT_ERROR' ? 'ABORT_ERROR' : 'TRANSPORT_ERROR', message: 'Transport request failed.' };
    if (error instanceof ClientProtocolError)
        return { code: 'UNKNOWN_ERROR', message: 'Service response failed protocol validation.' };
    if (error instanceof TimeoutError)
        return { code: 'UNKNOWN_ERROR', message: 'Request timed out.' };
    if (error instanceof UserAbortError)
        return { code: 'UNKNOWN_ERROR', message: 'Operation was cancelled.' };
    if (error instanceof DirectoryLockUnavailableError)
        return { code: 'UNKNOWN_ERROR', message: error.message };
    if (error instanceof CliSafeError)
        return { code: 'UNKNOWN_ERROR', message: error.message };
    return { code: 'UNKNOWN_ERROR', message: 'Operation failed.' };
}
//# sourceMappingURL=cli-errors.js.map