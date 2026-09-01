export type CloudProvider = "azure" | "aws";

export type OperationAction = "create" | "read" | "start" | "stop" | "update" | "delete";
export type OperationStatus = "pending" | "success" | "failed";
export type AuditDecision = "allowed" | "denied";

/**
 * `roleCode`/`roleName` and `permissions` come straight from
 * `GET /api/v1/auth/me` — the backend is the only source of truth for RBAC,
 * there is no static role table on the frontend.
 */
export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roleCode: string;
  roleName: string;
  permissions: string[];
}

export interface Instance {
  id: string;
  name: string;
  provider: CloudProvider;
  resourceType: string;
  region: string;
  environment: string;
  /** Free-form, DB-persisted status — the backend does not constrain this to a fixed enum. */
  status: string;
  isManaged: boolean;
}

export interface InstanceActionResult {
  resourceId: string;
  provider: CloudProvider;
  action: "start" | "stop" | "delete";
  /** "success" when a real cloud write ran, "simulated" when that provider's writes are disabled backend-side. */
  status: "success" | "simulated";
  requestedBy: string;
}

export interface Operation {
  id: string;
  correlationId: string;
  userId: string | null;
  resourceId: string | null;
  provider: CloudProvider;
  action: OperationAction;
  requiredPermission: string;
  status: OperationStatus;
  resultSummary: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  requestedAt: Date;
  completedAt: Date | null;
}

export interface AuditLog {
  id: string;
  correlationId: string;
  operationId: string | null;
  userId: string | null;
  resourceId: string | null;
  provider: CloudProvider;
  action: OperationAction;
  decision: AuditDecision;
  reasonCode: string;
  requiredPermission: string;
  roleCode: string | null;
  eventType: string;
  httpMethod: string | null;
  requestPath: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}
