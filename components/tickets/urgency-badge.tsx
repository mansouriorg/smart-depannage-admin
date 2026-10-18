import { AlertTriangle, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/** The urgency of a job: nothing for a normal one, so that the urgent ones stand out in a long list. */
export function UrgencyBadge({ urgency }: { urgency: string }) {
  if (urgency === "EMERGENCY") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-700">
        <Flame className="h-3 w-3" /> Urgence
      </span>
    );
  }

  if (urgency === "URGENT") {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-orange-700")}>
        <AlertTriangle className="h-3 w-3" /> Urgent
      </span>
    );
  }

  return null;
}
