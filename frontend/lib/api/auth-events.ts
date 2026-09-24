import { z } from "zod";
import { apiFetch } from "./client";
import { unexpectedResponseError } from "./errors";

/** `AuthEventResponse` — GET /api/v1/auth-events (requires `user.manage`). */
const authEventSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string(),
  email: z.string(),
  user_id: z.string().uuid().nullable(),
  correlation_id: z.string().uuid().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  details: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
});
const authEventPageSchema = z.object({ items: z.array(authEventSchema), total: z.number() });

export type AuthEvent = z.infer<typeof authEventSchema>;
export const AUTH_EVENTS_PAGE_SIZE = 25;

export async function listAuthEvents(filters: { email: string; eventType: string; offset: number }) {
  const query = new URLSearchParams({ limit: String(AUTH_EVENTS_PAGE_SIZE), offset: String(filters.offset) });
  if (filters.email) query.set("email", filters.email);
  if (filters.eventType) query.set("event_type", filters.eventType);

  const parsed = authEventPageSchema.safeParse(await apiFetch<unknown>(`/api/v1/auth-events?${query}`));
  if (!parsed.success) throw unexpectedResponseError();
  return parsed.data;
}
