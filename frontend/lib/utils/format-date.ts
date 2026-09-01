/**
 * Formats an ISO date string / Date as `dd/mm HH:MM:SS`, matching the
 * timestamp format used across the Secure Multicloud Platform prototype
 * (instance drawers, operation timelines, audit log rows).
 */
export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}
