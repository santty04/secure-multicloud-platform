export const instanceKeys = {
  all: () => ["instances"] as const,
  managed: () => [...instanceKeys.all(), "managed"] as const,
  list: () => instanceKeys.managed(),
  liveAws: () => [...instanceKeys.all(), "aws", "live"] as const,
  status: (provider: string, resourceId: string) =>
    [...instanceKeys.all(), provider, resourceId, "status"] as const,
};
