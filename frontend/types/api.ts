/**
 * Wire types for the FastAPI backend, inferred from the Zod schemas in
 * `schemas/*` (the schemas are the source of truth so validation and types
 * can't drift). There is no `openapi.json` generation step wired up yet —
 * these were hand-derived from the backend's Pydantic models
 * (`app/schemas/*.py`) and double-checked against the route handlers.
 */
export type { LoginRequest, TokenResponse, CurrentUserResponse } from "@/schemas/auth";
export type {
  InstanceSummaryResponse,
  LiveAwsInstanceSummaryResponse,
  InstanceStatusResponse,
  InstanceActionResponse,
} from "@/schemas/instance";
export type { OperationResponse } from "@/schemas/operation";
export type { AuditLogResponse } from "@/schemas/audit-log";
