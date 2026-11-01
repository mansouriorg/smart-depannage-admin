import { Radio } from "lucide-react";

import { positionBadgeOf } from "@/lib/technicians";
import type { PositionState, StatusTone } from "@/lib/shared";
import { cn } from "@/lib/utils";

const TONE: Record<StatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-300 bg-amber-50 text-amber-800",
  waiting: "border-stone-200 bg-stone-50 text-stone-500",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  active: "border-blue-950 bg-blue-950 text-white",
  danger: "border-red-200 bg-red-50 text-red-700",
};

/**
 * Whether the position of a technician can be trusted (P3-05): up to date, silent for too long, or impossible to date. `quiet` shows nothing for
 * a position that is up to date (a list in which every row would say so is noise); the words and the limit come from the server.
 */
export function PositionBadge({
  state,
  ageMinutes,
  quiet = false,
  missing = false,
  className,
}: {
  state?: PositionState | string | null;
  ageMinutes?: number | null;
  quiet?: boolean;
  /** The phone never sent a position at all (a technician who is expected to send one): said in the same amber. */
  missing?: boolean;
  className?: string;
}) {
  if (missing) {
    return (
      <span
        className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", TONE.warning, className)}
        title="Le téléphone de ce technicien n’a encore envoyé aucune position : la localisation est peut-être refusée ou l’application n’a pas été ouverte."
      >
        <Radio className="h-3 w-3" />
        Aucune position reçue
      </span>
    );
  }

  const flag = positionBadgeOf(state, ageMinutes, quiet);

  if (!flag) return null;

  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", TONE[flag.tone], className)}
      title={flag.state === "stale" ? "Le téléphone n’a pas donné de nouvelles depuis longtemps : la position affichée peut ne plus être la bonne." : undefined}
    >
      <Radio className="h-3 w-3" />
      {flag.label}
      {flag.detail ? ` · ${flag.detail}` : ""}
    </span>
  );
}
