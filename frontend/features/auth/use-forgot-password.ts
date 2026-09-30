"use client";

import { useMutation } from "@tanstack/react-query";
import type { ApiError } from "@/lib/api/client";
import { requestPasswordReset } from "@/lib/api/auth";
import type { ForgotPasswordRequest } from "@/schemas/auth";

export function useForgotPassword() {
  return useMutation<{ detail: string }, ApiError, ForgotPasswordRequest>({
    mutationFn: requestPasswordReset,
  });
}
