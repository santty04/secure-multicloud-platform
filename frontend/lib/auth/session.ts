import { tokenStore } from "./token-store";

/**
 * Session expiry is a cross-cutting concern (any 401 from `apiFetch` should
 * end the session and bounce to /login) but only React code triggers actual
 * navigation. This tiny pub/sub lets `lib/api/client.ts` — which cannot use
 * `useRouter` — announce "the session is gone" without importing React.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export const session = {
  expire(): void {
    tokenStore.clear();
    listeners.forEach((fn) => fn());
  },
  onExpire(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
