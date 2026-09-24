export const auditKeys = {
  all: () => ["audit-logs"] as const,
  list: () => [...auditKeys.all(), "list"] as const,
  authEvents: (filters: { email: string; eventType: string; offset: number }) =>
    [...auditKeys.all(), "auth-events", filters] as const,
};
