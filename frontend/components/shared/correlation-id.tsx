"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Correlation IDs are a first-class citizen across this app (table, drawer,
 * toast, timeline) and must always be copyable — see HANDOFF.md §1.
 */
export function CorrelationId({
  value,
  className,
  variant = "chip",
}: {
  value: string;
  className?: string;
  variant?: "chip" | "inline";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // clipboard may be blocked (permissions, insecure context) — still flash feedback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={copy}
        title="Copiar correlation ID"
        className={cn(
          "inline-flex items-center gap-1.5 truncate font-mono text-[10.5px] text-smp-ink-dim hover:text-smp-accent-soft",
          className,
        )}
      >
        {copied ? <Check className="size-3 shrink-0" /> : <Copy className="size-3 shrink-0" />}
        <span className="truncate">{value}</span>
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <code className="flex-1 break-all rounded-lg border border-smp-line-2 bg-smp-input px-2.5 py-1.5 font-mono text-[11.5px] text-smp-accent-soft">
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-lg border border-smp-line-2 px-2.5 py-1.5 text-[11.5px] font-semibold text-smp-ink-muted hover:border-smp-accent hover:text-smp-ink"
      >
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
