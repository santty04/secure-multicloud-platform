import { StatusPill } from "@/components/shared/status-pill";
import { auditDecisionPresentation } from "@/lib/utils/status";
import type { AuditDecision } from "@/types/domain";

export function AuditResultBadge({ decision }: { decision: AuditDecision }) {
  const { label, tone } = auditDecisionPresentation(decision);
  return <StatusPill label={label} tone={tone} className="font-mono" />;
}
