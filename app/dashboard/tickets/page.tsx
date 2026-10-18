"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { apiErrorMessage, callApi, routes, statusLabel, type PageMeta } from "@/lib/shared";
import { useStaff } from "@/components/auth/staff-provider";
import { connectLiveSocket } from "@/lib/socket";
import {
  DEFAULT_FILTERS,
  afterDone,
  keptCopy,
  panelJob,
  queueQuery,
  withFilter,
  withView,
  type ArtisanMatch,
  type QueueFilters,
  type QueueJob,
  type QueueView,
  type StatusMove,
} from "@/lib/dispatch";
import { TicketTable } from "@/components/tickets/ticket-table";
import { QueueToolbar } from "@/components/tickets/queue-toolbar";
import { Pagination } from "@/components/tickets/pagination";
import { AssignDialog } from "@/components/tickets/assign-dialog";
import { StatusDialog } from "@/components/tickets/status-dialog";
import { CreateTicketModal } from "@/components/tickets/create-ticket-modal";

/** The list follows the search box this long after the last key. */
const SEARCH_DELAY_MS = 350;

/** A burst of live events (a job created, three status changes) loads the list once. */
const LIVE_REFRESH_DELAY_MS = 800;

const EMPTY_TEXT: Record<QueueView, string> = {
  toAssign: "Aucune demande à assigner : la file est vide.",
  quote: "Aucun devis en attente de réponse.",
  active: "Aucune intervention en cours.",
  done: "Aucune intervention terminée.",
  cancelled: "Aucune demande annulée.",
  disputed: "Aucun litige.",
  all: "Aucune demande trouvée.",
};

export default function TicketsPage() {
  const { can } = useStaff();

  const [filters, setFilters] = useState<QueueFilters>(DEFAULT_FILTERS);
  const [searchText, setSearchText] = useState(DEFAULT_FILTERS.search);
  const [rows, setRows] = useState<QueueJob[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  /** The rows on screen belong to the filters on screen (false until a load succeeds, and after one fails on new filters). */
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // The job of an open panel: the copy that was clicked, kept up to date from the list (see below).
  const [assigningJob, setAssigningJob] = useState<QueueJob | null>(null);
  const [changingJob, setChangingJob] = useState<QueueJob | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The panels show the job as the list holds it now (a live refresh updates it under them), not the
  // copy that was clicked: a status menu built from an old copy could offer a move that is now wrong.
  // A job that is not on the page any more (a new emergency pushed it to the next page, somebody moved
  // it to another tab) keeps its panel open with the last copy, and the panel says so: closing it under
  // the person's hand, in the middle of a choice or of a request, would be worse. The server checks
  // again whatever is confirmed (the status the person saw, the technician who held the job).
  const settled = loaded && !loading && !refreshing;
  const { job: assigning, stale: assigningStale } = panelJob(assigningJob, rows, settled);
  const { job: changing, stale: changingStale } = panelJob(changingJob, rows, settled);

  const latest = useRef(0);
  const shown = useRef<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // --- The list -----------------------------------------------------------

  const load = useCallback(async (query: QueueFilters) => {
    const mine = ++latest.current;

    setRefreshing(true);
    setError(null);

    try {
      const page = await callApi((config) => api.request(config), routes.admin.interventions<QueueJob>(queueQuery(query)));

      // Another request was started since (a filter changed): its answer is the one to show.
      if (mine !== latest.current) return;

      const data = Array.isArray(page?.data) ? page.data : [];
      const pageMeta = page?.meta ?? null;

      // The last page emptied (the jobs on it were assigned): go to the new last page.
      if (data.length === 0 && pageMeta && pageMeta.total > 0 && pageMeta.page > Math.max(1, pageMeta.totalPages)) {
        setFilters((current) => (current.page === query.page ? { ...current, page: Math.max(1, pageMeta.totalPages) } : current));
        return;
      }

      shown.current = JSON.stringify(queueQuery(query));
      setRows(data);
      setMeta(pageMeta);
      setLoaded(true);
    } catch (failure) {
      if (mine !== latest.current) return;

      console.error("Error fetching the queue:", failure);

      // Rows that belong to another tab or another search must not stay on screen under this one.
      if (shown.current !== JSON.stringify(queueQuery(query))) {
        shown.current = null;
        setRows([]);
        setMeta(null);
        setLoaded(false);
      }

      setError(apiErrorMessage(failure, "Impossible de charger les demandes."));
    } finally {
      if (mine === latest.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  // The newest version of "load this list again" for the timers and the live events below.
  const reloadRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    reloadRef.current = () => void load(filters);
  }, [filters, load]);

  // --- The search box -------------------------------------------------------

  useEffect(() => {
    if (searchText.trim() === filters.search.trim()) return;

    const timer = setTimeout(() => setFilters((current) => withFilter(current, { search: searchText })), SEARCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [searchText, filters.search]);

  // --- Ages follow the clock; live events refresh the list -----------------------

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60000);

    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const socket = connectLiveSocket();

    if (!socket) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => reloadRef.current(), LIVE_REFRESH_DELAY_MS);
    };

    socket.on("admin.intervention.created", refresh);
    socket.on("admin.intervention.status.changed", refresh);

    return () => {
      clearTimeout(timer);
      socket.disconnect();
    };
  }, []);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  // --- What the person does -------------------------------------------------

  const tell = useCallback((text: string) => {
    clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = setTimeout(() => setNotice(null), 6000);
  }, []);

  // Each panel closes only if it still belongs to the job it was opened for.
  const onAssigned = (job: QueueJob, artisan: ArtisanMatch) => {
    setAssigningJob((current) => afterDone(current, job.id));
    tell(`${artisan.name?.trim() || `Le technicien n° ${artisan.artisanId}`} est assigné à la demande n° ${job.id}.`);
    reloadRef.current();
  };

  const onChanged = (job: QueueJob, move: StatusMove) => {
    setChangingJob((current) => afterDone(current, job.id));
    tell(move.needsReason ? `La demande n° ${job.id} est annulée.` : `Demande n° ${job.id} : ${statusLabel(move.value)}.`);
    reloadRef.current();
  };

  // The copy kept for a panel follows the list: when the job is on the page, its newest version.
  useEffect(() => {
    setAssigningJob((current) => keptCopy(current, rows));
    setChangingJob((current) => keptCopy(current, rows));
  }, [rows]);

  const reset = () => {
    setSearchText("");
    setFilters((current) => ({ ...DEFAULT_FILTERS, limit: current.limit }));
  };

  const searchNow = () => setFilters((current) => (current.search === searchText ? current : withFilter(current, { search: searchText })));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* --- PAGE HEADER --- */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          {/* data-dialog-fallback: where the focus goes when a panel closes and the button that opened it is gone. */}
          <h1 tabIndex={-1} data-dialog-fallback className="text-3xl font-bold tracking-tight text-blue-950 outline-none">
            Interventions
          </h1>
          <p className="mt-1 text-stone-500" aria-live="polite">
            {meta
              ? `${meta.total} ${meta.total === 1 ? "demande" : "demandes"}${filters.view === "all" ? "" : " dans cette file"}.`
              : "Chargement de la file…"}
          </p>
        </div>

        <CreateTicketModal onSuccess={() => reloadRef.current()} />
      </div>

      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {notice}
        </div>
      )}

      <QueueToolbar
        filters={filters}
        searchText={searchText}
        busy={refreshing}
        onView={(view) => setFilters((current) => withView(current, view))}
        onStatus={(status) => setFilters((current) => withFilter(current, { status }))}
        onUrgency={(urgency) => setFilters((current) => withFilter(current, { urgency }))}
        onSort={(sort) => setFilters((current) => withFilter(current, { sort }))}
        onSearchText={setSearchText}
        onSearchNow={searchNow}
        onReset={reset}
        onRefresh={() => reloadRef.current()}
      />

      {(loading || (refreshing && !loaded)) && (
        <div className="flex flex-col items-center justify-center space-y-4 py-20">
          <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
          <p className="font-medium text-stone-500">Récupération des données...</p>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </span>
          <button type="button" onClick={() => reloadRef.current()} className="text-sm font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {!loading && loaded && (
        <div>
          <TicketTable
            rows={rows}
            refreshing={refreshing}
            now={now}
            canAssign={can("assignTicket")}
            canChange={can("changeTicket")}
            onAssign={(job) => setAssigningJob(job)}
            onChangeStatus={(job) => setChangingJob(job)}
            emptyText={filters.status || filters.urgency || filters.search.trim() ? "Aucune demande ne correspond à ces filtres." : EMPTY_TEXT[filters.view]}
          />
          {rows.length === 0 && filters.search.trim() !== "" && filters.view !== "all" && !error && (
            <div className="border-x border-stone-200 bg-stone-50 px-5 py-3 text-sm text-stone-600">
              La recherche ne porte que sur cette file.{" "}
              <button type="button" onClick={() => setFilters((current) => withView(current, "all"))} className="font-semibold text-[#B69121] underline">
                Chercher dans toutes les demandes
              </button>
            </div>
          )}
          {meta && (
            <div className="overflow-hidden rounded-b-xl border border-t-0 border-stone-200">
              <Pagination
                meta={meta}
                busy={refreshing}
                onPage={(page) => setFilters((current) => ({ ...current, page: Math.max(1, page) }))}
                onLimit={(limit) => setFilters((current) => ({ ...current, limit, page: 1 }))}
              />
            </div>
          )}
        </div>
      )}

      <AssignDialog job={assigning} stale={assigningStale} onClose={() => setAssigningJob(null)} onAssigned={onAssigned} onRefused={() => reloadRef.current()} />
      <StatusDialog job={changing} stale={changingStale} onClose={() => setChangingJob(null)} onChanged={onChanged} onRefused={() => reloadRef.current()} />
    </div>
  );
}
