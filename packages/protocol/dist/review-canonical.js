export class ReviewCanonicalizationError extends Error {
    reason;
    constructor(reason) {
        super('Review canonical JSON is invalid or exceeds its fixed limits.');
        this.reason = reason;
        this.name = 'ReviewCanonicalizationError';
    }
}
const MAX_BYTES = 262144;
const MAX_DEPTH = 64;
const MAX_NODES = 20000;
const encoder = new TextEncoder();
export function canonicalizeReviewJson(value) {
    const parts = [];
    const ancestors = new Set();
    let bytes = 0;
    let nodes = 0;
    const fail = (reason) => { throw new ReviewCanonicalizationError(reason); };
    const emit = (text) => {
        bytes += encoder.encode(text).byteLength;
        if (bytes > MAX_BYTES)
            fail('max_bytes');
        parts.push(text);
    };
    const string = (text) => {
        // UTF-16 code units alone already exceed the UTF-8/output bound in this case.
        if (text.length > MAX_BYTES)
            fail('max_bytes');
        for (let i = 0; i < text.length; i++) {
            const unit = text.charCodeAt(i);
            if (unit >= 0xd800 && unit <= 0xdbff) {
                const next = text.charCodeAt(++i);
                if (!(next >= 0xdc00 && next <= 0xdfff))
                    fail('invalid_json');
            }
            else if (unit >= 0xdc00 && unit <= 0xdfff)
                fail('invalid_json');
        }
        return JSON.stringify(text);
    };
    const dataDescriptor = (object, key) => {
        const descriptor = Object.getOwnPropertyDescriptor(object, key);
        if (!descriptor)
            return fail('invalid_json');
        if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value'))
            fail('invalid_json');
        return descriptor;
    };
    const visit = (item, depth) => {
        if (depth > MAX_DEPTH)
            fail('max_depth');
        if (++nodes > MAX_NODES)
            fail('max_nodes');
        if (item === null) {
            emit('null');
            return;
        }
        switch (typeof item) {
            case 'boolean':
                emit(item ? 'true' : 'false');
                return;
            case 'number':
                if (!Number.isFinite(item))
                    fail('invalid_json');
                emit(JSON.stringify(item));
                return;
            case 'string':
                emit(string(item));
                return;
            case 'object': break;
            default: fail('invalid_json');
        }
        const object = item;
        if (ancestors.has(object) || Object.getOwnPropertySymbols(object).length !== 0)
            fail('invalid_json');
        const array = Array.isArray(object);
        const prototype = Object.getPrototypeOf(object);
        if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null)
            fail('invalid_json');
        ancestors.add(object);
        try {
            const keys = Object.getOwnPropertyNames(object);
            if (array) {
                const lengthDescriptor = Object.getOwnPropertyDescriptor(object, 'length');
                if (!lengthDescriptor)
                    return fail('invalid_json');
                if (!Object.prototype.hasOwnProperty.call(lengthDescriptor, 'value'))
                    fail('invalid_json');
                const length = lengthDescriptor.value;
                if (length > MAX_NODES - nodes)
                    fail('max_nodes');
                if (keys.length !== length + 1)
                    fail('invalid_json');
                // Validate the entire shape before emitting; never read accessors.
                for (let i = 0; i < length; i++)
                    dataDescriptor(object, String(i));
                emit('[');
                for (let i = 0; i < length; i++) {
                    if (i)
                        emit(',');
                    visit(dataDescriptor(object, String(i)).value, depth + 1);
                }
                emit(']');
            }
            else {
                if (keys.length > MAX_NODES - nodes)
                    fail('max_nodes');
                for (const key of keys) {
                    string(key);
                    dataDescriptor(object, key);
                }
                // ECMAScript default sort compares raw UTF-16 code units; numeric-looking keys stay lexicographic.
                keys.sort();
                emit('{');
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    if (i)
                        emit(',');
                    emit(string(key));
                    emit(':');
                    visit(dataDescriptor(object, key).value, depth + 1);
                }
                emit('}');
            }
        }
        finally {
            ancestors.delete(object);
        }
    };
    try {
        visit(value, 0);
    }
    catch (error) {
        if (error instanceof ReviewCanonicalizationError)
            throw error;
        // Reflective host/Proxy failures never expose input or native exception messages.
        fail('invalid_json');
    }
    return parts.join('');
}
//# sourceMappingURL=review-canonical.js.map