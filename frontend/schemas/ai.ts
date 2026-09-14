import { z } from "zod";

export const infrastructureAdvisorRequestSchema = z.object({
  ai_provider: z.enum(["ollama", "gemini"]),
  request: z.string().min(10).max(4000),
  provider_preference: z.enum(["aws", "azure"]).nullable().optional(),
  max_monthly_budget_usd: z.number().positive().nullable().optional(),
  environment: z.enum(["dev", "test", "prod"]).default("dev"),
});

export const infrastructureRecommendationSchema = z.object({
  provider: z.string(),
  region: z.string(),
  environment: z.enum(["dev", "test", "prod"]),
  instance_count: z.number().int().positive(),
  instance_type: z.string(),
  disk_type: z.string(),
  disk_size_gb: z.number().int().positive(),
  public_ip: z.boolean(),
  architecture_summary: z.string(),
  reason: z.string(),
  assumptions: z.array(z.string()),
  risks: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const infrastructureAdvisorResponseSchema = z.object({
  recommendation: infrastructureRecommendationSchema,
  estimated_monthly_cost_usd: z.number().nullable(),
  pricing_status: z.string(),
  ai_provider: z.string(),
  ai_model: z.string(),
  executable: z.boolean(),
});

export const provisioningRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "executing",
  "executed",
  "failed",
]);

export const provisioningRequestResponseSchema = z.object({
  id: z.string(),
  correlation_id: z.string(),
  status: provisioningRequestStatusSchema,

  created_by_id: z.string().nullable(),
  created_by_email: z.string(),

  reviewed_by_id: z.string().nullable(),
  reviewed_by_email: z.string().nullable(),

  original_request: z.string(),

  provider_preference: z.string().nullable(),
  max_monthly_budget_usd: z.number().nullable(),

  provider: z.string(),
  region: z.string(),
  environment: z.string(),

  instance_count: z.number(),
  instance_type: z.string(),

  disk_type: z.string(),
  disk_size_gb: z.number(),

  public_ip: z.boolean(),

  architecture_summary: z.string(),
  reason: z.string(),

  assumptions: z.array(z.string()),
  risks: z.array(z.string()),

  confidence: z.number(),

  estimated_monthly_cost_usd: z.number().nullable(),
  pricing_status: z.string(),

  ai_provider: z.string(),
  ai_model: z.string(),

  review_note: z.string().nullable(),

  managed_resource_id: z.string().nullable(),
  operation_id: z.string().nullable(),

  failure_reason: z.string().nullable(),

  created_at: z.string(),
  updated_at: z.string(),

  approved_at: z.string().nullable(),
  rejected_at: z.string().nullable(),

  execution_started_at: z.string().nullable(),
  executed_at: z.string().nullable(),
});

export type InfrastructureAdvisorRequest = z.infer<
  typeof infrastructureAdvisorRequestSchema
>;

export type InfrastructureAdvisorResponse = z.infer<
  typeof infrastructureAdvisorResponseSchema
>;

export type ProvisioningRequestResponse = z.infer<
  typeof provisioningRequestResponseSchema
>;