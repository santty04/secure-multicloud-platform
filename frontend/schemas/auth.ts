import { z } from "zod";

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** `TokenResponse` — POST /api/v1/auth/login */
export const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
});
export type TokenResponse = z.infer<typeof tokenResponseSchema>;

/** `CurrentUserResponse` — GET /api/v1/auth/me */
export const currentUserResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  full_name: z.string(),
  is_active: z.boolean(),
  role_code: z.string(),
  role_name: z.string(),
  permissions: z.array(z.string()),
});
export type CurrentUserResponse = z.infer<typeof currentUserResponseSchema>;
