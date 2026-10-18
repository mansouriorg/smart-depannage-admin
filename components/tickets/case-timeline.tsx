"use client";

import { useState } from "react";
import { EyeOff } from "lucide-react";
import { formatDateTime } from "@/lib/proofs";
import { TIMELINE_FILTERS, personLabel, timelineCounts, timelineView, type CaseLine, type TimelineFilter } from "@/lib/casefile";
import { cn } from "@/lib/utils";

interface CaseTimelineProps {
  lines: readonly CaseLine[];
}

/**
 * The history of the job, oldest first (P1-14). A line that the customer and the technician do not
 * read is marked "Interne" and has its own tint, so that the team never mistakes what is for them
 * for what the customer was told; the three buttons show everything, only what the people of the
 * job also read, or only what is for the team.
 */
export function CaseTimeline({ lines }: CaseTimelineProps) {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const counts = timelineCounts(lines);
  const shown = timelineView(lines, filter);

  return (
    <div>
      <div role="group" aria-label="Lignes à afficher" className="mb-4 flex flex-wrap gap-2">
        {TIMELINE_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.hint}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              filter === option.value
                ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#8a6d12]"
                : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50",
            )}
          >
            {option.label} <span className="font-normal">({counts[option.value]})</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-4 text-center text-sm text-stone-500">
          {lines.length === 0 ? "Aucune ligne dans l'historique de cette demande." : "Aucune ligne de ce type."}
        </p>
      ) : (
        <ol className="space-y-3">
          {shown.map((line) => (
            <li
              key={line.id}
              className={cn(
                "rounded-lg border p-3 text-sm",
                line.internal ? "border-amber-200 bg-amber-50/60" : "border-stone-100 bg-stone-50",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="font-semibold text-blue-950">{line.title}</p>
                <time dateTime={line.createdAt} className="text-xs text-stone-500">
                  {formatDateTime(line.createdAt)}
                </time>
              </div>
              {line.message ? <p className="mt-1 whitespace-pre-wrap break-words text-stone-700">{line.message}</p> : null}
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span>{personLabel(line.author)}</span>
                {line.internal ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                    <EyeOff className="h-3 w-3" aria-hidden="true" /> Interne — ni le client ni le technicien ne le lisent
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
