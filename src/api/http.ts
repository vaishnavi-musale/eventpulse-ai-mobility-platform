/** Lightweight HTTP client for the EventPulse backend (§35). */
const importMeta = import.meta as unknown as { env?: Record<string, string | undefined> };

export const API_BASE_URL =
  importMeta.env?.VITE_API_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";

export const API_KEY =
  importMeta.env?.VITE_API_KEY ?? "change-me-in-prod";

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 6000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        ...(init.headers ?? {}),
      },
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const message =
        (body.message as string | string[] | undefined) ??
        (body.error as string | undefined) ??
        `${res.status} ${res.statusText}`.trim();
      throw new ApiError(res.status, Array.isArray(message) ? message.join(" · ") : message);
    }
    return body as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(0, "Request timed out");
    }
    throw new ApiError(0, "Backend unreachable");
  } finally {
    clearTimeout(timer);
  }
}