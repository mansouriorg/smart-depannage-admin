"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import api from "@/lib/api";
import {
  COMPLAINT_SORTS,
  COMPLAINT_SORT_LABELS,
  COMPLAINT_VIEWS,
  COMPLAINT_VIEW_HINTS,
  COMPLAINT_VIEW_LABELS,
  callApi,
  complaintPeopleWords,
  dayText,
  isComplaintSort,
  isComplaintView,
  routes,
  searchTextOf,
  serviceNameOf,
  type ComplaintRow,
  type ComplaintSort,
  type ComplaintView,
} from "@/lib/shared";
import { useStaff } from "@/components/auth/staff-provider";
import { AgeLine, ComplaintStatusPill, RefundLine } from "@/components/complaints/complaint-bits";
import { useFinanceData } from "@/components/finance/use-finance-data";
import { useFinanceParams, useSearchBox } from "@/components/finance/use-finance-params";
import { MissionLink } from "@/components/finance/mission-link";
import { Empty, ErrorBox, Loading, Notice, Pager } from "@/components/finance/ui";
import { cn } from "@/lib/utils";

const EMPTY_WORDS: Record<ComplaintView, string> = {
  todo: "Aucune réclamation à traiter.",
  decide: "Aucun remboursement n’attend de décision.",
  pay: "Aucun remboursement accepté n’attend d’être versé.",
  unassigned: "Toutes les réclamations ouvertes ont un responsable.",
  closed: "Aucune réclamation clôturée ne correspond à ces filtres.",
  all: "Aucune réclamation ne correspond à ces filtres.",
};

/** The complaints of the customers (P2-09): the work queue of the team, by view, with a search. The address holds the view, the search and the page. */
export default function ComplaintsPage() {
  const { get, update } = useFinanceParams();
  const { user } = useStaff();
  const view: ComplaintView = isComplaintView(get("view")) ? (get("view") as ComplaintView) : "todo";
  const search = searchTextOf(get("search"));
  const mine = get("mine") === "true";
  const sort: ComplaintSort | "" = isComplaintSort(get("sort")) ? (get("sort") as ComplaintSort) : "";
  const page = Math.max(1, Number.parseInt(get("page"), 10) || 1);
  const [typed, setTyped] = useSearchBox(search, update);

  // The work queues show the oldest complaint first (it has waited the longest); the server's own order is the newest first, so the
  // order the select announces is asked for, not left to the server.
  const queue = view === "todo" || view === "decide" || view === "pay" || view === "unassigned";
  const query = useMemo(
    () => ({ view, search: search || undefined, mine: mine || undefined, sort: sort || (queue ? ("oldest" as const) : undefined), page: page > 1 ? page : undefined }),
    [view, search, mine, sort, queue, page],
  );
  const key = JSON.stringify(query);
  const { data, error, busy, reload } = useFinanceData(() => callApi((config) => api.request(config), routes.complaints.list(query)), key, "Impossible de charger les réclamations.");

  // After the last row of the last page was dealt with, that page is gone: go to the one that is now the last.
  const gone = data !== null && data.data.length === 0 && data.meta.total > 0 && data.meta.page > data.meta.totalPages;

  useEffect(() => {
    if (gone && data) update({ page: data.meta.totalPages });
  }, [gone, data, update]);

  return (
    <div className="space-y-4">
      <div>
        <h1 data-dialog-fallback tabIndex={-1} className="text-xl font-bold text-blue-950 outline-none">Réclamations</h1>
        <p className="mt-1 text-sm text-stone-500">Ce que les clients signalent après une mission : à traiter, à décider, à rembourser.</p>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <nav aria-label="Vue" className="flex flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1">
          {COMPLAINT_VIEWS.map((id) => {
            const count = data?.counts[id];

            return (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => update({ view: id === "todo" ? undefined : id })}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", view === id ? "bg-blue-950 text-white" : "text-stone-600 hover:bg-stone-100")}
              >
                {COMPLAINT_VIEW_LABELS[id]}
                {typeof count === "number" && count > 0 && id !== "all" && id !== "closed" && (
                  <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-bold", view === id ? "bg-white/20" : "bg-amber-100 text-amber-800")}>{count}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Rechercher une réclamation</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="N°, mission, client, technicien, téléphone…"
              maxLength={100}
              className="w-72 rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
            <input type="checkbox" checked={mine} disabled={!user} onChange={(event) => update({ mine: event.target.checked ? "true" : undefined })} className="h-4 w-4 rounded border-stone-300" />
            Les miennes
          </label>
          <label className="sr-only" htmlFor="complaints-sort">
            Ordre
          </label>
          <select id="complaints-sort" value={sort} onChange={(event) => update({ sort: event.target.value })} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/50">
            <option value="">{queue ? COMPLAINT_SORT_LABELS.oldest : COMPLAINT_SORT_LABELS.newest}</option>
            {COMPLAINT_SORTS.filter((id) => (id === "oldest") !== queue).map((id) => (
              <option key={id} value={id}>
                {COMPLAINT_SORT_LABELS[id]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Notice>{COMPLAINT_VIEW_HINTS[view]}</Notice>

      {error && <ErrorBox message={error} onRetry={reload} />}

      {(!data && !error) || gone ? (
        <Loading />
      ) : data ? (
        <section className={cn("overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm", busy && "opacity-70 transition-opacity")} aria-busy={busy}>
          {data.data.length === 0 ? (
            <Empty>{search || mine ? "Aucune réclamation ne correspond à cette recherche." : EMPTY_WORDS[view]}</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Réclamation</th>
                    <th className="px-4 py-3">Personnes</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Responsable</th>
                    <th className="px-4 py-3 text-right">Ouverte le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                  {data.data.map((row) => (
                    <ComplaintLine key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager page={data.meta.page} pages={Math.max(data.meta.totalPages, 1)} total={data.meta.total} limit={data.meta.limit} busy={busy} onPage={(next) => update({ page: next })} noun={["réclamation", "réclamations"]} />
        </section>
      ) : null}
    </div>
  );
}

function ComplaintLine({ row }: { row: ComplaintRow }) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <Link href={`/dashboard/complaints/${row.id}`} className="font-semibold text-blue-950 underline-offset-2 hover:underline">
          n° {row.id} · {row.title}
        </Link>
        <p className="mt-0.5 text-xs text-stone-500">
          <MissionLink id={row.interventionId}>Mission n° {row.interventionId}</MissionLink>
          {row.intervention.serviceType ? ` · ${serviceNameOf(row.intervention.serviceType)}` : ""}
        </p>
        <AgeLine createdAt={row.createdAt} closedAt={row.closedAt} status={row.status} />
      </td>
      <td className="px-4 py-3 text-sm">{complaintPeopleWords(row) || "—"}</td>
      <td className="px-4 py-3">
        <ComplaintStatusPill row={row} />
        <RefundLine row={row} />
      </td>
      <td className="px-4 py-3 text-sm">{row.assignedTo ? row.assignedTo.name || `Agent n° ${row.assignedTo.id}` : <span className="text-amber-800">Personne</span>}</td>
      <td className="px-4 py-3 text-right text-xs text-stone-500">{dayText(row.createdAt) ?? "—"}</td>
    </tr>
  );
}
