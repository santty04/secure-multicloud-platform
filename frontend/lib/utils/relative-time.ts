/**
 * Coarse "ago" label used throughout the dashboard and tables
 * ("hace 6 min", "hace 3 h", "hace 2 d"). Intentionally low precision —
 * this is an operator console, not a stopwatch.
 */
export function relativeTime(input: string | Date, now: Date = new Date()): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const minutes = Math.round((now.getTime() - d.getTime()) / 60_000);

  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}
