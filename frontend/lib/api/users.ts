import { z } from "zod";
import { apiFetch } from "./client";
import { unexpectedResponseError } from "./errors";

const userSchema = z.object({
  id: z.string().uuid(), email: z.string().email(), full_name: z.string(),
  is_active: z.boolean(), role_id: z.string().uuid(), role_code: z.string(),
  role_name: z.string(), created_at: z.string(),
});
const roleSchema = z.object({
  id: z.string().uuid(), code: z.string(), name: z.string(),
  description: z.string().nullable(), permissions: z.array(z.string()),
});
export type ManagedUser = z.infer<typeof userSchema>;
export type ManagedRole = z.infer<typeof roleSchema>;
export type UserInput = Pick<ManagedUser, "email" | "full_name" | "role_id" | "is_active">;

function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw unexpectedResponseError();
  return result.data;
}
export async function listUsers(search: string, offset: number) {
  const query = new URLSearchParams({ q: search, offset: String(offset), limit: "25" });
  return parse(z.object({ items: z.array(userSchema), total: z.number() }),
    await apiFetch<unknown>(`/api/v1/users?${query}`));
}
export async function listRoles() {
  return parse(z.array(roleSchema), await apiFetch<unknown>("/api/v1/roles"));
}
export async function saveUser(id: string | undefined, input: UserInput & { password?: string }) {
  return parse(userSchema, await apiFetch<unknown>(id ? `/api/v1/users/${id}` : "/api/v1/users", {
    method: id ? "PUT" : "POST", body: JSON.stringify(input),
  }));
}
export function deactivateUser(id: string) {
  return apiFetch<void>(`/api/v1/users/${id}`, { method: "DELETE" });
}
