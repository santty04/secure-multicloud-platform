"use client";

import { useMutation } from "@tanstack/react-query";
import {
  approveProvisioningRequest,
  createProvisioningRequest,
  executeProvisioningRequestWithRecovery,
  getInfrastructureRecommendation,
  rejectProvisioningRequest,
  sendAIChatMessage,
} from "@/lib/api/ai";

export function useInfrastructureAdvisor() {
  return useMutation({
    mutationFn: getInfrastructureRecommendation,
  });
}

export function useCreateProvisioningRequest() {
  return useMutation({
    mutationFn: createProvisioningRequest,
  });
}

export function useApproveProvisioningRequest() {
  return useMutation({
    mutationFn: approveProvisioningRequest,
  });
}

export function useRejectProvisioningRequest() {
  return useMutation({
    mutationFn: rejectProvisioningRequest,
  });
}

export function useExecuteProvisioningRequest() {
  return useMutation({
    mutationFn: executeProvisioningRequestWithRecovery,
  });
}

export function useAIChat() {
  return useMutation({
    mutationFn: sendAIChatMessage,
  });
}
