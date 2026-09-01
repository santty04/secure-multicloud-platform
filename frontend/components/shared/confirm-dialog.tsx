import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function ConfirmDialog({
  open,
  title,
  description,
  code,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isDestructive,
  isLoading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  code?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="border-smp-line-2 bg-smp-surface text-smp-ink sm:max-w-[432px]">
        <DialogHeader>
          {isDestructive ? (
            <div className="mb-1 grid size-9.5 place-items-center rounded-[11px] bg-smp-danger/14">
              <AlertTriangle className="size-5 text-smp-danger-text" />
            </div>
          ) : null}
          <DialogTitle className="text-[17px] text-smp-ink">{title}</DialogTitle>
          <DialogDescription className="text-balance text-[13px] text-smp-ink-muted">
            {description}
          </DialogDescription>
        </DialogHeader>
        {code ? (
          <code className="block break-all rounded-lg border border-smp-line-2 bg-smp-input px-2.5 py-2 font-mono text-[11px] text-smp-ink-dim">
            {code}
          </code>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            className="border-smp-line-2 bg-transparent text-smp-ink-muted hover:border-smp-line-2 hover:text-smp-ink"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={
              isDestructive
                ? "bg-smp-danger-strong text-white hover:bg-smp-danger-hover"
                : "bg-smp-accent hover:bg-smp-accent-hover"
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
