import { getAccessToken, session } from "@/lib/auth/session";
import { networkError, normalizeApiError, unexpectedResponseError, type ApiError } from "./errors";

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

export async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const { auth = true, ...requestInit } = init;
  const token = auth ? getAccessToken() : null;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (requestInit.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(path, { ...requestInit, headers });
  } catch {
    throw networkError();
  }

  if (!response.ok) {
    const error = await normalizeApiError(response);
    if (auth && response.status === 401) {
      session.expire();
    }
    throw error;
  }

  if (response.status === 204 || response.headers.get("Content-Length") === "0") {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw unexpectedResponseError();
  }
}

export type { ApiError };
