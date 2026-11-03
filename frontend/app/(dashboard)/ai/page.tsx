"use client";

import { FormEvent, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Cloud,
  Loader2,
  Play,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cloudsWith } from "@/features/auth/can";
import { useCurrentUser } from "@/features/auth/use-current-user";
import {
  useAIChat,
  useApproveProvisioningRequest,
  useCreateProvisioningRequest,
  useExecuteProvisioningRequest,
  useRejectProvisioningRequest,
} from "@/features/ai/use-ai-advisor";
import {
  useStartInstance,
  useStopInstance,
} from "@/features/instances/use-instance-action";
import { isApiError } from "@/lib/api/errors";
import type {
  AIActionTarget,
  InfrastructureAdvisorRequest,
  ProvisioningRequestResponse,
} from "@/schemas/ai";

type AIProviderChoice = "gemini" | "ollama";
type ProviderChoice = "auto" | "aws" | "azure";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

function messageId() {
  return crypto.randomUUID();
}

function errorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }

  return "No se pudo completar la solicitud.";
}

function providerLabel(provider: "azure" | "aws") {
  return provider === "azure" ? "Azure" : "AWS";
}

export default function AIPage() {
  const currentUserQuery = useCurrentUser();

  const chat = useAIChat();
  const createRequest = useCreateProvisioningRequest();
  const approveRequest = useApproveProvisioningRequest();
  const rejectRequest = useRejectProvisioningRequest();
  const executeRequest = useExecuteProvisioningRequest();

  const startInstance = useStartInstance();
  const stopInstance = useStopInstance();

  const [prompt, setPrompt] = useState("");
  const [aiProvider, setAiProvider] = useState<AIProviderChoice>("gemini");
  const [provider, setProvider] = useState<ProviderChoice>("auto");

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text:
        "Hola. Soy el Asistente Multicloud de Secure Multicloud. " +
        "Puedo consultar los recursos que tienes autorizados y, según tus permisos, " +
        "preparar acciones sobre máquinas virtuales.",
    },
  ]);

  const [pendingAction, setPendingAction] = useState<AIActionTarget | null>(
    null,
  );

  const [provisioningRequest, setProvisioningRequest] =
    useState<ProvisioningRequestResponse | null>(null);

  const currentUser = currentUserQuery.data;

  const creatableClouds = cloudsWith(currentUser, "vm.create");
  const providerMissing = creatableClouds.length > 0 && provider === "auto";

  function appendAssistantMessage(text: string) {
    setMessages((current) => [
      ...current,
      {
        id: messageId(),
        role: "assistant",
        text,
      },
    ]);
  }

  function resetProvisioningFlow() {
    createRequest.reset();
    approveRequest.reset();
    rejectRequest.reset();
    executeRequest.reset();
    setProvisioningRequest(null);
  }

  function beginProvisioning(
    requestText: string,
    selectedProvider: ProviderChoice,
    requestedName: string | null = null,
    useCatalogDefaults = false,
  ) {
    if (creatableClouds.length === 0) {
      return;
    }

    if (requestText.length < 10) {
      appendAssistantMessage(
        "Para crear una máquina virtual necesito una descripción un poco más detallada.",
      );
      return;
    }

    const providerPreference =
      selectedProvider === "auto"
        ? creatableClouds.length === 1
          ? creatableClouds[0]
          : null
        : selectedProvider;

    if (useCatalogDefaults && providerPreference === null) {
      appendAssistantMessage(
        "Indica si deseas crear la VM en Azure o AWS.",
      );
      return;
    }

    resetProvisioningFlow();

    const payload: InfrastructureAdvisorRequest = {
      ai_provider: aiProvider,
      request: requestText,
      provider_preference: providerPreference,
      environment: "dev",
      requested_name: requestedName,
      use_catalog_defaults: useCatalogDefaults,
    };

    createRequest.mutate(payload, {
      onSuccess: (result) => {
        setProvisioningRequest(result);
      },
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const requestText = prompt.trim();

    if (requestText.length < 2 || providerMissing) {
      return;
    }

    const selectedProvider = provider;

    setPrompt("");
    setPendingAction(null);

    setMessages((current) => [
      ...current,
      {
        id: messageId(),
        role: "user",
        text: requestText,
      },
    ]);

    chat.mutate(
      {
        ai_provider: aiProvider,
        message: requestText,
      },
      {
        onSuccess: (response) => {
          appendAssistantMessage(response.message);

          if (response.requires_confirmation && response.target_action) {
            setPendingAction(response.target_action);
          }

          if (response.intent === "create_vm" && creatableClouds.length > 0) {
            const provisioningProvider =
              selectedProvider === "auto"
                ? response.provider ?? "auto"
                : selectedProvider;

            beginProvisioning(
              requestText,
              provisioningProvider,
              response.requested_name,
              true,
            );
          }
        },
        onError: (error) => {
          appendAssistantMessage(errorMessage(error));
        },
      },
    );
  }

  function handleConfirmAction() {
    if (!pendingAction) {
      return;
    }

    const target = pendingAction;

    const mutation = target.action === "start" ? startInstance : stopInstance;

    mutation.mutate(
      {
        provider: target.provider,
        resourceId: target.resource_id,
        name: target.resource_name,
      },
      {
        onSuccess: (result) => {
          setPendingAction(null);

          if (result.status === "simulated") {
            appendAssistantMessage(
              `La acción sobre ${target.resource_name} fue registrada en modo simulado. No se modificaron recursos reales.`,
            );
            return;
          }

          appendAssistantMessage(
            `${target.resource_name}: la acción fue enviada correctamente.`,
          );
        },
        onError: (error) => {
          appendAssistantMessage(errorMessage(error));
        },
      },
    );
  }

  function handleCancelAction() {
    if (!pendingAction) {
      return;
    }

    appendAssistantMessage(
      `Acción cancelada para ${pendingAction.resource_name}.`,
    );

    setPendingAction(null);
  }

  function handleApprove() {
    if (!provisioningRequest) {
      return;
    }

    approveRequest.mutate(provisioningRequest.id, {
      onSuccess: (result) => {
        setProvisioningRequest(result);
      },
    });
  }

  function handleReject() {
    if (!provisioningRequest) {
      return;
    }

    rejectRequest.mutate(provisioningRequest.id, {
      onSuccess: (result) => {
        setProvisioningRequest(result);
      },
    });
  }

  function handleExecute() {
    if (!provisioningRequest) {
      return;
    }

    executeRequest.mutate(provisioningRequest.id, {
      onSuccess: (result) => {
        setProvisioningRequest(result);
      },
    });
  }

  const recommendation = provisioningRequest
    ? {
        provider: provisioningRequest.provider,
        region: provisioningRequest.region,
        instance_type: provisioningRequest.instance_type,
        disk_size_gb: provisioningRequest.disk_size_gb,
        architecture_summary: provisioningRequest.architecture_summary,
        reason: provisioningRequest.reason,
        confidence: provisioningRequest.confidence,
        public_ip: provisioningRequest.public_ip,
      }
    : undefined;

  const actionPending = startInstance.isPending || stopInstance.isPending;

  if (currentUserQuery.isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-smp-accent" />
      </div>
    );
  }

  return (
    <div className="flex max-w-[1100px] flex-col gap-4">
      <div>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-smp-ink">
          Asistente IA
        </h1>

        <p className="text-[13px] text-smp-ink-dim">
          Consulta tus recursos multicloud y solicita acciones según los
          permisos asignados en Azure y AWS.
        </p>

        {currentUser ? (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-smp-ink-muted">
            <span className="rounded-full border border-smp-line bg-smp-surface-alt px-3 py-1">
              Azure:{" "}
              <strong className="font-semibold text-smp-ink">
                {currentUser.cloudAccess.azure?.roleName ?? "Sin acceso"}
              </strong>
            </span>

            <span className="rounded-full border border-smp-line bg-smp-surface-alt px-3 py-1">
              AWS:{" "}
              <strong className="font-semibold text-smp-ink">
                {currentUser.cloudAccess.aws?.roleName ?? "Sin acceso"}
              </strong>
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex min-h-[650px] flex-col overflow-hidden rounded-2xl border border-smp-line bg-smp-surface">
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[760px] rounded-2xl rounded-tr-sm bg-smp-accent px-4 py-3 text-sm leading-6 text-white">
                  {message.text}
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex items-start gap-3">
                <div className="flex size-9 flex-none items-center justify-center rounded-xl bg-smp-accent">
                  <Bot className="size-5 text-white" />
                </div>

                <div className="max-w-[780px] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-smp-line bg-smp-surface-alt px-4 py-3">
                  <p className="text-sm leading-6 text-smp-ink">
                    {message.text}
                  </p>
                </div>
              </div>
            ),
          )}

          {chat.isPending ? (
            <div className="flex items-center gap-3 text-sm text-smp-ink-muted">
              <Loader2 className="size-4 animate-spin" />
              Analizando la solicitud...
            </div>
          ) : null}

          {pendingAction ? (
            <div className="ml-12 max-w-[820px] rounded-xl border border-smp-warning/30 bg-smp-warning/5 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-smp-warning-ink">
                Confirmación requerida
              </div>

              <div className="mt-3 grid gap-2 text-sm text-smp-ink sm:grid-cols-2">
                <div>
                  <span className="text-smp-ink-dim">Acción:</span>{" "}
                  <strong>
                    {pendingAction.action === "start" ? "Iniciar" : "Detener"}
                  </strong>
                </div>

                <div>
                  <span className="text-smp-ink-dim">Proveedor:</span>{" "}
                  <strong>{providerLabel(pendingAction.provider)}</strong>
                </div>

                <div>
                  <span className="text-smp-ink-dim">Recurso:</span>{" "}
                  <strong>{pendingAction.resource_name}</strong>
                </div>

                <div>
                  <span className="text-smp-ink-dim">Estado actual:</span>{" "}
                  <strong>{pendingAction.current_status}</strong>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={actionPending}
                  className="bg-smp-accent text-white hover:bg-smp-accent-hover"
                >
                  {actionPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Confirmar
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelAction}
                  disabled={actionPending}
                >
                  <XCircle className="size-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : null}

          {createRequest.isPending ? (
            <div className="flex items-center gap-3 text-sm text-smp-ink-muted">
              <Loader2 className="size-4 animate-spin" />
              Preparando la solicitud de aprovisionamiento...
            </div>
          ) : null}

          {recommendation ? (
            <div className="flex items-start gap-3">
              <div className="flex size-9 flex-none items-center justify-center rounded-xl bg-smp-accent">
                <Bot className="size-5 text-white" />
              </div>

              <div className="w-full max-w-[820px] rounded-2xl rounded-tl-sm border border-smp-line bg-smp-surface-alt p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Cloud className="size-4 text-smp-accent" />

                  <h2 className="text-sm font-semibold text-smp-ink">
                    Recomendación de infraestructura
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-smp-ink-dim">
                      Proveedor
                    </div>

                    <div className="mt-1 font-mono text-sm text-smp-ink">
                      {recommendation.provider.toUpperCase()}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-smp-ink-dim">
                      Región
                    </div>

                    <div className="mt-1 font-mono text-sm text-smp-ink">
                      {recommendation.region}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-smp-ink-dim">
                      Instancia
                    </div>

                    <div className="mt-1 font-mono text-sm text-smp-ink">
                      {recommendation.instance_type}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-smp-ink-dim">
                      Disco
                    </div>

                    <div className="mt-1 font-mono text-sm text-smp-ink">
                      {recommendation.disk_size_gb} GB
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-smp-line pt-4">
                  <div className="text-xs font-semibold text-smp-ink">
                    Arquitectura
                  </div>

                  <p className="mt-1 text-sm leading-6 text-smp-ink-muted">
                    {recommendation.architecture_summary}
                  </p>
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-smp-ink">
                    Motivo
                  </div>

                  <p className="mt-1 text-sm leading-6 text-smp-ink-muted">
                    {recommendation.reason}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-xs text-smp-ink-dim">
                  <span>
                    Confianza: {Math.round(recommendation.confidence * 100)}%
                  </span>

                  <span>
                    IP pública: {recommendation.public_ip ? "Sí" : "No"}
                  </span>

                  <span>
                    Motor IA:{" "}
                    {provisioningRequest?.ai_provider === "gemini"
                      ? "Gemini Cloud"
                      : "Ollama Local"}
                  </span>

                  <span>Modelo: {provisioningRequest?.ai_model}</span>
                </div>
              </div>
            </div>
          ) : null}

          {createRequest.error ? (
            <div className="rounded-xl border border-smp-danger/30 bg-smp-danger/5 px-4 py-3 text-sm text-smp-danger-text">
              {errorMessage(createRequest.error)}
            </div>
          ) : null}

          {provisioningRequest ? (
            <div className="ml-12 max-w-[820px] rounded-xl border border-smp-line bg-smp-surface-alt p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-smp-ink-dim">
                    Solicitud de aprovisionamiento
                  </div>

                  <div className="mt-1 font-mono text-xs text-smp-ink">
                    {provisioningRequest.id}
                  </div>
                </div>

                <span className="rounded-full border border-smp-line px-2.5 py-1 text-xs font-semibold uppercase text-smp-ink">
                  {provisioningRequest.status}
                </span>
              </div>

              {provisioningRequest.status === "pending" ? (
                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    onClick={handleApprove}
                    disabled={approveRequest.isPending}
                    className="bg-smp-accent text-white hover:bg-smp-accent-hover"
                  >
                    {approveRequest.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Aprobar
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReject}
                    disabled={rejectRequest.isPending}
                  >
                    <XCircle className="size-4" />
                    Rechazar
                  </Button>
                </div>
              ) : null}

              {provisioningRequest.status === "approved" ? (
                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={handleExecute}
                    disabled={executeRequest.isPending}
                    className="bg-smp-accent text-white hover:bg-smp-accent-hover"
                  >
                    {executeRequest.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    Ejecutar aprovisionamiento
                  </Button>
                </div>
              ) : null}

              {provisioningRequest.status === "executed" ? (
                <div className="mt-4 rounded-lg border border-smp-success/30 bg-smp-success/5 p-3 text-sm text-smp-ink">
                  Infraestructura creada correctamente.
                  {provisioningRequest.managed_resource_id ? (
                    <div className="mt-1 font-mono text-xs text-smp-ink-dim">
                      Recurso: {provisioningRequest.managed_resource_id}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {provisioningRequest.status === "failed" ? (
                <div className="mt-4 rounded-lg border border-smp-danger/30 bg-smp-danger/5 p-3 text-sm text-smp-danger-text">
                  {provisioningRequest.failure_reason ??
                    "El aprovisionamiento falló."}
                </div>
              ) : null}
            </div>
          ) : null}

          {approveRequest.error ||
          rejectRequest.error ||
          executeRequest.error ? (
            <div className="rounded-xl border border-smp-danger/30 bg-smp-danger/5 px-4 py-3 text-sm text-smp-danger-text">
              {errorMessage(
                approveRequest.error ??
                  rejectRequest.error ??
                  executeRequest.error,
              )}
            </div>
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-smp-line bg-smp-surface-raised p-4"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <select
              value={aiProvider}
              onChange={(event) =>
                setAiProvider(event.target.value as AIProviderChoice)
              }
              className="rounded-lg border border-smp-line-2 bg-smp-surface-alt px-3 py-2 text-xs text-smp-ink outline-none"
            >
              <option value="gemini">Gemini Cloud</option>

              <option value="ollama">Ollama Local</option>
            </select>

            {creatableClouds.length > 0 ? (
              <>
                <select
                  value={provider}
                  onChange={(event) =>
                    setProvider(event.target.value as ProviderChoice)
                  }
                  required
                  aria-invalid={providerMissing}
                  className={`rounded-lg border bg-smp-surface-alt px-3 py-2 text-xs text-smp-ink outline-none ${
                    providerMissing ? "border-smp-warning" : "border-smp-line-2"
                  }`}
                >
                  <option value="auto" disabled>
                    Seleccione opción
                  </option>

                  {creatableClouds.map((cloudProvider) => (
                    <option key={cloudProvider} value={cloudProvider}>
                      {providerLabel(cloudProvider)}
                    </option>
                  ))}
                </select>

                <span className="text-[11px] text-smp-ink-dim">
                  Entorno de creación: dev
                </span>

                {providerMissing ? (
                  <span className="text-[11px] text-smp-warning-ink">
                    Selecciona un proveedor para continuar
                  </span>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="flex items-end gap-2">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ej: Muéstrame mis máquinas virtuales, dime el estado de vm-dev o apaga vm-pruebas..."
              rows={3}
              maxLength={4000}
              className="min-h-[82px] flex-1 resize-none rounded-xl border border-smp-line-2 bg-smp-surface-alt px-4 py-3 text-sm text-smp-ink outline-none placeholder:text-smp-ink-faint focus:border-smp-accent"
            />

            <Button
              type="submit"
              disabled={
                prompt.trim().length < 2 ||
                providerMissing ||
                chat.isPending ||
                createRequest.isPending
              }
              className="h-[44px] bg-smp-accent px-4 text-white hover:bg-smp-accent-hover"
            >
              {chat.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Enviar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
