export const auditKeys = {
  all: () => ["audit-logs"] as const,
  list: () => [...auditKeys.all(), "list"] as const,
};
