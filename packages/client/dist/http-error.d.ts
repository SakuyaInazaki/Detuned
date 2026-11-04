import { type ApiErrorDetail } from '@detuned/protocol';
/** Old peers may omit envelope/default fields. Present fields must still be valid;
 * malformed gateway bodies never become trusted business messages or metadata. */
export declare function publicHttpError(value: unknown, status: number): ApiErrorDetail;
//# sourceMappingURL=http-error.d.ts.map