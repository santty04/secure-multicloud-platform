"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { Instance } from "@/types/domain";

/**
 * Thin `<ConfirmDialog>` wrapper for the delete confirmation, shared by the
 * row's inline delete button and the drawer's delete action — the page owns
 * a single `deleteTarget: Instance | null` state and renders exactly one of
 * these, whichever button opened it.
 *
 * Deleting is irreversible, so the user must type the machine's exact name
 * (case-sensitive) before the confirm button unlocks.
 */
export function DeleteInstanceDialog({
  instance,
  isLoading,
  onConfirm,
  onCancel,
}: {
  instance: Instance | null;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Tagged with the instance it was typed for, so opening the dialog for
  // another machine starts empty instead of carrying the previous text.
  const [typed, setTyped] = useState<{ id: string; value: string } | null>(null);
  const value = instance && typed?.id === instance.id ? typed.value : "";
  const matches = instance !== null && value === instance.name;
  const showMismatch = value.length > 0 && !matches;

  function confirm() {
    if (matches && !isLoading) onConfirm();
  }

  return (
    <ConfirmDialog
      open={instance !== null}
      title="Eliminar instancia"
      description={
        instance ? (
          <>
            Se eliminará <strong className="font-semibold text-smp-ink">{instance.name}</strong>. Esta acción no
            se puede deshacer y quedará registrada en auditoría.
          </>
        ) : null
      }
      confirmLabel={isLoading ? "Eliminando…" : "Eliminar definitivamente"}
      isDestructive
      isLoading={isLoading}
      confirmDisabled={!matches}
      onConfirm={confirm}
      onCancel={onCancel}
    >
      {instance ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            confirm();
          }}
          className="flex flex-col gap-[7px]"
        >
          <label htmlFor="smp-delete-confirm" className="text-[12px] text-smp-ink-muted">
            Para confirmar, escribe{" "}
            <code className="rounded bg-smp-input px-1 py-0.5 font-mono text-[11.5px] text-smp-ink">
              {instance.name}
            </code>
          </label>
          <input
            id="smp-delete-confirm"
            value={value}
            onChange={(event) => setTyped({ id: instance.id, value: event.target.value })}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            disabled={isLoading}
            aria-invalid={showMismatch}
            aria-describedby={showMismatch ? "smp-delete-confirm-error" : undefined}
            placeholder={instance.name}
            className="rounded-[10px] border border-smp-line-2 bg-smp-input px-3 py-2.5 font-mono text-[13px] text-smp-ink outline-none placeholder:text-smp-ink-dim/50 focus-visible:border-smp-accent-soft aria-invalid:border-smp-danger/60 disabled:opacity-60"
          />
          {showMismatch ? (
            <div id="smp-delete-confirm-error" className="text-[11.5px] text-smp-danger-text">
              El nombre no coincide.
            </div>
          ) : null}
        </form>
      ) : null}
    </ConfirmDialog>
  );
}
