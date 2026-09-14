import { apiFetch } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { unexpectedResponseError } from "@/lib/api/errors";
import {
  infrastructureAdvisorResponseSchema,
  provisioningRequestResponseSchema,
  type InfrastructureAdvisorRequest,
} from "@/schemas/ai";

export async function getInfrastructureRecommendation(
  payload: InfrastructureAdvisorRequest,
) {
  const raw = await apiFetch<unknown>(endpoints.infrastructureAdvisor(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const parsed = infrastructureAdvisorResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw unexpectedResponseError();
  }

  return parsed.data;
}

export async function createProvisioningRequest(
  payload: InfrastructureAdvisorRequest,
) {
  const raw = await apiFetch<unknown>(endpoints.provisioningRequests(), {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const parsed = provisioningRequestResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw unexpectedResponseError();
  }

  return parsed.data;
}

export async function approveProvisioningRequest(
  requestId: string,
) {
  const raw = await apiFetch<unknown>(
    endpoints.approveProvisioningRequest(requestId),
    {
      method: "POST",
      body: JSON.stringify({
        note: "Aprobado desde Asistente IA",
      }),
    },
  );

  const parsed = provisioningRequestResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw unexpectedResponseError();
  }

  return parsed.data;
}

export async function rejectProvisioningRequest(
  requestId: string,
) {
  const raw = await apiFetch<unknown>(
    endpoints.rejectProvisioningRequest(requestId),
    {
      method: "POST",
      body: JSON.stringify({
        note: "Rechazado desde Asistente IA",
      }),
    },
  );

  const parsed = provisioningRequestResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw unexpectedResponseError();
  }

  return parsed.data;
}

export async function executeProvisioningRequest(
  requestId: string,
) {
  const raw = await apiFetch<unknown>(
    endpoints.executeProvisioningRequest(requestId),
    {
      method: "POST",
    },
  );

  const parsed = provisioningRequestResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw unexpectedResponseError();
  }

  return parsed.data;
}

export async function getProvisioningRequest(
  requestId: string,
) {
  const raw = await apiFetch<unknown>(
    endpoints.provisioningRequest(requestId),
  );

  const parsed = provisioningRequestResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw unexpectedResponseError();
  }

  return parsed.data;
}

function waitForProvisioningStatus(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export async function executeProvisioningRequestWithRecovery(
  requestId: string,
) {
  try {
    return await executeProvisioningRequest(requestId);
  } catch (originalError) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (attempt > 0) {
        await waitForProvisioningStatus(3000);
      }

      let current;

      try {
        current = await getProvisioningRequest(requestId);
      } catch {
        continue;
      }

      if (
        current.status === "executed" ||
        current.status === "failed"
      ) {
        return current;
      }

      if (current.status !== "executing") {
        throw originalError;
      }
    }

    throw originalError;
  }
}
