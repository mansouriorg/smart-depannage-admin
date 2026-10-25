"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/shared";

const TONES: Record<StatusTone, string> = {
  waiting: "bg-stone-100 text-stone-600 border-stone-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  active: "bg-blue-50 text-blue-800 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
};

/** A status as a small pill; the tone says whether it needs a look. */
export function Pill({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap", TONES[tone])}>{children}</span>;
}

/** A figure of the summary, with a label and an optional line under it; a link when it leads somewhere. */
export function Stat({ label, value, hint, href, tone = "plain" }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: "plain" | "warning" | "danger" }) {
  const body = (
    <div
      className={cn(
        "h-full rounded-xl border bg-white p-4 shadow-sm transition-colors",
        tone === "warning" && "border-amber-300 bg-amber-50/60",
        tone === "danger" && "border-red-300 bg-red-50/60",
        tone === "plain" && "border-stone-200",
        href && "hover:border-[#D4AF37]/60",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-blue-950 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );

  return href ? (
    <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/50 rounded-xl">
      {body}
    </Link>
  ) : (
    body
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p>{message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold underline underline-offset-2">
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex h-[30vh] items-center justify-center" role="status" aria-label="Chargement">
      <Loader2 className="h-7 w-7 animate-spin text-[#D4AF37]" />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 py-14 text-center text-sm text-stone-500">{children}</div>;
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning"; children: ReactNode }) {
  return (
    <p role="status" className={cn("rounded-lg border p-3 text-sm", tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-sky-200 bg-sky-50 text-sky-800")}>
      {children}
    </p>
  );
}

/** "21 à 40 sur 133", the previous and the next page. */
export function Pager({ page, pages, total, limit, busy, onPage, noun }: { page: number; pages: number; total: number; limit: number; busy?: boolean; onPage: (page: number) => void; noun: [string, string] }) {
  const first = total === 0 ? 0 : (page - 1) * limit + 1;
  const last = Math.min(total, page * limit);

  return (
    <div className="flex flex-col gap-3 border-t border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
      <span aria-live="polite">{total === 0 ? `Aucun ${noun[0]}` : `${first} à ${last} sur ${total} ${total === 1 ? noun[0] : noun[1]}`}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onPage(page - 1)} disabled={busy || page <= 1} aria-label="Page précédente" className="rounded-md border border-stone-200 bg-white p-1.5 text-stone-600 hover:border-[#D4AF37]/50 disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[88px] text-center font-medium text-stone-600">
          Page {page} sur {pages}
        </span>
        <button type="button" onClick={() => onPage(page + 1)} disabled={busy || page >= pages} aria-label="Page suivante" className="rounded-md border border-stone-200 bg-white p-1.5 text-stone-600 hover:border-[#D4AF37]/50 disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Tabs that are links (the address holds the tab). */
export function Tabs<Id extends string>({ tabs, current, hrefFor, label }: { tabs: ReadonlyArray<{ id: Id; label: string; count?: number | null }>; current: Id; hrefFor: (id: Id) => string; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={hrefFor(tab.id)}
          replace
          scroll={false}
          aria-current={tab.id === current ? "page" : undefined}
          className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", tab.id === current ? "bg-blue-950 text-white" : "text-stone-600 hover:bg-stone-100")}
        >
          {tab.label}
          {typeof tab.count === "number" && tab.count > 0 && " "}
          {typeof tab.count === "number" && tab.count > 0 && <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-bold", tab.id === current ? "bg-white/20" : "bg-amber-100 text-amber-800")}>{tab.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
