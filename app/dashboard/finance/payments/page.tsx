"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import api from "@/lib/api";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_VIEWS,
  PAYMENT_VIEW_LABELS,
  callApi,
  moneyText,
  momentText,
  paymentActions,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentTone,
  routes,
  waitingWords,
  PAYMENT_ACTION_LABELS,
  type PaymentAction,
  type PaymentRow,
  type PaymentView,
} from "@/lib/shared";
import { paymentSpec } from "@/lib/finance-actions";
import { ActionDialog, type ActionSpec } from "@/components/finance/action-dialog";
import { DownloadButton } from "@/components/finance/csv-button";
import { useFinance } from "@/components/finance/finance-context";
import { useFinanceData } from "@/components/finance/use-finance-data";
import { useFinanceParams, useSearchBox } from "@/components/finance/use-finance-params";
import { MissionLink } from "@/components/finance/mission-link";
import { Empty, ErrorBox, Loading, Notice, Pager, Pill } from "@/components/finance/ui";
import { cn } from "@/lib/utils";

const viewOf = (text: string): PaymentView => (PAYMENT_VIEWS as readonly string[]).includes(text) ? (text as PaymentView) : "all";

/** The date the row is about, by tab: when it was confirmed (received), given back (refunded), else asked for: the date the list is ordered by. */
function dateOf(payment: PaymentRow, view: PaymentView): string | null {
  if (view === "refunded") return payment.refundedAt;
  if (view === "received") return payment.confirmedAt;

  return payment.requestedAt;
}

/** What the figure under the list adds up, by tab (the server gives no figure for the tab of all: payments that failed do not add up). */
const AMOUNT_LABELS: Partial<Record<PaymentView, string>> = {
  awaiting: "Demandé sur",
  received: "Reçu sur",
  refunded: "Remboursé sur",
};

/** Which date puts a payment in the period of each view (the summary counts by the day of confirmation, so the views say which day theirs is). */
const DATE_WORDS: Record<PaymentView, string> = {
  all: "Dans « Tous », un paiement est classé au jour où il a été demandé. « Reçus » le classe au jour de sa confirmation, comme le résumé, et « Remboursés » au jour de son dernier remboursement.",
  awaiting: "",
  received: "Un paiement est classé au jour où il a été confirmé, comme dans le résumé.",
  refunded: "Un paiement est classé au jour de son dernier remboursement, pour son montant remboursé en entier.",
};

/** The last number the database holds in a column of whole numbers. */
const MAX_JOB_NUMBER = 2_147_483_647;

export default function FinancePaymentsPage() {
  const { get, update, problem, listPeriod, linkTo } = useFinanceParams();
  const { reloadSummary } = useFinance();
  const view = viewOf(get("view"));
  const method = get("method");
  const search = get("search");
  // The payments of one job (the complaint screen links to them): the number of the job, whatever the date.
  const jobText = get("job");
  const job = /^[1-9]\d{0,9}$/.test(jobText) && Number(jobText) <= MAX_JOB_NUMBER ? Number(jobText) : null;
  const sort = get("sort") === "newest" || get("sort") === "oldest" ? get("sort") : "";
  const page = Math.max(1, Number.parseInt(get("page"), 10) || 1);

  // The search box follows the address, and the address follows the box a moment after the last key.
  const [typed, setTyped] = useSearchBox(search, update);

  // A search looks at every date: finding one payment by its reference does not depend on the week. Neither does a job.
  const period = search || job !== null ? {} : listPeriod;

  const query = useMemo(
    () => ({ ...period, view, method: method || undefined, search: search || undefined, interventionId: job ?? undefined, sort: (sort || undefined) as "newest" | "oldest" | undefined, page: page > 1 ? page : undefined }),
    [period, view, method, search, job, sort, page],
  );
  const key = JSON.stringify(query) + problem;
  const { data, error, busy, reload } = useFinanceData(() => (problem ? Promise.resolve(null) : callApi((config) => api.request(config), routes.finance.payments(query))), key, "Impossible de charger les paiements.");

  // After an action on the only row of the last page, that page is gone: go to the one that is now the last.
  const gone = data !== null && data.items.length === 0 && data.total > 0 && data.page > data.pages;

  useEffect(() => {
    if (gone && data) update({ page: data.pages });
  }, [gone, data, update]);

  const [spec, setSpec] = useState<ActionSpec<unknown> | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const refresh = () => {
    reload();
    reloadSummary();
  };

  const open = (action: PaymentAction, payment: PaymentRow) => {
    setDone(null);
    setSpec(paymentSpec(action, payment));
  };

  if (problem) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Vue" className="flex flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1">
          {PAYMENT_VIEWS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => update({ view: id === "all" ? undefined : id })}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", view === id ? "bg-blue-950 text-white" : "text-stone-600 hover:bg-stone-100")}
            >
              {PAYMENT_VIEW_LABELS[id]}
            </button>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Rechercher un paiement</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="Mission, client, téléphone, référence…"
              maxLength={100}
              className="w-72 rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
            />
          </label>
          <label className="sr-only" htmlFor="payments-method">
            Mode de paiement
          </label>
          <select id="payments-method" value={method} onChange={(event) => update({ method: event.target.value })} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/50">
            <option value="">Tous les modes</option>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="payments-sort">
            Ordre
          </label>
          <select id="payments-sort" value={sort} onChange={(event) => update({ sort: event.target.value })} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/50">
            <option value="">{view === "awaiting" ? "Les plus anciens d’abord" : "Les plus récents d’abord"}</option>
            <option value={view === "awaiting" ? "newest" : "oldest"}>{view === "awaiting" ? "Les plus récents d’abord" : "Les plus anciens d’abord"}</option>
          </select>
          <DownloadButton route={routes.finance.exportPayments({ ...period, view, method: method || undefined, search: search || undefined, interventionId: job ?? undefined })} fallbackName={`paiements-${view}.csv`}>
            Exporter en CSV
          </DownloadButton>
        </div>
      </div>

      {job !== null && (
        <Notice>
          <span data-testid="payments-job">Paiements de la mission n° {job} seulement, quelle que soit leur date.</span>{" "}
          <button type="button" onClick={() => update({ job: undefined })} className="font-medium text-blue-900 underline underline-offset-2">
            Voir tous les paiements
          </button>
        </Notice>
      )}
      {jobText !== "" && job === null && (
        <Notice tone="warning">
          <span data-testid="payments-job-bad">« {jobText} » n’est pas un numéro de mission : il est ignoré.</span>{" "}
          <button type="button" onClick={() => update({ job: undefined })} className="font-medium text-blue-900 underline underline-offset-2">
            Retirer
          </button>
        </Notice>
      )}
      {view === "awaiting" ? (
        <Notice>Les paiements à confirmer s’affichent quelle que soit la date où ils ont été demandés : un paiement qui attend doit être traité.</Notice>
      ) : search ? (
        <Notice>La recherche porte sur toutes les dates, quelle que soit la période choisie ci-dessus.</Notice>
      ) : job !== null ? null : (
        <Notice>{DATE_WORDS[view]}</Notice>
      )}

      {done && <Notice>{done}</Notice>}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {(!data && !error) || gone ? (
        <Loading />
      ) : data ? (
        <section className={cn("overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm", busy && "opacity-70 transition-opacity")} aria-busy={busy}>
          {data.items.length === 0 ? (
            <Empty>{view === "awaiting" ? "Aucun paiement n’attend de confirmation." : "Aucun paiement ne correspond à ces filtres."}</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left">
                <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Paiement</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                    <th className="px-4 py-3">Facture</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                  {data.items.map((payment) => (
                    <PaymentLine key={payment.id} payment={payment} view={view} locked={busy} onAction={open} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-stone-50 px-4 py-2 text-sm">
            <span className="text-stone-500">
              {data.amount === null ? `${data.total} paiement${data.total === 1 ? "" : "s"} dans la liste` : `${AMOUNT_LABELS[view] ?? "Total"} ${data.total} paiement${data.total === 1 ? "" : "s"} (en dinars)`}
            </span>
            {data.amount !== null && <strong className="tabular-nums text-blue-950">{moneyText(data.amount)}</strong>}
          </div>
          <Pager page={data.page} pages={data.pages} total={data.total} limit={data.limit} busy={busy} onPage={(next) => update({ page: next })} noun={["paiement", "paiements"]} />
        </section>
      ) : null}

      <p className="text-xs text-stone-500">
        Les factures et les avoirs sont dans l’onglet{" "}
        <Link href={linkTo("/dashboard/finance/invoices")} className="font-medium text-blue-900 underline underline-offset-2">
          Factures
        </Link>
        .
      </p>

      <ActionDialog
        spec={spec}
        onClose={() => setSpec(null)}
        onDone={() => {
          const action = spec?.title ?? "";

          setSpec(null);
          setDone(`${action} : c’est fait.`);
          refresh();
        }}
        onRefused={refresh}
      />
    </div>
  );
}

function PaymentLine({ payment, view, locked, onAction }: { payment: PaymentRow; view: PaymentView; locked: boolean; onAction: (action: PaymentAction, payment: PaymentRow) => void }) {
  const actions = paymentActions(payment);
  const waiting = waitingWords(payment);
  const date = dateOf(payment, view);

  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <p className="font-semibold text-blue-950">n° {payment.id}</p>
        <MissionLink id={payment.interventionId}>Mission n° {payment.interventionId}</MissionLink>
        <p className="mt-0.5 text-xs text-stone-500">{momentText(date) ?? "—"}</p>
      </td>
      <td className="px-4 py-3">
        <p>{payment.client?.name ?? "—"}</p>
        {payment.client?.phone && <p className="text-xs text-stone-500">{payment.client.phone}</p>}
        {payment.artisan?.name && <p className="text-xs text-stone-500">Technicien : {payment.artisan.name}</p>}
      </td>
      <td className="px-4 py-3">
        <p>{paymentMethodLabel(payment.method)}</p>
        {payment.reference && <p className="text-xs text-stone-500">Réf. {payment.reference}</p>}
        {payment.receiptNumber && <p className="text-xs text-stone-500">Reçu {payment.receiptNumber}</p>}
      </td>
      <td className="px-4 py-3">
        <Pill tone={paymentTone(payment.status)}>{paymentStatusLabel(payment.status)}</Pill>
        {waiting && <p className="mt-1 max-w-[220px] text-xs text-amber-800">{waiting}</p>}
        {payment.reason && <p className="mt-1 max-w-[220px] text-xs text-stone-500">Motif : {payment.reason}</p>}
        {payment.adminNote && <p className="mt-1 max-w-[220px] text-xs text-stone-500">Note : {payment.adminNote}</p>}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        <p className="font-semibold text-blue-950">{moneyText(payment.amount, payment.currency)}</p>
        {payment.amountRefunded > 0 && <p className="text-xs text-stone-500">Remboursé : {moneyText(payment.amountRefunded, payment.currency)}</p>}
      </td>
      <td className="px-4 py-3 text-xs">{payment.invoice ? <span className="font-medium text-stone-700">{payment.invoice.number}</span> : <span className="text-stone-400">—</span>}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap justify-end gap-1.5">
          {actions.map((action) => (
            <button
              key={action}
              type="button"
              disabled={locked}
              aria-label={`${PAYMENT_ACTION_LABELS[action]} · paiement n° ${payment.id}`}
              onClick={() => onAction(action, payment)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                action === "confirm" ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : action === "refund" ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" : "border-stone-200 text-stone-700 hover:bg-stone-50",
              )}
            >
              {PAYMENT_ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
}
