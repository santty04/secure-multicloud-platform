import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { Instance } from "@/types/domain";

/**
 * Thin `<ConfirmDialog>` wrapper for the delete confirmation, shared by the
 * row's inline delete button and the drawer's delete action — the page owns
 * a single `deleteTarget: Instance | null` state and renders exactly one of
 * these, whichever button opened it.
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
  return (
    <ConfirmDialog
      open={instance !== null}
      title="Eliminar instancia"
      description={
        instance ? (
          <>
            Se solicitará al backend la eliminación de{" "}
            <strong className="font-semibold text-smp-ink">{instance.name}</strong>. Esta acción es
            irreversible y quedará registrada en auditoría.
          </>
        ) : null
      }
      code={instance ? `DELETE /api/v1/instances/${instance.provider}/${instance.id}` : undefined}
      confirmLabel="Eliminar definitivamente"
      isDestructive
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
