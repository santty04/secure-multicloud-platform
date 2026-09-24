"use client";

import { useQuery } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/auth/session";
import {
  getInstanceStatus,
  getLiveAwsInstances,
  getManagedInstances,
} from "@/lib/api/instances";
import type { CloudProvider } from "@/types/domain";
import { instanceKeys } from "./keys";

/** GET /api/v1/instances has no server-side filters — search/provider/status are applied on the client. */
export function useManagedInstances(options: { refetchInterval?: number } = {}) {
  const enabled = Boolean(getAccessToken());
  return useQuery({
    queryKey: instanceKeys.managed(),
    queryFn: getManagedInstances,
    enabled,
    staleTime: 30_000,
    refetchInterval: options.refetchInterval,
  });
}

export function useLiveAwsInstances() {
  const enabled = Boolean(getAccessToken());
  return useQuery({
    queryKey: instanceKeys.liveAws(),
    queryFn: getLiveAwsInstances,
    enabled,
    staleTime: 30_000,
  });
}

export function useInstanceStatus({
  provider,
  resourceId,
  enabled = true,
}: {
  provider: CloudProvider | undefined;
  resourceId: string | undefined;
  enabled?: boolean;
}) {
  const hasToken = Boolean(getAccessToken());
  return useQuery({
    queryKey: instanceKeys.status(provider ?? "unknown", resourceId ?? "missing"),
    queryFn: () => getInstanceStatus(provider!, resourceId!),
    enabled: enabled && hasToken && Boolean(provider && resourceId),
    retry: 1,
    staleTime: 10_000,
  });
}

export const useInstances = useManagedInstances;
