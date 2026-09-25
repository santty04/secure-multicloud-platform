import type { CloudProvider } from "@/types/domain";

export const endpoints = {
  login: () => "/api/v1/auth/login",
  loginVerify: () => "/api/v1/auth/login/verify",
  loginResend: () => "/api/v1/auth/login/resend",
  me: () => "/api/v1/auth/me",
  passwordSetupInfo: (token: string) =>
    `/api/v1/auth/set-password/${encodeURIComponent(token)}`,
  setPassword: () => "/api/v1/auth/set-password",

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

  operations: (limit = 100) => `/api/v1/operations?limit=${limit}`,
  operation: (operationId: string) => `/api/v1/operations/${operationId}`,

  auditLogs: (limit = 100) => `/api/v1/audit-logs?limit=${limit}`,

  aiHealth: () => "/api/v1/ai/health",
  infrastructureAdvisor: () => "/api/v1/ai/infrastructure-advisor",

  provisioningRequests: () => "/api/v1/provisioning-requests",
  provisioningRequest: (requestId: string) =>
    `/api/v1/provisioning-requests/${requestId}`,
  approveProvisioningRequest: (requestId: string) =>
    `/api/v1/provisioning-requests/${requestId}/approve`,
  rejectProvisioningRequest: (requestId: string) =>
    `/api/v1/provisioning-requests/${requestId}/reject`,
  executeProvisioningRequest: (requestId: string) =>
    `/api/v1/provisioning-requests/${requestId}/execute`,

  health: () => "/health",
  aiChat: () => "/api/v1/ai/chat",
};
