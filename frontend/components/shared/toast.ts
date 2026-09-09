import { toast } from "sonner";

/**
 * Every action toast in this app can carry a correlation ID (HANDOFF.md §1)
 * with a one-click copy — this is the one place that wires that up so every
 * caller (instance actions, RBAC-denied attempts, …) looks the same.
 */
export function notify({
  kind,
  title,
  message,
  correlationId,
}: {
  kind: "success" | "error" | "info";
  title: string;
  message: string;
  correlationId?: string;
}) {
  const fn = kind === "error" ? toast.error : kind === "info" ? toast.info : toast.success;
  fn(title, {
    description: message,
    duration: 7000,
    action: correlationId
      ? {
          label: "Copiar ID",
          onClick: () => {
            void navigator.clipboard.writeText(correlationId);
          },
        }
      : undefined,
  });
}
