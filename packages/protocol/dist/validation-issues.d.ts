import type { TSchema } from '@sinclair/typebox';
import { DetunedError } from './errors.js';
export interface SafeValidationIssue {
    path: string;
    rule: string;
    allowed_values?: Array<string | number | boolean | null>;
    expected_type?: string;
}
/** Diagnostics only. Schemas are trusted; input names/values and validator messages never enter output. */
export declare function safeValidationIssues(schema: TSchema, value: unknown, prefix?: string): SafeValidationIssue[];
export declare function schemaValidationError(message: string, schema: TSchema, value: unknown, prefix?: string): DetunedError;
//# sourceMappingURL=validation-issues.d.ts.map