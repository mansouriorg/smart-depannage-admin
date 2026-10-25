"use client";

import { Pill } from "@/components/finance/ui";
import { ageWords, complaintAgeDays, complaintStatusWords, complaintTone, isOpenComplaint, refundIsToPay, refundStateWords, type ComplaintRow } from "@/lib/shared";
import { cn } from "@/lib/utils";

/** The status of a complaint as a pill: "Remboursement accepté" while the money has not gone back, never a bare "Remboursée". */
export function ComplaintStatusPill({ row }: { row: Pick<ComplaintRow, "status" | "refundDecision"> }) {
  return <Pill tone={complaintTone(row)}>{complaintStatusWords(row)}</Pill>;
}

/** The state of the refund under the status, when one was asked for; amber while it waits for a decision or for the money. */
export function RefundLine({ row, currency }: { row: Pick<ComplaintRow, "status" | "refundRequested" | "refundDecision" | "refundAmount">; currency?: string | null }) {
  const words = refundStateWords(row, currency);

  if (!words) return null;

  // Money to give back is always waiting; a decision is waited for only while the complaint is open (a closed one will not be decided).
  const undecided = row.refundDecision === "PENDING" || (row.refundRequested && row.refundDecision === "NOT_REQUESTED");
  const waiting = refundIsToPay(row) || (undecided && isOpenComplaint(row.status));

  return <p className={cn("mt-1 max-w-[240px] text-xs", waiting ? "font-medium text-amber-800" : "text-stone-500")}>{words}</p>;
}

/** "il y a 5 jours" for a complaint that is still open; a closed one is dated, not timed (the refund route closes without a date). */
export function AgeLine({ createdAt, closedAt, status, now }: { createdAt: string; closedAt: string | null; status: string; now?: Date }) {
  if (closedAt || !isOpenComplaint(status)) return null;

  const words = ageWords(complaintAgeDays(createdAt, now));
  const days = complaintAgeDays(createdAt, now) ?? 0;

  return <span className={cn("text-xs", days >= 3 ? "font-medium text-amber-800" : "text-stone-500")}>Ouverte {words}</span>;
}
