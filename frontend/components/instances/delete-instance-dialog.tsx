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
            Se eliminará <strong className="font-semibold text-smp-ink">{instance.name}</strong>. Esta acción no
            se puede deshacer y quedará registrada en auditoría.
          </>
        ) : null
      }
      confirmLabel="Eliminar definitivamente"
      isDestructive
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
