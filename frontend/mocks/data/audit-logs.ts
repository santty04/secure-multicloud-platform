import type { AuditLogResponse } from "@/schemas/audit-log";
import { instances } from "./instances";
import { findOperationById } from "./operations";
import { MOCK_USERS } from "./users";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function findInstanceByName(name: string) {
  const instance = instances.find((i) => i.name === name);
  if (!instance) throw new Error(`mock audit-logs: unknown seed instance "${name}"`);
  return instance;
}

function findUserByEmail(email: string) {
  const user = MOCK_USERS.find((u) => u.email === email);
  if (!user) throw new Error(`mock audit-logs: unknown seed user "${email}"`);
  return user;
}

function operationCorrelationId(operationId: string): string {
  const operation = findOperationById(operationId);
  if (!operation) throw new Error(`mock audit-logs: unknown seed operation "${operationId}"`);
  return operation.correlation_id;
}

const vmAppProd = findInstanceByName("vm-app-prod-01");
const vmBatchDev = findInstanceByName("vm-batch-dev-03");
const ec2Legacy = findInstanceByName("ec2-legacy-01");

const ana = findUserByEmail("ana.torres@smp.edu");
const luis = findUserByEmail("l.mendez@smp.edu");
const carla = findUserByEmail("c.rivas@smp.edu");

// Operation ids seeded in ./operations.ts, referenced here so a couple of
// audit entries can share a real correlation id with a real operation (the
// drawer's "trace this correlation ID" flow).
const OP_STOP_EC2_CACHE = "c3000000-0000-4000-8000-000000000001";
const OP_START_VM_BASTION = "c3000000-0000-4000-8000-000000000002";
const OP_DELETE_VM_BATCH_DEV = "c3000000-0000-4000-8000-000000000004";
const OP_STOP_VM_BATCH_DEV = "c3000000-0000-4000-8000-000000000005";
const OP_START_EC2_LEGACY = "c3000000-0000-4000-8000-000000000006";
const OP_START_EC2_WEB_PROD = "c3000000-0000-4000-8000-000000000007";
const OP_STOP_EC2_CACHE_PENDING = "c3000000-0000-4000-8000-000000000008";

const SEED_AUDIT_LOGS: AuditLogResponse[] = [
  {
    id: "d4000000-0000-4000-8000-000000000001",
    correlation_id: operationCorrelationId(OP_STOP_EC2_CACHE),
    operation_id: OP_STOP_EC2_CACHE,
    user_id: luis.id,
    resource_id: findInstanceByName("ec2-cache-stage-01").id,
    provider: "aws",
    action: "stop",
    decision: "allowed",
    reason_code: "permission_granted",
    required_permission: "vm.stop",
    role_code: luis.role_code,
    event_type: "operation_success",
    http_method: "POST",
    request_path: `/api/v1/instances/aws/${findInstanceByName("ec2-cache-stage-01").id}/stop`,
    details: null,
    created_at: hoursAgo(0.3),
  },
  {
    id: "d4000000-0000-4000-8000-000000000002",
    correlation_id: "d5c0e000-2222-4222-8222-000000000002",
    operation_id: null,
    user_id: ana.id,
    resource_id: vmAppProd.id,
    provider: "azure",
    action: "delete",
    decision: "denied",
    reason_code: "permission_denied",
    required_permission: "vm.delete",
    role_code: ana.role_code,
    event_type: "authorization",
    http_method: "DELETE",
    request_path: `/api/v1/instances/azure/${vmAppProd.id}`,
    details: null,
    created_at: hoursAgo(9),
  },
  {
    id: "d4000000-0000-4000-8000-000000000003",
    correlation_id: operationCorrelationId(OP_START_VM_BASTION),
    operation_id: OP_START_VM_BASTION,
    user_id: luis.id,
    resource_id: findInstanceByName("vm-bastion-01").id,
    provider: "azure",
    action: "start",
    decision: "allowed",
    reason_code: "permission_granted",
    required_permission: "vm.start",
    role_code: luis.role_code,
    event_type: "operation_success",
    http_method: "POST",
    request_path: `/api/v1/instances/azure/${findInstanceByName("vm-bastion-01").id}/start`,
    details: null,
    created_at: hoursAgo(24),
  },
  {
    id: "d4000000-0000-4000-8000-000000000004",
    correlation_id: operationCorrelationId(OP_DELETE_VM_BATCH_DEV),
    operation_id: OP_DELETE_VM_BATCH_DEV,
    user_id: carla.id,
    resource_id: vmBatchDev.id,
    provider: "azure",
    action: "delete",
    decision: "allowed",
    reason_code: "cloud_operation_failed",
    required_permission: "vm.delete",
    role_code: carla.role_code,
    event_type: "operation_failure",
    http_method: "DELETE",
    request_path: `/api/v1/instances/azure/${vmBatchDev.id}`,
    details: {
      error_code: "AuthorizationFailed",
      error_message:
        "AuthorizationFailed: la Managed Identity no tiene permiso Microsoft.Compute/virtualMachines/delete en el scope rg-dev.",
    },
    created_at: hoursAgo(45.99),
  },
  {
    id: "d4000000-0000-4000-8000-000000000005",
    correlation_id: operationCorrelationId(OP_STOP_VM_BATCH_DEV),
    operation_id: OP_STOP_VM_BATCH_DEV,
    user_id: luis.id,
    resource_id: vmBatchDev.id,
    provider: "azure",
    action: "stop",
    decision: "allowed",
    reason_code: "cloud_operation_succeeded",
    required_permission: "vm.stop",
    role_code: luis.role_code,
    event_type: "operation_success",
    http_method: "POST",
    request_path: `/api/v1/instances/azure/${vmBatchDev.id}/stop`,
    details: null,
    created_at: hoursAgo(69.98),
  },
  {
    id: "d4000000-0000-4000-8000-000000000006",
    correlation_id: "d5c0e000-2222-4222-8222-000000000006",
    operation_id: null,
    user_id: ana.id,
    resource_id: ec2Legacy.id,
    provider: "aws",
    action: "start",
    decision: "denied",
    reason_code: "permission_denied",
    required_permission: "vm.start",
    role_code: ana.role_code,
    event_type: "authorization",
    http_method: "POST",
    request_path: `/api/v1/instances/aws/${ec2Legacy.id}/start`,
    details: null,
    created_at: hoursAgo(96),
  },
  {
    id: "d4000000-0000-4000-8000-000000000007",
    correlation_id: operationCorrelationId(OP_START_EC2_LEGACY),
    operation_id: OP_START_EC2_LEGACY,
    user_id: luis.id,
    resource_id: ec2Legacy.id,
    provider: "aws",
    action: "start",
    decision: "allowed",
    reason_code: "cloud_operation_failed",
    required_permission: "vm.start",
    role_code: luis.role_code,
    event_type: "operation_failure",
    http_method: "POST",
    request_path: `/api/v1/instances/aws/${ec2Legacy.id}/start`,
    details: {
      error_code: "InsufficientInstanceCapacity",
      error_message:
        "InsufficientInstanceCapacity: la zona us-east-2b no tiene capacidad disponible para el tipo de instancia m5.large.",
    },
    created_at: hoursAgo(95.99),
  },
  {
    id: "d4000000-0000-4000-8000-000000000008",
    correlation_id: operationCorrelationId(OP_START_EC2_WEB_PROD),
    operation_id: OP_START_EC2_WEB_PROD,
    user_id: carla.id,
    resource_id: findInstanceByName("ec2-web-prod-01").id,
    provider: "aws",
    action: "start",
    decision: "allowed",
    reason_code: "permission_granted",
    required_permission: "vm.start",
    role_code: carla.role_code,
    event_type: "operation_success",
    http_method: "POST",
    request_path: `/api/v1/instances/aws/${findInstanceByName("ec2-web-prod-01").id}/start`,
    details: null,
    created_at: hoursAgo(119.97),
  },
  {
    id: "d4000000-0000-4000-8000-000000000009",
    correlation_id: operationCorrelationId(OP_STOP_EC2_CACHE_PENDING),
    operation_id: OP_STOP_EC2_CACHE_PENDING,
    user_id: luis.id,
    resource_id: findInstanceByName("ec2-cache-stage-01").id,
    provider: "aws",
    action: "stop",
    decision: "allowed",
    reason_code: "permission_granted",
    required_permission: "vm.stop",
    role_code: luis.role_code,
    event_type: "authorization",
    http_method: "POST",
    request_path: `/api/v1/instances/aws/${findInstanceByName("ec2-cache-stage-01").id}/stop`,
    details: null,
    created_at: hoursAgo(0.02),
  },
  {
    id: "d4000000-0000-4000-8000-000000000010",
    correlation_id: "d5c0e000-2222-4222-8222-000000000010",
    operation_id: null,
    user_id: luis.id,
    resource_id: ec2Legacy.id,
    provider: "aws",
    action: "delete",
    decision: "denied",
    reason_code: "permission_denied",
    required_permission: "vm.delete",
    role_code: luis.role_code,
    event_type: "authorization",
    http_method: "DELETE",
    request_path: `/api/v1/instances/aws/${ec2Legacy.id}`,
    details: null,
    created_at: hoursAgo(130),
  },
];

/** In-memory audit log — new entries are prepended by every mocked auth/instance-action request. */
export let auditLogs: AuditLogResponse[] = [...SEED_AUDIT_LOGS].sort(
  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
);

export function getAuditLogs(): AuditLogResponse[] {
  return auditLogs;
}

export function addAuditLog(log: AuditLogResponse): void {
  auditLogs = [log, ...auditLogs];
}
