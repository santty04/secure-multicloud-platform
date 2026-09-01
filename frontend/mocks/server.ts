import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * Node-side MSW server for future test usage (e.g. Vitest). Not wired to any
 * test runner yet — this repo has none configured.
 */
export const server = setupServer(...handlers);
