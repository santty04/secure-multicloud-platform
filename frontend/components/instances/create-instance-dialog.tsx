"use client";

import { useMemo, useState } from "react";
import { Cloud, Server } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  awsInstanceCreateRequestSchema,
  azureInstanceCreateRequestSchema,
  type AwsInstanceCreateRequest,
  type AzureInstanceCreateRequest,
} from "@/schemas/instance";
import type { CloudProvider } from "@/types/domain";

type CreatePayload =
  | { provider: "aws"; payload: AwsInstanceCreateRequest }
  | { provider: "azure"; payload: AzureInstanceCreateRequest };

const FIELD_CLASS =
  "rounded-[10px] border border-smp-line-2 bg-smp-input px-3 py-2.5 text-[13px] text-smp-ink outline-none focus-visible:border-smp-accent-soft";

export function CreateInstanceDialog({
  open,
  isLoading,
  errorMessage,
  onSubmit,
  onCancel,
}: {
  open: boolean;
  isLoading?: boolean;
  errorMessage?: string | null;
  onSubmit: (payload: CreatePayload) => void;
  onCancel: () => void;
}) {
  const [provider, setProvider] = useState<CloudProvider>("aws");
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const endpoint = provider === "aws" ? "POST /api/v1/instances/aws" : "POST /api/v1/instances/azure";

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    return !isLoading;
  }, [isLoading, name]);

  function handleClose() {
    if (isLoading) return;
    setFieldError(null);
    onCancel();
  }

  function handleSubmit() {
    setFieldError(null);

    if (provider === "aws") {
      const parsed = awsInstanceCreateRequestSchema.safeParse({ name: name.trim() });
      if (!parsed.success) {
        setFieldError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
        return;
      }
      onSubmit({ provider: "aws", payload: parsed.data });
      return;
    }

    const parsed = azureInstanceCreateRequestSchema.safeParse({ name: name.trim() });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }
    onSubmit({ provider: "azure", payload: parsed.data });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="border-smp-line-2 bg-smp-surface text-smp-ink sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[17px] text-smp-ink">Crear instancia</DialogTitle>
          <DialogDescription className="text-[13px] text-smp-ink-muted">
            La operación queda registrada en auditoría y depende de las escrituras habilitadas en FastAPI.
          </DialogDescription>
        </DialogHeader>

        <div className="flex rounded-[10px] border border-smp-line-2 bg-smp-input p-1">
          <button
            type="button"
            onClick={() => setProvider("aws")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-semibold ${
              provider === "aws" ? "bg-smp-surface-alt text-smp-ink" : "text-smp-ink-muted hover:text-smp-ink"
            }`}
          >
            <Cloud className="size-3.5" aria-hidden="true" />
            AWS
          </button>
          <button
            type="button"
            onClick={() => setProvider("azure")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-semibold ${
              provider === "azure" ? "bg-smp-surface-alt text-smp-ink" : "text-smp-ink-muted hover:text-smp-ink"
            }`}
          >
            <Server className="size-3.5" aria-hidden="true" />
            Azure
          </button>
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1.5 text-[12px] font-semibold text-[#c3d0e6]">
            Nombre
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={FIELD_CLASS}
              placeholder={provider === "aws" ? "smp-demo-aws" : "smp-demo-azure"}
              maxLength={64}
            />
          </label>
        </div>

        <code className="block break-all rounded-lg border border-smp-line-2 bg-smp-input px-2.5 py-2 font-mono text-[11px] text-smp-ink-dim">
          {endpoint}
        </code>

        {fieldError || errorMessage ? (
          <div role="alert" className="rounded-lg border border-smp-danger/35 bg-smp-danger/10 px-3 py-2 text-[12px] text-smp-danger-text">
            {fieldError ?? errorMessage}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-smp-line-2 bg-transparent text-smp-ink-muted hover:border-smp-line-2 hover:text-smp-ink"
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-smp-accent hover:bg-smp-accent-hover">
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
