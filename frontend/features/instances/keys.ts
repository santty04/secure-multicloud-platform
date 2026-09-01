export const instanceKeys = {
  all: () => ["instances"] as const,
  list: () => [...instanceKeys.all(), "list"] as const,
};
