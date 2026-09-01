export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="px-4 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex animate-[smp-shimmer_1.3s_ease-in-out_infinite] items-center gap-2.5 border-b border-smp-line-soft py-2.75"
        >
          <span className="h-2.5 flex-[1.5] rounded bg-smp-line-2/60" />
          <span className="h-2.5 w-[70px] rounded bg-smp-line-2/60" />
          <span className="h-2.5 w-[96px] rounded bg-smp-line-2/60" />
          <span className="h-2.5 w-[110px] rounded bg-smp-line-2/60" />
          <span className="h-2.5 flex-1 rounded bg-smp-line-2/60" />
        </div>
      ))}
    </div>
  );
}
