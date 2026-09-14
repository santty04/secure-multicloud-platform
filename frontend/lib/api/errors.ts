import { apiErrorEnvelopeSchema } from "@/schemas/common";

export type ApiError = {
  code: string;
  message: string;
  correlationId?: string;
  status: number;
  /** true for 5xx, network failures, 408, 429 — worth offering a retry button for. */
  retryable: boolean;
};

const FRIENDLY_MESSAGE: Record<number, string> = {
  401: "Tu sesión expiró o las credenciales no son válidas.",
  403: "No tienes permiso para realizar esta acción.",
  404: "El recurso solicitado no existe o ya no está administrado por la plataforma.",
  422: "La solicitud contiene datos inválidos.",
  502: "El proveedor no respondió correctamente.",
  503: "Esta operación no está disponible para este proveedor.",
};

function isRetryable(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

/** Parses the `{ error: { code, message, correlation_id } }` envelope every 4xx/5xx uses. */
export async function normalizeApiError(response: Response): Promise<ApiError> {
  const headerCid = response.headers.get("X-Correlation-ID") ?? undefined;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  const parsed = apiErrorEnvelopeSchema.safeParse(body);
  if (parsed.success) {
    const { code, message, correlation_id } = parsed.data.error;
    return {
      code,
      message: FRIENDLY_MESSAGE[response.status] ?? message,
      correlationId: correlation_id ?? headerCid,
      status: response.status,
      retryable: isRetryable(response.status),
    };
  }

  return {
    code: "http_error",
    message: FRIENDLY_MESSAGE[response.status] ?? `El servidor respondió con un error (${response.status}).`,
    correlationId: headerCid,
    status: response.status,
    retryable: isRetryable(response.status),
  };
}

/** fetch() itself threw — the backend never responded (offline, DNS, CORS, refused connection). */
export function networkError(): ApiError {
  return {
    code: "network_error",
    message:
      "No se pudo conectar con la plataforma. No se muestran datos guardados para evitar decisiones con información desactualizada.",
    status: 0,
    retryable: true,
  };
}

export function unexpectedResponseError(): ApiError {
  return {
    code: "unexpected_response",
    message: "La plataforma respondió con un formato inesperado.",
    status: 0,
    retryable: false,
  };
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "code" in value && "retryable" in value;
}
