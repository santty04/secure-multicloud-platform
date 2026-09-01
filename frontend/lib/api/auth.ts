import { apiFetch } from "@/lib/api/client";
import { toCurrentUser } from "@/lib/api/adapters/auth";
import { endpoints } from "@/lib/api/endpoints";
import { unexpectedResponseError } from "@/lib/api/errors";
import { currentUserResponseSchema, tokenResponseSchema, type LoginRequest } from "@/schemas/auth";
import type { CurrentUser } from "@/types/domain";

export async function login(credentials: LoginRequest) {
  const raw = await apiFetch<unknown>(endpoints.login(), {
    method: "POST",
    auth: false,
    body: JSON.stringify(credentials),
  });

  const parsed = tokenResponseSchema.safeParse(raw);
  if (!parsed.success) throw unexpectedResponseError();

  return parsed.data;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const raw = await apiFetch<unknown>(endpoints.me());
  const parsed = currentUserResponseSchema.safeParse(raw);
  if (!parsed.success) throw unexpectedResponseError();

  return toCurrentUser(parsed.data);
}
