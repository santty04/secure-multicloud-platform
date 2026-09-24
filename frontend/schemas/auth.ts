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

/** `LoginChallengeResponse` — POST /api/v1/auth/login when MFA is enabled */
export const loginChallengeResponseSchema = z.object({
  mfa_required: z.literal(true),
  challenge_id: z.string(),
  email_hint: z.string(),
  expires_in_seconds: z.number().int(),
  resend_available_in_seconds: z.number().int(),
});
export type LoginChallenge = z.infer<typeof loginChallengeResponseSchema>;

/** POST /api/v1/auth/login returns a token, or a challenge when MFA is on. */
export const loginResponseSchema = z.union([loginChallengeResponseSchema, tokenResponseSchema]);

/** `VerifyLoginCodeRequest` — POST /api/v1/auth/login/verify */
export const verifyLoginCodeRequestSchema = z.object({
  challenge_id: z.string(),
  code: z.string().regex(/^\d{6}$/),
});
export type VerifyLoginCodeRequest = z.infer<typeof verifyLoginCodeRequestSchema>;

/** `SetPasswordRequest` — POST /api/v1/auth/set-password */
export const setPasswordRequestSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(12).max(128),
});
export type SetPasswordRequest = z.infer<typeof setPasswordRequestSchema>;

/** `PasswordSetupTokenInfo` — GET /api/v1/auth/set-password/:token */
export const passwordSetupTokenInfoSchema = z.object({
  email: z.string().email(),
  full_name: z.string(),
});
export type PasswordSetupTokenInfo = z.infer<typeof passwordSetupTokenInfoSchema>;

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
