import { DetunedError, ErrorCode, isNonblankString, SEARCH_LIMITS } from '@detuned/protocol';

export interface ParseIntegerQueryOptions {
  min?: number;
  max?: number;
  defaultValue?: number;
  required?: boolean;
}

export function parseIntegerQuery(
  val: unknown,
  paramName: string,
  options: ParseIntegerQueryOptions = {}
): number | undefined {
  if (val === undefined) {
    if (options.required) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        `缺少必需的查询参数: ${paramName}`,
        400
      );
    }
    return options.defaultValue;
  }

  if (val === null || val === '') {
    throw new DetunedError(
      ErrorCode.VALIDATION_ERROR,
      `查询参数 ${paramName} 必须为合法的整数。`,
      400
    );
  }

  if (Array.isArray(val)) {
    throw new DetunedError(
      ErrorCode.VALIDATION_ERROR,
      `查询参数 ${paramName} 不能重复指定。`,
      400
    );
  }

  if (typeof val !== 'string' && typeof val !== 'number') {
    throw new DetunedError(
      ErrorCode.VALIDATION_ERROR,
      `查询参数 ${paramName} 必须为合法的整数。`,
      400
    );
  }

  const str = String(val).trim();
  // Strictly positive integer digits only: reject '1bad', '1.5', '-1', '0x12', etc.
  if (!/^\d+$/.test(str)) {
    throw new DetunedError(
      ErrorCode.VALIDATION_ERROR,
      `查询参数 ${paramName} 包含非法字符，必须为整数: "${str}"`,
      400
    );
  }

  const num = Number(str);
  if (!Number.isSafeInteger(num)) {
    throw new DetunedError(
      ErrorCode.VALIDATION_ERROR,
      `查询参数 ${paramName} 超出合法整数范围。`,
      400
    );
  }

  if (options.min !== undefined && num < options.min) {
    throw new DetunedError(
      ErrorCode.VALIDATION_ERROR,
      `查询参数 ${paramName} 不能小于 ${options.min}。`,
      400
    );
  }

  if (options.max !== undefined && num > options.max) {
    throw new DetunedError(
      ErrorCode.VALIDATION_ERROR,
      `查询参数 ${paramName} 不能大于 ${options.max}。`,
      400
    );
  }

  return num;
}

export interface ParseStringQueryOptions {
  required?: boolean;
  allowedValues?: string[] | Set<string>;
  defaultValue?: string;
  allowEmpty?: boolean;
}

export function parseStringQuery(
  val: unknown,
  paramName: string,
  options: ParseStringQueryOptions = {}
): string | undefined {
  if (val === undefined) {
    if (options.required) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        `缺少必需的查询参数: ${paramName}`,
        400
      );
    }
    return options.defaultValue;
  }

  if (Array.isArray(val)) {
    throw new DetunedError(
      ErrorCode.VALIDATION_ERROR,
      `查询参数 ${paramName} 不能重复指定。`,
      400
    );
  }

  if (typeof val !== 'string') {
    throw new DetunedError(
      ErrorCode.VALIDATION_ERROR,
      `查询参数 ${paramName} 必须为字符串。`,
      400
    );
  }

  if (!options.allowEmpty && !isNonblankString(val)) {
    throw new DetunedError(
      ErrorCode.VALIDATION_ERROR,
      `查询参数 ${paramName} 不能为空。`,
      400
    );
  }

  if (options.allowedValues) {
    const allowed =
      options.allowedValues instanceof Set
        ? options.allowedValues
        : new Set(options.allowedValues);
    if (!allowed.has(val)) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        `查询参数 ${paramName} 取值非法: "${val}"。`,
        400
      );
    }
  }

  return val;
}

export function parseCsvQuery(
  val: unknown,
  paramName: string
): string[] | undefined {
  if (val === undefined) {
    return undefined;
  }
  if (Array.isArray(val)) {
    throw new DetunedError(
      ErrorCode.VALIDATION_ERROR,
      `查询参数 ${paramName} 不能重复指定，请使用逗号分隔的字符串。`,
      400
    );
  }
  if (typeof val !== 'string') {
    throw new DetunedError(
      ErrorCode.VALIDATION_ERROR,
      `查询参数 ${paramName} 必须为逗号分隔的字符串。`,
      400
    );
  }
  const trimmed = val.trim();
  if (trimmed === '') {
    return [];
  }
  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateAllowedQueryParams(
  query: unknown,
  allowedKeys: string[]
): void {
  if (!query || typeof query !== 'object') return;
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(query)) {
    if (!allowed.has(key)) {
      throw new DetunedError(
        ErrorCode.VALIDATION_ERROR,
        `不支持的查询参数: ${key}`,
        400
      );
    }
  }
}

export function validateNoBody(body: unknown, operationName?: string): void {
  if (body === undefined || body === null) {
    return;
  }
  if (
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).length > 0
  ) {
    throw new DetunedError(
      ErrorCode.VALIDATION_ERROR,
      operationName
        ? `${operationName} 操作不接受请求体参数。`
        : '该操作不接受请求体参数。',
      400
    );
  }
}


// The decoded raw JSON carrier has its own byte budget; core separately checks
// the logical array before deduplication for every entry point.
export function parseSearchTagsJson(val: unknown): string[] | undefined {
  if (val === undefined) return undefined;
  const invalid = () => new DetunedError(ErrorCode.VALIDATION_ERROR, 'tags_json 必须为不超过8192字节的JSON字符串数组，且不能重复指定。', 400, false);
  if (typeof val !== 'string' || new TextEncoder().encode(val).byteLength > SEARCH_LIMITS.tags_json_bytes) throw invalid();
  let parsed: unknown;
  try { parsed = JSON.parse(val); } catch { throw invalid(); }
  if (!Array.isArray(parsed) || parsed.some(tag => typeof tag !== 'string')) throw invalid();
  return parsed;
}
