/**
 * Client-side JWT payload decode — for display only ("session expires in
 * 12 min"), never for trust/authorization decisions. We only read the
 * `exp`/`iat` claims that `create_access_token` (backend) sets; there is no
 * signature verification here, nor should there be — the backend is the
 * only party that verifies the token.
 */
export function decodeJwtExpiry(token: string): Date | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof json.exp !== "number") return null;
    return new Date(json.exp * 1000);
  } catch {
    return null;
  }
}
