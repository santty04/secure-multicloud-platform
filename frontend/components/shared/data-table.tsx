import { cn } from "@/lib/utils";

/**
 * Shared shell for the Instances / Operations / Audit tables: a bordered
 * card, a sticky uppercase header row, and a horizontally-scrolling body
 * that all share one `gridTemplateColumns` so header and rows line up.
 * Row markup stays with each feature (actions column, drawer buttons, …);
 * this only owns the chrome.
 */
export function DataTable({
  minWidth,
  gridTemplateColumns,
  headers,
  headerAlign,
  children,
  className,
}: {
  minWidth: number;
  gridTemplateColumns: string;
  headers: string[];
  headerAlign?: Record<number, "right">;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto overflow-y-hidden rounded-2xl border border-smp-line bg-smp-surface", className)}>
      <div
        className="grid gap-2.5 border-b border-smp-line bg-smp-surface-alt px-4 py-2.25 text-[10px] font-bold tracking-[.07em] text-smp-ink-faint uppercase"
        style={{ minWidth, gridTemplateColumns }}
      >
        {headers.map((h, i) => (
          <span key={h} className={headerAlign?.[i] === "right" ? "text-right" : undefined}>
            {h}
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}
