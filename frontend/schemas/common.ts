import { z } from "zod";

export const cloudProviderSchema = z.enum(["azure", "aws"]);

/** `app/core/errors.py` — every 4xx/5xx from the API uses this envelope. */
export const apiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    correlation_id: z.string(),
    details: z
      .array(
        z.object({
          location: z.array(z.union([z.string(), z.number()])),
          message: z.string(),
          type: z.string(),
        }),
      )
      .optional(),
  }),
});
