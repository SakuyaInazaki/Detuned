import { NewTypedStructured, PostKind } from '@detuned/protocol';
import { StoragePort } from '../ports/storage.js';
import { AuthService, AuthenticatedContext } from './auth-service.js';
/** New idempotent actions only: historical successful requests must never be revalidated here. */
export declare function validateNewTypedWrite(tx: StoragePort, authService: AuthService, auth: AuthenticatedContext, spaceId: string, kind: PostKind, structured: unknown, artifactIds: readonly string[] | undefined): NewTypedStructured | undefined;
//# sourceMappingURL=typed-write-validation.d.ts.map