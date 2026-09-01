import type { OperationResponse } from "@/schemas/operation";
import { instances } from "./instances";
import { MOCK_USERS } from "./users";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function findInstanceByName(name: string) {
  const instance = instances.find((i) => i.name === name);
  if (!instance) throw new Error(`mock operations: unknown seed instance "${name}"`);
  return instance;
}

function findUserByEmail(email: string) {
  const user = MOCK_USERS.find((u) => u.email === email);
  if (!user) throw new Error(`mock operations: unknown seed user "${email}"`);
  return user;
}

const vmBastion = findInstanceByName("vm-bastion-01");
const vmBatchDev = findInstanceByName("vm-batch-dev-03");
const ec2CacheStage = findInstanceByName("ec2-cache-stage-01");
const ec2MlDev = findInstanceByName("ec2-ml-dev-04");
const ec2Legacy = findInstanceByName("ec2-legacy-01");
const ec2WebProd = findInstanceByName("ec2-web-prod-01");

// Ana (viewer) has no `vm.*` action permissions, so no operation in this
// seed set is attributed to her — see audit-logs.ts for her denied attempts.
const luis = findUserByEmail("l.mendez@smp.edu");
const carla = findUserByEmail("c.rivas@smp.edu");

const SEED_OPERATIONS: OperationResponse[] = [
  {
    id: "c3000000-0000-4000-8000-000000000001",
    correlation_id: "c1a1e000-1111-4111-8111-000000000001",
    user_id: luis.id,
    resource_id: ec2CacheStage.id,
    provider: "aws",
    action: "stop",
    required_permission: "vm.stop",
    status: "success",
    result_summary: { previous_status: "running", new_status: "stopped" },
    error_code: null,
    error_message: null,
    requested_at: hoursAgo(0.3),
    completed_at: hoursAgo(0.28),
  },
  {
    id: "c3000000-0000-4000-8000-000000000002",
    correlation_id: "c1a1e000-1111-4111-8111-000000000002",
    user_id: luis.id,
    resource_id: vmBastion.id,
    provider: "azure",
    action: "start",
    required_permission: "vm.start",
    status: "success",
    result_summary: { previous_status: "stopped", new_status: "running" },
    error_code: null,
    error_message: null,
    requested_at: hoursAgo(24),
    completed_at: hoursAgo(23.98),
  },
  {
    id: "c3000000-0000-4000-8000-000000000003",
    correlation_id: "c1a1e000-1111-4111-8111-000000000003",
    user_id: carla.id,
    resource_id: ec2MlDev.id,
    provider: "aws",
    action: "start",
    required_permission: "vm.start",
    status: "pending",
    result_summary: null,
    error_code: null,
    error_message: null,
    requested_at: hoursAgo(0.05),
    completed_at: null,
  },
  {
    id: "c3000000-0000-4000-8000-000000000004",
    correlation_id: "c1a1e000-1111-4111-8111-000000000004",
    user_id: carla.id,
    resource_id: vmBatchDev.id,
    provider: "azure",
    action: "delete",
    required_permission: "vm.delete",
    status: "failed",
    result_summary: null,
    error_code: "AuthorizationFailed",
    error_message:
      "AuthorizationFailed: la Managed Identity no tiene permiso Microsoft.Compute/virtualMachines/delete en el scope rg-dev.",
    requested_at: hoursAgo(46),
    completed_at: hoursAgo(45.99),
  },
  {
    id: "c3000000-0000-4000-8000-000000000005",
    correlation_id: "c1a1e000-1111-4111-8111-000000000005",
    user_id: luis.id,
    resource_id: vmBatchDev.id,
    provider: "azure",
    action: "stop",
    required_permission: "vm.stop",
    status: "success",
    result_summary: { previous_status: "running", new_status: "stopped" },
    error_code: null,
    error_message: null,
    requested_at: hoursAgo(70),
    completed_at: hoursAgo(69.98),
  },
  {
    id: "c3000000-0000-4000-8000-000000000006",
    correlation_id: "c1a1e000-1111-4111-8111-000000000006",
    user_id: luis.id,
    resource_id: ec2Legacy.id,
    provider: "aws",
    action: "start",
    required_permission: "vm.start",
    status: "failed",
    result_summary: null,
    error_code: "InsufficientInstanceCapacity",
    error_message:
      "InsufficientInstanceCapacity: la zona us-east-2b no tiene capacidad disponible para el tipo de instancia m5.large.",
    requested_at: hoursAgo(96),
    completed_at: hoursAgo(95.99),
  },
  {
    id: "c3000000-0000-4000-8000-000000000007",
    correlation_id: "c1a1e000-1111-4111-8111-000000000007",
    user_id: carla.id,
    resource_id: ec2WebProd.id,
    provider: "aws",
    action: "start",
    required_permission: "vm.start",
    status: "success",
    result_summary: { previous_status: "stopped", new_status: "running" },
    error_code: null,
    error_message: null,
    requested_at: hoursAgo(120),
    completed_at: hoursAgo(119.97),
  },
  {
    id: "c3000000-0000-4000-8000-000000000008",
    correlation_id: "c1a1e000-1111-4111-8111-000000000008",
    user_id: luis.id,
    resource_id: ec2CacheStage.id,
    provider: "aws",
    action: "stop",
    required_permission: "vm.stop",
    status: "pending",
    result_summary: null,
    error_code: null,
    error_message: null,
    requested_at: hoursAgo(0.02),
    completed_at: null,
  },
];

/** In-memory operation log — new entries are prepended by the mocked action handlers. */
export let operations: OperationResponse[] = [...SEED_OPERATIONS].sort(
  (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime(),
);

export function getOperations(): OperationResponse[] {
  return operations;
}

export function findOperationById(id: string): OperationResponse | undefined {
  return operations.find((operation) => operation.id === id);
}

export function addOperation(operation: OperationResponse): void {
  operations = [operation, ...operations];
}
