import { z } from "zod";

export const infrastructureAdvisorRequestSchema = z.object({
  ai_provider: z.enum(["ollama", "gemini"]),
  request: z.string().min(10).max(4000),
  provider_preference: z.enum(["aws", "azure"]).nullable().optional(),
  max_monthly_budget_usd: z.number().positive().nullable().optional(),
  environment: z.enum(["dev", "test", "prod"]).default("dev"),
  requested_name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/)
    .nullable()
    .optional(),
  use_catalog_defaults: z.boolean().optional(),
});

export const infrastructureRecommendationSchema = z.object({
  provider: z.string(),
  requested_name: z.string().nullable(),
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
  requested_name: z.string().nullable(),

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

export const aiChatIntentSchema = z.enum([
  "general_question",
  "query_inventory",
  "get_vm_status",
  "start_vm",
  "stop_vm",
  "create_vm",
  "clarification",
]);

export const aiChatRequestSchema = z.object({
  ai_provider: z.enum(["ollama", "gemini"]),
  message: z.string().min(2).max(4000),
});

export const aiActionTargetSchema = z.object({
  action: z.enum(["start", "stop"]),
  provider: z.enum(["azure", "aws"]),
  resource_id: z.string().uuid(),
  resource_name: z.string(),
  current_status: z.string(),
});

export const aiChatResponseSchema = z.object({
  intent: aiChatIntentSchema,
  message: z.string(),
  provider: z.enum(["azure", "aws"]).nullable(),
  requested_name: z.string().nullable(),
  requires_confirmation: z.boolean(),
  target_action: aiActionTargetSchema.nullable(),
  ai_provider: z.string(),
  ai_model: z.string(),
});

export type AIChatRequest = z.infer<typeof aiChatRequestSchema>;

export type AIActionTarget = z.infer<typeof aiActionTargetSchema>;

export type AIChatResponse = z.infer<typeof aiChatResponseSchema>;
