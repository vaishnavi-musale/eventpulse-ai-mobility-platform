// §32 — Result type for domain operations
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T>(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): Result<T> {
  return { ok: false, error: { code, message, details } };
}

export function isOk<T>(result: Result<T>): result is { ok: true; value: T } {
  return result.ok;
}

export function unwrapOr<T>(result: Result<T>, fallback: T): T {
  return result.ok ? result.value : fallback;
}
