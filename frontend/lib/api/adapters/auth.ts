import type { CurrentUserResponse } from "@/schemas/auth";
import type { CurrentUser } from "@/types/domain";

export function toCurrentUser(raw: CurrentUserResponse): CurrentUser {
  return {
    id: raw.id,
    email: raw.email,
    fullName: raw.full_name,
    isActive: raw.is_active,
    roleCode: raw.role_code,
    roleName: raw.role_name,
    permissions: raw.permissions,
  };
}
