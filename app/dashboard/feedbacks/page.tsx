"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import api from "@/lib/api";
import {
  REVIEW_ACTION_LABELS,
  REVIEW_RATING_CHOICES,
  REVIEW_SORTS,
  REVIEW_SORT_LABELS,
  REVIEW_STATUSES,
  REVIEW_STATUS_LABELS,
  callApi,
  dayText,
  isReviewStatus,
  momentText,
  ratingFilterLabel,
  reviewActions,
  reviewCriteriaWords,
  reviewStatusLabel,
  reviewTone,
  routes,
  searchTextOf,
  serviceNameOf,
  starsText,
  type ReviewAction,
  type ReviewRow,
  type ReviewSort,
  type ReviewStatus,
} from "@/lib/shared";
import { useStaff } from "@/components/auth/staff-provider";
import { ActionDialog, type ActionSpec } from "@/components/finance/action-dialog";
import { useFinanceData } from "@/components/finance/use-finance-data";
import { useRefocusAfterAction } from "@/components/finance/use-refocus";
import { useFinanceParams, useSearchBox } from "@/components/finance/use-finance-params";
import { MissionLink } from "@/components/finance/mission-link";
import { Empty, ErrorBox, Loading, Notice, Pager, Pill } from "@/components/finance/ui";
import { moderationSpec } from "@/lib/complaint-actions";
import { cn } from "@/lib/utils";

const TAKE = 20;

type Tab = ReviewStatus | "all";

const HINTS: Record<Tab, string> = {
  PENDING: "Les avis que les clients viennent d’écrire. Aucun n’est visible ni compté dans la note d’un technicien avant votre décision.",
  APPROVED: "Les avis publiés : ils comptent dans la note des techniciens.",
  REJECTED: "Les avis refusés : ils ne s’affichent pas et ne comptent pas dans la note ; leur auteur les voit toujours. La raison est gardée pour l’équipe seule.",
  HIDDEN: "Les avis retirés de l’affichage après publication : leur auteur les voit toujours. La raison est gardée pour l’équipe seule.",
  all: "Tous les avis, quel que soit leur statut.",
};

const EMPTY: Record<Tab, string> = {
  PENDING: "Aucun avis n’attend de décision.",
  APPROVED: "Aucun avis publié ne correspond à ces filtres.",
  REJECTED: "Aucun avis refusé ne correspond à ces filtres.",
  HIDDEN: "Aucun avis masqué ne correspond à ces filtres.",
  all: "Aucun avis ne correspond à ces filtres.",
};

/** The reviews customers wrote after their jobs, and the decision on each (P2-09). The address holds the tab, the search, the filter and the page. */
export default function ReviewModerationPage() {
  const { get, update } = useFinanceParams();
  const { can } = useStaff();
  const status: Tab = get("status") === "all" ? "all" : isReviewStatus(get("status")) ? (get("status") as ReviewStatus) : "PENDING";
  const search = searchTextOf(get("search"));
  const best = Number.parseInt(get("rating"), 10);
  const maxRating = best >= 1 && best <= 4 ? best : 5;
  const sort: ReviewSort | "" = (REVIEW_SORTS as readonly string[]).includes(get("sort")) ? (get("sort") as ReviewSort) : "";
  const page = Math.max(1, Number.parseInt(get("page"), 10) || 1);
  const [typed, setTyped] = useSearchBox(search, update);
  const waitingFirst = status === "PENDING";

  const query = useMemo(
    () => ({ status: status === "all" ? undefined : status, search: search || undefined, maxRating, sort: sort || (waitingFirst ? ("oldest" as const) : undefined), skip: (page - 1) * TAKE, take: TAKE }),
    [status, search, maxRating, sort, waitingFirst, page],
  );
  const key = JSON.stringify(query);
  const { data, error, busy, reload } = useFinanceData(() => callApi((config) => api.request(config), routes.reviews.queue(query)), key, "Impossible de charger les avis.");

  const pages = data ? Math.max(1, Math.ceil(data.total / TAKE)) : 1;
  const gone = data !== null && data.items.length === 0 && data.total > 0 && page > pages;

  useEffect(() => {
    if (gone) update({ page: pages });
  }, [gone, pages, update]);

  const refocus = useRefocusAfterAction(data, busy);
  const [spec, setSpec] = useState<ActionSpec<unknown> | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const open = (action: ReviewAction, review: ReviewRow) => {
    setDone(null);
    setSpec(moderationSpec(action, review));
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 data-dialog-fallback tabIndex={-1} className="text-xl font-bold text-blue-950 outline-none">Avis &amp; Retours</h1>
        <p className="mt-1 text-sm text-stone-500">Les avis des clients : vous décidez de ce qui est publié et compté dans la note des techniciens.</p>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <nav aria-label="Statut" className="flex flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1">
          {([...REVIEW_STATUSES, "all"] as Tab[]).map((id) => {
            const count = data?.counts[id];

            return (
              <button
                key={id}
                type="button"
                aria-pressed={status === id}
                onClick={() => update({ status: id === "PENDING" ? undefined : id })}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", status === id ? "bg-blue-950 text-white" : "text-stone-600 hover:bg-stone-100")}
              >
                {id === "all" ? "Tous" : REVIEW_STATUS_LABELS[id]}
                {typeof count === "number" && count > 0 && id === "PENDING" && <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-bold", status === id ? "bg-white/20" : "bg-amber-100 text-amber-800")}>{count}</span>}
              </button>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Rechercher un avis</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="Texte, client, technicien, n° de mission…"
              maxLength={100}
              className="w-72 rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
            />
          </label>
          <label className="sr-only" htmlFor="reviews-rating">
            Note
          </label>
          <select id="reviews-rating" value={maxRating} onChange={(event) => update({ rating: Number(event.target.value) >= 5 ? undefined : event.target.value })} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/50">
            {[...REVIEW_RATING_CHOICES].reverse().map((choice) => (
              <option key={choice} value={choice}>
                {ratingFilterLabel(choice)}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="reviews-sort">
            Ordre
          </label>
          <select id="reviews-sort" value={sort} onChange={(event) => update({ sort: event.target.value })} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/50">
            <option value="">{waitingFirst ? REVIEW_SORT_LABELS.oldest : REVIEW_SORT_LABELS.newest}</option>
            <option value={waitingFirst ? "newest" : "oldest"}>{waitingFirst ? REVIEW_SORT_LABELS.newest : REVIEW_SORT_LABELS.oldest}</option>
          </select>
        </div>
      </div>

      <Notice>{HINTS[status]}</Notice>
      {done && <Notice>{done}</Notice>}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {(!data && !error) || gone ? (
        <Loading />
      ) : data ? (
        <section className={cn("overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm", busy && "opacity-70 transition-opacity")} aria-busy={busy}>
          {data.items.length === 0 ? (
            <Empty>{search || maxRating < 5 ? "Aucun avis ne correspond à cette recherche." : EMPTY[status]}</Empty>
          ) : (
            <ul className="divide-y divide-stone-100">
              {data.items.map((review) => (
                <ReviewItem key={review.id} review={review} canDecide={can("moderateReview")} locked={busy} onAction={open} />
              ))}
            </ul>
          )}
          <Pager page={page} pages={pages} total={data.total} limit={TAKE} busy={busy} onPage={(next) => update({ page: next })} noun={["avis", "avis"]} />
        </section>
      ) : null}

      <ActionDialog
        spec={spec}
        onClose={() => setSpec(null)}
        onDone={() => {
          const title = spec?.title ?? "";

          setSpec(null);
          setDone(`${title} : c’est fait.`);
          refocus();
          reload();
        }}
        onRefused={reload}
      />
    </div>
  );
}

function ReviewItem({ review, canDecide, locked, onAction }: { review: ReviewRow; canDecide: boolean; locked: boolean; onAction: (action: ReviewAction, review: ReviewRow) => void }) {
  const actions = canDecide ? reviewActions(review.status) : [];
  const criteria = reviewCriteriaWords(review);

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="text-lg tracking-wide text-[#B69121]" aria-label={`${review.rating} sur 5`}>
              {starsText(review.rating)}
            </span>
            <Pill tone={reviewTone(review.status)}>{reviewStatusLabel(review.status)}</Pill>
            <span className="text-xs text-stone-500">n° {review.id} · {dayText(review.createdAt) ?? ""}</span>
          </p>
          <p className="mt-1 text-sm text-stone-700">
            <strong>{review.client?.name ?? "Client"}</strong> sur <strong>{review.artisan?.name ?? "—"}</strong>
            {" · "}
            <MissionLink id={review.interventionId} className="text-blue-900 underline-offset-2 hover:underline">
              Mission n° {review.interventionId}
            </MissionLink>
            {review.intervention?.serviceType ? ` · ${serviceNameOf(review.intervention.serviceType)}` : ""}
          </p>
          {review.comment ? <p className="mt-2 whitespace-pre-wrap text-sm text-stone-800">« {review.comment} »</p> : <p className="mt-2 text-sm italic text-stone-400">Pas de commentaire.</p>}
          {criteria && <p className="mt-1 text-xs text-stone-500">{criteria}</p>}
          {review.moderationReason && (
            <p className="mt-2 rounded-lg border border-stone-200 bg-stone-50 p-2 text-xs text-stone-600">
              Raison : {review.moderationReason}
              {review.moderatedAt ? ` · ${momentText(review.moderatedAt)}` : ""}
            </p>
          )}
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {actions.map((action) => (
              <button
                key={action}
                type="button"
                disabled={locked}
                aria-label={`${REVIEW_ACTION_LABELS[action]} · avis n° ${review.id}`}
                onClick={() => onAction(action, review)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  action === "approve" ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-stone-200 text-stone-700 hover:bg-stone-50",
                )}
              >
                {REVIEW_ACTION_LABELS[action]}
              </button>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
