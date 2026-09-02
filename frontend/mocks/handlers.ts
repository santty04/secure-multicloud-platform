import { http, HttpResponse } from "msw";
import { loginRequestSchema, type TokenResponse } from "@/schemas/auth";
import type { InstanceActionResponse, InstanceStatusResponse, LiveAwsInstanceSummaryResponse } from "@/schemas/instance";
import type { OperationResponse } from "@/schemas/operation";
import type { AuditLogResponse } from "@/schemas/audit-log";
import type { CloudProvider } from "@/types/domain";
import {
  findUserByCredentials,
  findUserById,
  toCurrentUserResponse,
  type MockUser,
} from "./data/users";
import {
  findInstance,
  getInstances,
  removeInstance,
  setInstanceStatus,
} from "./data/instances";
import { addOperation, findOperationById, getOperations } from "./data/operations";
import { addAuditLog, getAuditLogs } from "./data/audit-logs";

/** `token -> userId`. Reset on every page load, same as the real backend's token expiry model would feel like for a demo. */
const sessions = new Map<string, string>();

function isCloudProvider(value: string): value is CloudProvider {
  return value === "azure" || value === "aws";
}

/** Builds the `{ error: { code, message, correlation_id } }` envelope every 4xx/5xx uses, plus the `X-Correlation-ID` header. */
function errorResponse(status: number, code: string, message: string, correlationId = crypto.randomUUID()) {
  return HttpResponse.json(
    { error: { code, message, correlation_id: correlationId } },
    { status, headers: { "X-Correlation-ID": correlationId } },
  );
}

function unauthorized() {
  return errorResponse(401, "http_error", "Invalid or expired authentication credentials.");
}

function getAuthedUser(request: Request): MockUser | null {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  const userId = sessions.get(token);
  if (!userId) return null;
  return findUserById(userId) ?? null;
}

/** Logs a `permission_denied` audit entry for a resource-scoped action, mirroring `require_permission` on the real backend. */
function logPermissionDenied(params: {
  user: MockUser;
  provider: CloudProvider;
  resourceId: string;
  action: "start" | "stop" | "delete";
  requiredPermission: string;
  request: Request;
  correlationId: string;
}): void {
  const entry: AuditLogResponse = {
    id: crypto.randomUUID(),
    correlation_id: params.correlationId,
    operation_id: null,
    user_id: params.user.id,
    resource_id: params.resourceId,
    provider: params.provider,
    action: params.action,
    decision: "denied",
    reason_code: "permission_denied",
    required_permission: params.requiredPermission,
    role_code: params.user.role_code,
    event_type: "authorization",
    http_method: params.request.method,
    request_path: new URL(params.request.url).pathname,
    details: null,
    created_at: new Date().toISOString(),
  };
  addAuditLog(entry);
}

async function handleInstanceAction(
  request: Request,
  provider: string,
  resourceId: string,
  action: "start" | "stop" | "delete",
  requiredPermission: string,
) {
  const user = getAuthedUser(request);
  if (!user) return unauthorized();

  if (!isCloudProvider(provider)) {
    return errorResponse(404, "http_error", "El recurso solicitado no existe o ya no está administrado por la plataforma.");
  }

  if (!user.permissions.includes(requiredPermission)) {
    const correlationId = crypto.randomUUID();
    logPermissionDenied({ user, provider, resourceId, action, requiredPermission, request, correlationId });
    return errorResponse(403, "http_error", "Insufficient permissions.", correlationId);
  }

  const instance = findInstance(provider, resourceId);
  if (!instance) {
    return errorResponse(404, "http_error", "El recurso solicitado no existe o ya no está administrado por la plataforma.");
  }

  const correlationId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const previousStatus = instance.status;

  if (action === "delete") {
    removeInstance(resourceId);
  } else {
    setInstanceStatus(resourceId, action === "start" ? "running" : "stopped");
  }

  const operation: OperationResponse = {
    id: operationId,
    correlation_id: correlationId,
    user_id: user.id,
    resource_id: resourceId,
    provider,
    action,
    required_permission: requiredPermission,
    status: "success",
    result_summary: { instance_name: instance.name, previous_status: previousStatus },
    error_code: null,
    error_message: null,
    requested_at: now,
    completed_at: now,
  };
  addOperation(operation);

  const auditLog: AuditLogResponse = {
    id: crypto.randomUUID(),
    correlation_id: correlationId,
    operation_id: operationId,
    user_id: user.id,
    resource_id: resourceId,
    provider,
    action,
    decision: "allowed",
    reason_code: "permission_granted",
    required_permission: requiredPermission,
    role_code: user.role_code,
    event_type: "operation_success",
    http_method: request.method,
    request_path: new URL(request.url).pathname,
    details: null,
    created_at: now,
  };
  addAuditLog(auditLog);

  const response: InstanceActionResponse = {
    resource_id: resourceId,
    provider,
    action,
    status: "success",
    requested_by: user.email,
  };
  return HttpResponse.json(response);
}

export const handlers = [
  http.post("/api/v1/auth/login", async ({ request }) => {
    const json = await request.json().catch(() => null);
    const parsed = loginRequestSchema.safeParse(json);
    if (!parsed.success) {
      return errorResponse(401, "http_error", "Invalid email or password.");
    }

    const user = findUserByCredentials(parsed.data.email, parsed.data.password);
    if (!user) {
      return errorResponse(401, "http_error", "Invalid email or password.");
    }

    const token = `mock.${user.id}.${Date.now()}`;
    sessions.set(token, user.id);

    const response: TokenResponse = { access_token: token, token_type: "bearer" };
    return HttpResponse.json(response);
  }),

  http.get("/api/v1/auth/me", ({ request }) => {
    const user = getAuthedUser(request);
    if (!user) return unauthorized();
    return HttpResponse.json(toCurrentUserResponse(user));
  }),

  http.get("/api/v1/instances", ({ request }) => {
    const user = getAuthedUser(request);
    if (!user) return unauthorized();
    if (!user.permissions.includes("vm.read")) {
      return errorResponse(403, "http_error", "Insufficient permissions.");
    }
    return HttpResponse.json(getInstances());
  }),

  http.get("/api/v1/instances/aws/live", ({ request }) => {
    const user = getAuthedUser(request);
    if (!user) return unauthorized();
    if (!user.permissions.includes("vm.read")) {
      return errorResponse(403, "http_error", "Insufficient permissions.");
    }
    const liveAws: LiveAwsInstanceSummaryResponse[] = [
      {
        instance_id: "i-0b200000000000001",
        name: "ec2-web-prod-01",
        state: "running",
        instance_type: "t3.micro",
        private_ip: "10.0.1.14",
        provider: "aws",
        region: "us-east-1",
      },
      {
        instance_id: "i-0b200000000000002",
        name: "ec2-unregistered-01",
        state: "stopped",
        instance_type: "t3.small",
        private_ip: null,
        provider: "aws",
        region: "us-east-1",
      },
    ];
    return HttpResponse.json(liveAws);
  }),

  http.get("/api/v1/instances/:provider/:resourceId/status", ({ request, params }) => {
    const user = getAuthedUser(request);
    if (!user) return unauthorized();
    if (!user.permissions.includes("vm.read")) {
      return errorResponse(403, "http_error", "Insufficient permissions.");
    }

    const provider = String(params.provider);
    const resourceId = String(params.resourceId);
    if (!isCloudProvider(provider)) {
      return errorResponse(422, "http_error", "La solicitud contiene datos inválidos.");
    }

    const instance = findInstance(provider, resourceId);
    if (!instance || !instance.is_managed) {
      return errorResponse(404, "http_error", "El recurso solicitado no existe o ya no está administrado por la plataforma.");
    }

    const response: InstanceStatusResponse = {
      resource_id: instance.id,
      provider: instance.provider,
      name: instance.name,
      status: instance.status,
    };
    return HttpResponse.json(response);
  }),

  http.post("/api/v1/instances/:provider/:resourceId/start", ({ request, params }) =>
    handleInstanceAction(request, String(params.provider), String(params.resourceId), "start", "vm.start"),
  ),

  http.post("/api/v1/instances/:provider/:resourceId/stop", ({ request, params }) =>
    handleInstanceAction(request, String(params.provider), String(params.resourceId), "stop", "vm.stop"),
  ),

  http.delete("/api/v1/instances/:provider/:resourceId", ({ request, params }) =>
    handleInstanceAction(request, String(params.provider), String(params.resourceId), "delete", "vm.delete"),
  ),

  http.get("/api/v1/operations", ({ request }) => {
    const user = getAuthedUser(request);
    if (!user) return unauthorized();
    if (!user.permissions.includes("operation.read")) {
      return errorResponse(403, "http_error", "Insufficient permissions.");
    }
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "50") || 50;
    const sorted = [...getOperations()].sort(
      (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime(),
    );
    return HttpResponse.json(sorted.slice(0, limit));
  }),

  http.get("/api/v1/operations/:id", ({ request, params }) => {
    const user = getAuthedUser(request);
    if (!user) return unauthorized();
    if (!user.permissions.includes("operation.read")) {
      return errorResponse(403, "http_error", "Insufficient permissions.");
    }
    const operation = findOperationById(String(params.id));
    if (!operation) {
      return errorResponse(404, "http_error", "El recurso solicitado no existe o ya no está administrado por la plataforma.");
    }
    return HttpResponse.json(operation);
  }),

  http.get("/api/v1/audit-logs", ({ request }) => {
    const user = getAuthedUser(request);
    if (!user) return unauthorized();
    if (!user.permissions.includes("operation.read")) {
      return errorResponse(403, "http_error", "Insufficient permissions.");
    }
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "50") || 50;
    const sorted = [...getAuditLogs()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    return HttpResponse.json(sorted.slice(0, limit));
  }),

  http.get("/health", () => HttpResponse.json({ status: "ok" })),
];
