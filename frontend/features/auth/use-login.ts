"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@/lib/api/client";
import { getCurrentUser, login } from "@/lib/api/auth";
import { clearAccessToken, setAccessToken } from "@/lib/auth/session";
import type { LoginRequest } from "@/schemas/auth";
import type { CurrentUser } from "@/types/domain";
import { authKeys } from "./keys";

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<CurrentUser, ApiError, LoginRequest>({
    mutationFn: async (credentials) => {
      const token = await login(credentials);
      setAccessToken(token.access_token);

      try {
        return await getCurrentUser();
      } catch (error) {
        clearAccessToken();
        throw error;
      }
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me(), user);
    },
  });
}
