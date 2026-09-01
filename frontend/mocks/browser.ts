import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

// `worker.start()` is not idempotent — calling it twice throws ("cannot
// configure an already enabled network"). React runs effects twice in dev
// (Strict Mode) and Fast Refresh can re-run them again later, so
// `app/providers.tsx` must never call `worker.start()` directly — this
// memoized wrapper makes every caller share the same in-flight/completed
// start, no matter how many times it's invoked.
// A page loaded before the service worker existed/activated is never
// "controlled" by it (a documented SW gotcha, unaffected by clients.claim())
// — every fetch from that page silently bypasses mocking, network errors
// included, with no error MSW can surface. Reload once, guarded against a
// loop, so mocking works from a cold start without a manual refresh.
const RELOAD_GUARD_KEY = "smp.msw-reloaded";

let startPromise: ReturnType<typeof worker.start> | undefined;
export function startWorker(): ReturnType<typeof worker.start> {
  if (!startPromise) {
    startPromise = worker.start({ onUnhandledRequest: "bypass" }).then((registration) => {
      if (!navigator.serviceWorker.controller && !sessionStorage.getItem(RELOAD_GUARD_KEY)) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
        location.reload();
        return new Promise<typeof registration>(() => {}); // page is reloading, never resolve
      }
      return registration;
    });
  }
  return startPromise;
}
