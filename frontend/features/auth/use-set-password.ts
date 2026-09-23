"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@/lib/api/client";
import { getCurrentUser, setPassword } from "@/lib/api/auth";
import { clearAccessToken, setAccessToken } from "@/lib/auth/session";
import type { SetPasswordRequest } from "@/schemas/auth";
import type { CurrentUser } from "@/types/domain";
import { authKeys } from "./keys";

export function useSetPassword() {
  const queryClient = useQueryClient();

  return useMutation<CurrentUser, ApiError, SetPasswordRequest>({
    mutationFn: async (payload) => {
      const token = await setPassword(payload);
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
