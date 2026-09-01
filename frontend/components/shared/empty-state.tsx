export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-13 text-center">
      <div className="mb-1 text-sm font-semibold text-smp-ink">{title}</div>
      <div className="mb-4 text-[12.5px] text-smp-ink-dim">{description}</div>
      {action}
    </div>
  );
}
