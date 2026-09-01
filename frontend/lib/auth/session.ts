const STORAGE_KEY = "smp.access_token";

type Listener = () => void;
const listeners = new Set<Listener>();
const tokenListeners = new Set<Listener>();

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, token);
    tokenListeners.forEach((fn) => fn());
  } catch {
    // Storage can fail in locked-down browsing contexts.
  }
}

export function clearAccessToken(): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    tokenListeners.forEach((fn) => fn());
  } catch {
    // Clearing is best-effort when storage is unavailable.
  }
}

export function hasAccessToken(): boolean {
  return Boolean(getAccessToken());
}

export function subscribeToAccessToken(fn: Listener): () => void {
  tokenListeners.add(fn);
  return () => tokenListeners.delete(fn);
}

/**
 * Session expiry is a cross-cutting concern (any protected 401 from `apiFetch`
 * should end the session and bounce to /login) but only React code triggers
 * navigation. This pub/sub keeps storage, fetching, and routing separated.
 */
export const session = {
  expire(): void {
    clearAccessToken();
    listeners.forEach((fn) => fn());
  },
  onExpire(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
