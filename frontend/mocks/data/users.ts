import type { CurrentUserResponse } from "@/schemas/auth";

/**
 * Mock-only user record: a real `CurrentUserResponse` (snake_case, matches
 * `schemas/auth.ts#currentUserResponseSchema`) plus the demo-only `password`
 * field used by the mocked `/auth/login` handler. Never sent to the client
 * as-is — see `toCurrentUserResponse`.
 */
export interface MockUser extends CurrentUserResponse {
  password: string;
}

/** Password for all three demo accounts (mock-only convenience). */
const DEMO_PASSWORD = "demo1234";

const VIEWER_VM = ["vm.read"];
const OPERATOR_VM = ["vm.read", "vm.start", "vm.stop"];
const ADMIN_VM = ["vm.create", "vm.delete", "vm.read", "vm.start", "vm.stop", "vm.update"];

export const MOCK_USERS: MockUser[] = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    email: "ana.torres@smp.edu",
    password: DEMO_PASSWORD,
    full_name: "Ana Torres",
    is_active: true,
    role_code: "viewer",
    role_name: "Viewer",
    permissions: ["vm.read", "operation.read"],
    cloud_access: {
      azure: { role_code: "viewer", role_name: "Viewer", permissions: VIEWER_VM },
      aws: { role_code: "viewer", role_name: "Viewer", permissions: VIEWER_VM },
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    email: "l.mendez@smp.edu",
    password: DEMO_PASSWORD,
    full_name: "Luis Méndez",
    is_active: true,
    role_code: "operator",
    role_name: "Operador",
    permissions: ["vm.read", "vm.start", "vm.stop", "operation.read"],
    // Mixed access, to demo per-cloud rules: operates Azure, only reads AWS.
    cloud_access: {
      azure: { role_code: "operator", role_name: "Operador", permissions: OPERATOR_VM },
      aws: { role_code: "viewer", role_name: "Viewer", permissions: VIEWER_VM },
    },
  },
  {
    id: "a1000000-0000-4000-8000-000000000003",
    email: "c.rivas@smp.edu",
    password: DEMO_PASSWORD,
    full_name: "Carla Rivas",
    is_active: true,
    role_code: "administrator",
    role_name: "Administrador",
    permissions: [
      "vm.read",
      "vm.create",
      "vm.start",
      "vm.stop",
      "vm.update",
      "vm.delete",
      "operation.read",
      "user.manage",
    ],
    cloud_access: {
      azure: { role_code: "administrator", role_name: "Administrador", permissions: ADMIN_VM },
      aws: { role_code: "administrator", role_name: "Administrador", permissions: ADMIN_VM },
    },
  },
];

export function findUserByCredentials(email: string, password: string): MockUser | undefined {
  return MOCK_USERS.find(
    (user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password,
  );
}

export function findUserById(id: string): MockUser | undefined {
  return MOCK_USERS.find((user) => user.id === id);
}

/** Strips the mock-only `password` field, returning the real wire shape. */
export function toCurrentUserResponse(user: MockUser): CurrentUserResponse {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    is_active: user.is_active,
    role_code: user.role_code,
    role_name: user.role_name,
    permissions: user.permissions,
    cloud_access: user.cloud_access,
  };
}
