export const operationKeys = {
  all: () => ["operations"] as const,
  list: () => [...operationKeys.all(), "list"] as const,
  detail: (id: string) => [...operationKeys.all(), "detail", id] as const,
};
