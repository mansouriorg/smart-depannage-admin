import {
  CANONICAL_STATUSES,
  DISPATCH_VIEWS,
  routes,
  staffMayAssign,
  staffStatusMoves,
  statusLabel,
  type CanonicalStatus,
  type DispatchSort,
  type DispatchViewId,
  type InterventionListQuery,
} from "@/lib/shared";

/**
 * The dispatcher's queue (P1-13): the words, the filters and the small rules of the screen, in one
 * place so that they can be tested without a browser. What the server decides (the order, the
 * tabs, the legal moves, who may assign) is read from the shared package, never written out again.
 */

export type Urgency = "NORMAL" | "URGENT" | "EMERGENCY";

export const URGENCY_OPTIONS: ReadonlyArray<{ value: Urgency; label: string }> = [
  { value: "EMERGENCY", label: "Urgence" },
  { value: "URGENT", label: "Urgent" },
  { value: "NORMAL", label: "Normal" },
];

/** A row of the list, as GET /admin/interventions answers it (the columns of the server's list select). */
export interface QueueJob {
  id: number;
  serviceType: string;
  status: string;
  urgency: Urgency | string;
  address: string;
  preferredDate?: string | null;
  preferredStartTime?: string | null;
  preferredEndTime?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  artisanId?: number | null;
  createdAt: string;
  client?: { id: number; name?: string | null; phone?: string | null } | null;
  artisan?: { id: number; name?: string | null; phone?: string | null } | null;
  subService?: { id: number; name?: string | null } | null;
  appointment?: { startsAt?: string | null; endsAt?: string | null; status?: string | null; artisanId?: number | null } | null;
}

/** One artisan proposed for a job, as GET /matching/admin/interventions/:id/artisans answers it. */
export interface ArtisanMatch {
  artisanId: number;
  name?: string | null;
  phone?: string | null;
  /** 0 to 100: the sum of what the matching weighs (trade, distance, zone, hours, approval, rating, load). */
  score: number;
  /** Nothing prevents giving the job to this artisan now. */
  isAvailable: boolean;
  /** The artisan does this kind of work. */
  serviceFit?: boolean;
  /** Null when the job has no coordinates (most requests made on the website). */
  distanceKm: number | null;
  /** Null when the distance is unknown. */
  estimatedArrivalMinutes: number | null;
  /** Whether the position the distance is measured from is up to date, silent for too long, or impossible to date (P3-05). */
  locationState?: "fresh" | "stale" | "unknown";
  locationAgeMinutes?: number | null;
  rating?: number | null;
  completedJobsCount?: number;
  activeJobsCount?: number;
  maxActiveJobs?: number | null;
  /** The obstacles, in French: the job cannot be given to this artisan while there are any. */
  hardIssues?: string[];
  /** Why the score is what it is, in French. */
  reasons?: string[];
}

export interface MatchResult {
  interventionId: number;
  serviceType?: string;
  urgency?: string;
  requestedSlot?: { startsAt: string; endsAt: string } | null;
  matches: ArtisanMatch[];
}

// ----------------------------------------------------------
// The filters of the list
// ----------------------------------------------------------

/** "all" is no tab: every job. */
export type QueueView = DispatchViewId | "all";

export interface QueueFilters {
  view: QueueView;
  /** One status of the tab ("" = the whole tab). */
  status: string;
  urgency: Urgency | "";
  search: string;
  sort: DispatchSort;
  page: number;
  limit: number;
}

export const PAGE_SIZES: readonly number[] = [10, 20, 50];

export const SORT_OPTIONS: ReadonlyArray<{ value: DispatchSort; label: string }> = [
  { value: "queue", label: "Urgence puis ancienneté" },
  { value: "newest", label: "Plus récentes d'abord" },
  { value: "oldest", label: "Plus anciennes d'abord" },
];

/**
 * The order that suits a tab: where work waits for somebody (to assign, quote sent, in progress) the
 * most urgent and the longest waiting come first; in the archives (done, cancelled, disputes, all)
 * the latest come first.
 */
export function defaultSortFor(view: QueueView): DispatchSort {
  return view === "toAssign" || view === "quote" || view === "active" ? "queue" : "newest";
}

export const DEFAULT_FILTERS: QueueFilters = {
  view: "toAssign",
  status: "",
  urgency: "",
  search: "",
  sort: defaultSortFor("toAssign"),
  page: 1,
  limit: 20,
};

/** A tab, with the order that suits it; the status of the previous tab and the page do not follow. */
export function withView(filters: QueueFilters, view: QueueView): QueueFilters {
  return { ...filters, view, status: "", sort: defaultSortFor(view), page: 1 };
}

/** Any other filter changed: the list starts again at the first page. */
export function withFilter(filters: QueueFilters, change: Partial<Omit<QueueFilters, "page">>): QueueFilters {
  return { ...filters, ...change, page: 1 };
}

/** What GET /admin/interventions is asked: only what is set, so that the server's defaults hold for the rest. */
export function queueQuery(filters: QueueFilters): InterventionListQuery {
  const search = filters.search.trim();

  return {
    page: filters.page,
    limit: filters.limit,
    sort: filters.sort,
    ...(filters.view !== "all" ? { view: filters.view } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.urgency ? { urgency: filters.urgency } : {}),
    ...(search ? { search } : {}),
  };
}

/** The statuses the status filter offers: those of the tab, or all of them without one. */
export function statusChoices(view: QueueView): Array<{ value: CanonicalStatus; label: string }> {
  const tab = DISPATCH_VIEWS.find((candidate) => candidate.id === view);
  const statuses: readonly CanonicalStatus[] = tab ? tab.statuses : CANONICAL_STATUSES;

  return statuses.map((value) => ({ value, label: statusLabel(value) }));
}

/** True when the filters are not the ones the screen opens with (the "reset" link shows). */
export function filtersChanged(filters: QueueFilters): boolean {
  return (
    filters.view !== DEFAULT_FILTERS.view ||
    filters.status !== "" ||
    filters.urgency !== "" ||
    filters.search.trim() !== "" ||
    filters.sort !== defaultSortFor(filters.view)
  );
}

// ----------------------------------------------------------
// What a row says
// ----------------------------------------------------------

/** Whole minutes since a moment; null when there is no moment or it is not a date. A moment in the future is 0. */
export function waitingMinutes(since: string | Date | null | undefined, now: number = Date.now()): number | null {
  if (!since) return null;

  const at = since instanceof Date ? since.getTime() : new Date(since).getTime();

  if (!Number.isFinite(at)) return null;

  return Math.max(0, Math.floor((now - at) / 60000));
}

/** "à l'instant", "12 min", "3 h 05", "2 j": how long a job has been waiting. */
export function waitingLabel(minutes: number | null): string {
  if (minutes === null) return "";

  if (minutes < 1) return "à l'instant";

  if (minutes < 60) return `${minutes} min`;

  if (minutes < 24 * 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
  }

  return `${Math.floor(minutes / (24 * 60))} j`;
}

/**
 * "environ 25 min", "environ 1 h 10", and a plain "unknown" when there is none. It is unknown when the
 * request has no map position (most requests made on the website) and also when the technician has no
 * position on record, so the text does not say which.
 */
export function etaLabel(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return "Arrivée inconnue (position manquante)";

  const whole = Math.max(0, Math.round(minutes));

  if (whole < 60) return `environ ${whole} min`;

  const rest = whole % 60;

  return `environ ${Math.floor(whole / 60)} h${rest ? ` ${String(rest).padStart(2, "0")}` : ""}`;
}

/** "6,2 km"; empty when the distance is unknown. */
export function distanceLabel(km: number | null | undefined): string {
  return km === null || km === undefined || !Number.isFinite(km) ? "" : `${km.toFixed(1).replace(".", ",")} km`;
}

export type ScoreTone = "high" | "medium" | "low";

/** How good a match is, for its colour: 75 and above is a good match, 50 and above an acceptable one. */
export function scoreTone(score: number): ScoreTone {
  if (score >= 75) return "high";

  return score >= 50 ? "medium" : "low";
}

/** The person who asked: the account's name, else the name on the form, else a guest. */
export function clientName(job: Pick<QueueJob, "client" | "contactName">): string {
  return job.client?.name?.trim() || job.contactName?.trim() || "Client invité";
}

export function clientPhone(job: Pick<QueueJob, "client" | "contactPhone">): string {
  return job.contactPhone?.trim() || job.client?.phone?.trim() || "";
}

export function artisanName(job: Pick<QueueJob, "artisan" | "artisanId">): string {
  if (job.artisan?.name?.trim()) return job.artisan.name.trim();

  return job.artisanId ? `Technicien n° ${job.artisanId}` : "";
}

// ----------------------------------------------------------
// What can be done with a row
// ----------------------------------------------------------

/** True when the job can be given to a technician (or to another one) in its status. */
export function canAssignJob(job: Pick<QueueJob, "status">): boolean {
  return staffMayAssign(job.status);
}

/** "Assigner le meilleur" for a job nobody has, "Réassigner" for one that has a technician. */
export function assignLabel(job: Pick<QueueJob, "artisanId">): string {
  return job.artisanId ? "Réassigner" : "Assigner le meilleur";
}

export interface StatusMove {
  value: CanonicalStatus;
  label: string;
  /** Cancelling needs the reason (the customer and the technician read it in the timeline). */
  needsReason: boolean;
}

/** How a move reads in the menu: cancelling says what it does. */
export function moveLabel(status: CanonicalStatus): string {
  return status === "CANCELLED" ? "Annuler la demande" : statusLabel(status);
}

/** The statuses the menu offers for this job, and nothing the status table refuses. */
export function statusMovesFor(job: Pick<QueueJob, "status" | "artisanId">): StatusMove[] {
  return staffStatusMoves(job.status, { hasArtisan: Boolean(job.artisanId) }).map((value) => ({
    value,
    label: moveLabel(value),
    needsReason: value === "CANCELLED",
  }));
}

/**
 * What a status panel sends. Cancelling sends the reason (read by the customer and the technician);
 * any other move sends the internal note, if there is one, and never the reason. Both name the status
 * the screen showed, so that a job moved by somebody else meanwhile is refused instead of overwritten.
 */
export function statusRequest(job: QueueJob, move: StatusMove, texts: { note: string; reason: string }) {
  if (move.needsReason) {
    return routes.admin.cancel<QueueJob>(job.id, { reason: texts.reason.trim(), expectedStatus: job.status });
  }

  const note = texts.note.trim();

  return routes.admin.changeStatus<QueueJob>(job.id, { status: move.value, expectedStatus: job.status, ...(note ? { note } : {}) });
}

/**
 * What the assign panel sends: the chosen technician, and who the screen shows as holding the job (null:
 * nobody), so that a job given to somebody else by another dispatcher meanwhile is refused instead of
 * silently taken from them.
 */
export function assignRequest(job: QueueJob, artisanId: number) {
  return routes.matching.assign<QueueJob>(job.id, artisanId, { expectedArtisanId: job.artisanId ?? null });
}

/**
 * The job of an open panel: its newest copy in the list; when the list no longer has it (a new emergency
 * pushed it to the next page, somebody moved it to another tab), the last copy held, marked `stale` so
 * that the panel says its information may be out of date. `settled` is false while a load is under way
 * (the rows are then about to change, and nothing is said yet).
 */
export function panelJob(kept: QueueJob | null, rows: readonly QueueJob[], settled: boolean): { job: QueueJob | null; stale: boolean } {
  if (kept === null) return { job: null, stale: false };

  const live = rows.find((row) => row.id === kept.id);

  return live ? { job: live, stale: false } : { job: kept, stale: settled };
}

/** The copy kept for a panel after the list was loaded: the newest copy when the page has the job, else the one it had. */
export function keptCopy(kept: QueueJob | null, rows: readonly QueueJob[]): QueueJob | null {
  if (kept === null) return null;

  return rows.find((row) => row.id === kept.id) ?? kept;
}

/** The panel after a request for `doneId` is over: closed if it is still about that job, left alone if it has moved to another. */
export function afterDone(kept: QueueJob | null, doneId: number): QueueJob | null {
  return kept !== null && kept.id === doneId ? null : kept;
}

/**
 * The first match that can be given the job: the one "assign the best" proposes. `currentArtisanId`
 * is the technician who already holds the job (when it is given to another one): not them again.
 */
export function bestMatch(matches: readonly ArtisanMatch[], currentArtisanId?: number | null): ArtisanMatch | null {
  return matches.find((match) => isChoosable(match, currentArtisanId)) ?? null;
}

/** An artisan the job can be given to: free, doing this kind of work, and not the one who already has it. */
export function isChoosable(match: ArtisanMatch, currentArtisanId?: number | null): boolean {
  return match.isAvailable === true && match.serviceFit !== false && !holdsJob(match, currentArtisanId);
}

function holdsJob(match: ArtisanMatch, currentArtisanId?: number | null): boolean {
  return currentArtisanId !== null && currentArtisanId !== undefined && match.artisanId === currentArtisanId;
}

/** Why a match cannot be chosen, in French; empty when it can. */
export function whyNotChoosable(match: ArtisanMatch, currentArtisanId?: number | null): string {
  if (isChoosable(match, currentArtisanId)) return "";

  if (holdsJob(match, currentArtisanId)) return "A déjà cette demande";

  if (match.serviceFit === false) return "Ne fait pas ce métier";

  return match.hardIssues?.[0] ?? "Indisponible";
}

// ----------------------------------------------------------
// Lists of choices, by keyboard
// ----------------------------------------------------------

export type ChoiceMove = "next" | "previous" | "first" | "last";

/** Which of `count` choices an arrow key lands on, from the one that has focus (-1 when none has). */
export function stepIndex(count: number, current: number, move: ChoiceMove): number {
  if (count <= 0) return -1;

  if (move === "first") return 0;

  if (move === "last") return count - 1;

  if (current < 0 || current >= count) return move === "next" ? 0 : count - 1;

  return move === "next" ? (current + 1) % count : (current - 1 + count) % count;
}

// ----------------------------------------------------------
// The technician's visit
// ----------------------------------------------------------

/** A visit that is over or cancelled is no longer "the next visit". */
const VISIT_ENDED = ["CANCELLED", "COMPLETED", "NO_SHOW"];

/**
 * When the technician who has the job is due, or null: the visit must belong to the technician who has
 * the job now (a visit left by a technician who gave it back is not the new one's) and must not be over.
 */
export function visitTime(job: Pick<QueueJob, "artisanId" | "appointment">): string | null {
  const visit = job.appointment;

  if (!visit?.startsAt || !job.artisanId) return null;

  if (visit.artisanId !== job.artisanId) return null;

  return VISIT_ENDED.includes(String(visit.status)) ? null : visit.startsAt;
}
