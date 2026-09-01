import { tokenStore } from "@/lib/auth/token-store";
import { session } from "@/lib/auth/session";
import { networkError, normalizeApiError, type ApiError } from "./errors";

/**
 * All requests go through the Next.js server (see `next.config.ts` rewrites)
 * rather than `NEXT_PUBLIC_API_URL` directly, so the browser never makes a
 * cross-origin call to a backend that sends no CORS headers.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers });
  } catch {
    throw networkError();
  }

  if (!response.ok) {
    const error = await normalizeApiError(response);
    if (response.status === 401) {
      session.expire();
    }
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export type { ApiError };
