import type { CloudProvider } from "@/types/domain";

/** Path builders for the FastAPI backend — see HANDOFF.md §4 / §9 for the confirmed contract. */
export const endpoints = {
  login: () => "/api/v1/auth/login",
  me: () => "/api/v1/auth/me",

  instances: () => "/api/v1/instances",
  createAwsInstance: () => "/api/v1/instances/aws",
  createAzureInstance: () => "/api/v1/instances/azure",
  liveAwsInstances: () => "/api/v1/instances/aws/live",
  instanceStatus: (provider: CloudProvider, resourceId: string) =>
    `/api/v1/instances/${provider}/${resourceId}/status`,
  instanceStart: (provider: CloudProvider, resourceId: string) =>
    `/api/v1/instances/${provider}/${resourceId}/start`,
  instanceStop: (provider: CloudProvider, resourceId: string) =>
    `/api/v1/instances/${provider}/${resourceId}/stop`,
  instanceDelete: (provider: CloudProvider, resourceId: string) =>
    `/api/v1/instances/${provider}/${resourceId}`,

  /** `limit` is the only server-side query param the backend supports — no offset, no filters. */
  operations: (limit = 100) => `/api/v1/operations?limit=${limit}`,
  operation: (operationId: string) => `/api/v1/operations/${operationId}`,

  auditLogs: (limit = 100) => `/api/v1/audit-logs?limit=${limit}`,

  health: () => "/health",
};
