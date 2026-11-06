import { Value } from '@sinclair/typebox/value';
import { DetunedError, ErrorCode } from './errors.js';
function validValue(schema, value) { return Value.Check(schema, value); }
/** Diagnostics only. Schemas are trusted; input names/values and validator messages never enter output. */
export function safeValidationIssues(schema, value, prefix = '') {
    const issues = [];
    let budget = 256;
    const add = (path, rule, allowed, expectedType) => {
        if (issues.length >= 8)
            return;
        const issue = { path: path.length <= 160 ? path : '', rule };
        if (rule === 'type' && expectedType && ['string', 'integer', 'number', 'boolean', 'null', 'array', 'object'].includes(expectedType))
            issue.expected_type = expectedType;
        if (allowed?.length && allowed.length <= 16 && allowed.every(item => typeof item !== 'string' || item.length <= 64))
            issue.allowed_values = allowed;
        if (!issues.some(item => item.path === issue.path && item.rule === rule))
            issues.push(issue);
    };
    const visit = (s, v, path, depth) => {
        if (--budget < 0 || depth > 12 || issues.length >= 8)
            return;
        if (s.anyOf) {
            const branches = s.anyOf;
            const literals = branches.filter(branch => Object.prototype.hasOwnProperty.call(branch, 'const'));
            if (literals.length === branches.length) {
                if (!literals.some(branch => branch.const === v))
                    add(path, 'enum', literals.map(branch => branch.const));
                return;
            }
            const object = v !== null && typeof v === 'object' && !Array.isArray(v) ? v : undefined;
            if (object) {
                let selected;
                let best = 0;
                for (const branch of branches) {
                    if (--budget < 0)
                        break;
                    let score = 0, conflict = false;
                    for (const [key, property] of Object.entries(branch.properties ?? {})) {
                        if (--budget < 0)
                            break;
                        if (Object.prototype.hasOwnProperty.call(property, 'const') && Object.prototype.hasOwnProperty.call(object, key)) {
                            if (property.const === object[key])
                                score++;
                            else
                                conflict = true;
                        }
                    }
                    if (!conflict && score > best) {
                        best = score;
                        selected = branch;
                    }
                }
                if (selected) {
                    visit(selected, v, path, depth + 1);
                    return;
                }
            }
            if (object) {
                const first = branches[0];
                for (const [key, property] of Object.entries(first?.properties ?? {})) {
                    if (--budget < 0)
                        break;
                    if (!Object.prototype.hasOwnProperty.call(property, 'const'))
                        continue;
                    const candidates = branches.map(branch => branch.properties?.[key]);
                    if (!candidates.every(candidate => candidate && Object.prototype.hasOwnProperty.call(candidate, 'const')))
                        continue;
                    const next = path + '/' + key.replace(/~/g, '~0').replace(/\//g, '~1');
                    if (!Object.prototype.hasOwnProperty.call(object, key)) {
                        if (branches.every(branch => branch.required?.includes(key))) {
                            add(next, 'required');
                            return;
                        }
                    }
                    else if (!candidates.some(candidate => candidate.const === object[key])) {
                        add(next, 'enum', [...new Set(candidates.map(candidate => candidate.const))]);
                        return;
                    }
                }
            }
            add(path, 'union');
            return;
        }
        if (s.type === 'object') {
            if (v === null || typeof v !== 'object' || Array.isArray(v)) {
                add(path, 'type', undefined, 'object');
                return;
            }
            const object = v, properties = s.properties ?? {};
            for (const [key, property] of Object.entries(properties)) {
                if (--budget < 0 || issues.length >= 8)
                    break;
                const next = path + '/' + key.replace(/~/g, '~0').replace(/\//g, '~1');
                if (!Object.prototype.hasOwnProperty.call(object, key)) {
                    if (s.required?.includes(key))
                        add(next, 'required');
                }
                else
                    visit(property, object[key], next, depth + 1);
            }
            if (s.additionalProperties === false) {
                for (const key of Object.keys(object)) {
                    if (--budget < 0)
                        break;
                    if (!Object.prototype.hasOwnProperty.call(properties, key)) {
                        add(path, 'additionalProperties');
                        break;
                    }
                }
            }
        }
        else if (s.type === 'array') {
            if (!Array.isArray(v)) {
                add(path, 'type', undefined, 'array');
                return;
            }
            if (s.minItems !== undefined && v.length < s.minItems)
                add(path, 'minItems');
            if (s.maxItems !== undefined && v.length > s.maxItems)
                add(path, 'maxItems');
            if (s.items && !Array.isArray(s.items))
                for (let i = 0; i < v.length && budget > 0 && issues.length < 8; i++)
                    visit(s.items, v[i], path + '/' + i, depth + 1);
        }
        else if (!validValue(s, v)) {
            if (Object.prototype.hasOwnProperty.call(s, 'const'))
                add(path, 'enum', [s.const]);
            else if ((s.type === 'number' || s.type === 'integer') && typeof v === 'number' && Number.isFinite(v)) {
                if (s.type === 'integer' && !Number.isInteger(v))
                    add(path, 'type', undefined, 'integer');
                else if (s.minimum !== undefined && v < s.minimum)
                    add(path, 'minimum');
                else if (s.maximum !== undefined && v > s.maximum)
                    add(path, 'maximum');
                else if (s.exclusiveMinimum !== undefined && v <= s.exclusiveMinimum)
                    add(path, 'exclusiveMinimum');
                else if (s.exclusiveMaximum !== undefined && v >= s.exclusiveMaximum)
                    add(path, 'exclusiveMaximum');
                else if (s.multipleOf !== undefined && v % s.multipleOf !== 0)
                    add(path, 'multipleOf');
                else
                    add(path, 'schema');
            }
            else if (s.type === 'string' && typeof v === 'string')
                add(path, s.minLength !== undefined && v.length < s.minLength ? 'minLength' : s.maxLength !== undefined && v.length > s.maxLength ? 'maxLength' : s.pattern ? 'pattern' : 'schema');
            else
                add(path, 'type', undefined, s.type);
        }
    };
    try {
        visit(schema, value, prefix, 0);
    }
    catch { /* Diagnostics must not replace the original rejection. */ }
    if (issues.length === 0)
        add(prefix, 'schema');
    return issues;
}
export function schemaValidationError(message, schema, value, prefix = '') {
    const issues = safeValidationIssues(schema, value, prefix);
    const summary = issues.slice(0, 2).map(issue => `${issue.path || '/'}: ${issue.rule}`).join('; ');
    return new DetunedError(ErrorCode.VALIDATION_ERROR, `${message} ${summary}`, 400, false, { issues });
}
//# sourceMappingURL=validation-issues.js.map