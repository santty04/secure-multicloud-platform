import type { ApiError } from "@/lib/api/errors";

/**
 * `apiFetch` always throws a plain `ApiError`, never a generic `Error` — this
 * tells TanStack Query's types that by default, so `useQuery()`/`useMutation()`
 * `error` fields are `ApiError | null` everywhere without every call site
 * needing an explicit `<Data, ApiError>` generic or a cast.
 * https://tanstack.com/query/latest/docs/framework/react/typescript#registering-a-default-error-type
 */
declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
  }
}
