import type { CurrentUserResponse } from "@/schemas/auth";
import type { CloudAccess, CurrentUser } from "@/types/domain";

export function toCurrentUser(raw: CurrentUserResponse): CurrentUser {
  return {
    id: raw.id,
    email: raw.email,
    fullName: raw.full_name,
    isActive: raw.is_active,
    roleCode: raw.role_code,
    roleName: raw.role_name,
    permissions: raw.permissions,
    cloudAccess: {
      azure: toCloudAccess(raw.cloud_access.azure),
      aws: toCloudAccess(raw.cloud_access.aws),
    },
  };
}

function toCloudAccess(raw: CurrentUserResponse["cloud_access"]["aws"]): CloudAccess | null {
  return raw ? { roleCode: raw.role_code, roleName: raw.role_name, permissions: raw.permissions } : null;
}
