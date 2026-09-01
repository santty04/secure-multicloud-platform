/**
 * Single choke point for reading/writing the access token.
 *
 * Today: sessionStorage (token disappears when the tab closes, never
 * persisted to disk). Tomorrow: an HttpOnly cookie set by the backend —
 * callers never touch storage directly, so that swap doesn't ripple out.
 */
const STORAGE_KEY = "smp.access_token";

function isBrowser() {
  return typeof window !== "undefined";
}

export const tokenStore = {
  get(): string | null {
    if (!isBrowser()) return null;
    try {
      return window.sessionStorage.getItem(STORAGE_KEY);
    } catch {
      // sessionStorage can throw in locked-down/private browsing contexts.
      return null;
    }
  },
  set(token: string): void {
    if (!isBrowser()) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, token);
    } catch {
      // ignore — worst case the session doesn't survive a refresh
    }
  },
  clear(): void {
    if (!isBrowser()) return;
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
