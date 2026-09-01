"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { auditLogListResponseSchema } from "@/schemas/audit-log";
import { toAuditLog } from "@/lib/api/adapters/audit-log";
import { auditKeys } from "./keys";

/**
 * Read-only, matching the backend: there is no write path for audit logs
 * from the frontend. `?limit=` is the only server-side param — result,
 * user, and provider filters are applied on the client.
 */
export function useAuditLogs() {
  return useQuery({
    queryKey: auditKeys.list(),
    queryFn: async () => {
      const raw = await apiFetch<unknown>(endpoints.auditLogs());
      return auditLogListResponseSchema.parse(raw).map(toAuditLog);
    },
  });
}
