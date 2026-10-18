"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageMeta } from "@/lib/shared";
import { PAGE_SIZES } from "@/lib/dispatch";

interface PaginationProps {
  meta: PageMeta;
  /** A request is on its way: the buttons wait. */
  busy?: boolean;
  onPage: (page: number) => void;
  onLimit: (limit: number) => void;
}

/** "21 à 40 sur 133", the previous and the next page, and how many rows a page holds. */
export function Pagination({ meta, busy = false, onPage, onLimit }: PaginationProps) {
  const first = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.total, meta.page * meta.limit);
  const pages = Math.max(1, meta.totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-stone-200 bg-stone-50 px-6 py-4 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
      <span aria-live="polite">
        {meta.total === 0 ? "Aucune demande" : `${first} à ${last} sur ${meta.total} ${meta.total === 1 ? "demande" : "demandes"}`}
      </span>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <span>Par page</span>
          <select
            value={meta.limit}
            onChange={(event) => onLimit(Number(event.target.value))}
            disabled={busy}
            className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 disabled:opacity-50"
          >
            {(PAGE_SIZES.includes(meta.limit) ? PAGE_SIZES : [...PAGE_SIZES, meta.limit].sort((a, b) => a - b)).map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPage(meta.page - 1)}
            disabled={busy || meta.page <= 1}
            aria-label="Page précédente"
            className="rounded-md border border-stone-200 bg-white p-1.5 text-stone-600 hover:border-[#D4AF37]/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[88px] text-center font-medium text-stone-600">
            Page {meta.page} sur {pages}
          </span>
          <button
            type="button"
            onClick={() => onPage(meta.page + 1)}
            disabled={busy || meta.page >= pages}
            aria-label="Page suivante"
            className="rounded-md border border-stone-200 bg-white p-1.5 text-stone-600 hover:border-[#D4AF37]/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
