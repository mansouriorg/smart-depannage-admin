"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import api from "@/lib/api";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_VIEWS,
  INVOICE_VIEW_LABELS,
  callApi,
  canCreditNote,
  invoiceStatusLabel,
  invoiceTone,
  moneyText,
  momentText,
  routes,
  type InvoiceRow,
  type InvoiceView,
} from "@/lib/shared";
import { creditNoteSpec } from "@/lib/finance-actions";
import { ActionDialog, type ActionSpec } from "@/components/finance/action-dialog";
import { useFinance } from "@/components/finance/finance-context";
import { useFinanceData } from "@/components/finance/use-finance-data";
import { useFinanceParams, useSearchBox } from "@/components/finance/use-finance-params";
import { DownloadButton } from "@/components/finance/csv-button";
import { MissionLink } from "@/components/finance/mission-link";
import { Empty, ErrorBox, Loading, Notice, Pager, Pill } from "@/components/finance/ui";
import { cn } from "@/lib/utils";

const viewOf = (text: string): InvoiceView => ((INVOICE_VIEWS as readonly string[]).includes(text) ? (text as InvoiceView) : "all");

export default function FinanceInvoicesPage() {
  const { get, update, problem, listPeriod } = useFinanceParams();
  const { reloadSummary } = useFinance();
  const view = viewOf(get("view"));
  const status = get("status");
  const search = get("search");
  const page = Math.max(1, Number.parseInt(get("page"), 10) || 1);

  const [typed, setTyped] = useSearchBox(search, update);

  // A search looks at every date: finding one invoice by its number does not depend on the week.
  const period = search ? {} : listPeriod;

  const query = useMemo(() => ({ ...period, view, status: status || undefined, search: search || undefined, page: page > 1 ? page : undefined }), [period, view, status, search, page]);
  const { data, error, busy, reload } = useFinanceData(
    () => (problem ? Promise.resolve(null) : callApi((config) => api.request(config), routes.finance.invoices(query))),
    JSON.stringify(query) + problem,
    "Impossible de charger les factures.",
  );

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

  if (problem) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Vue" className="flex flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1">
          {INVOICE_VIEWS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => update({ view: id === "all" ? undefined : id })}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", view === id ? "bg-blue-950 text-white" : "text-stone-600 hover:bg-stone-100")}
            >
              {INVOICE_VIEW_LABELS[id]}
            </button>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Rechercher une facture</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="N° de facture, mission, client, téléphone…"
              maxLength={100}
              className="w-72 rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
            />
          </label>
          <label className="sr-only" htmlFor="invoices-status">
            Statut
          </label>
          <select id="invoices-status" value={status} onChange={(event) => update({ status: event.target.value })} className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/50">
            <option value="">Tous les statuts</option>
            {Object.entries(INVOICE_STATUS_LABELS)
              .filter(([id]) => id !== "DRAFT")
              .map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
          </select>
        </div>
      </div>

      {view === "unpaid" ? (
        <Notice>Les factures impayées s’affichent quelle que soit leur date d’émission : tant qu’elles ne sont pas payées, elles restent à suivre.</Notice>
      ) : view === "credited" && !search ? (
        <Notice>Les factures qui ont reçu un avoir sur la période, quelle que soit leur date d’émission : c’est la date de l’avoir qui compte.</Notice>
      ) : search ? (
        <Notice>La recherche porte sur toutes les dates, quelle que soit la période choisie ci-dessus.</Notice>
      ) : null}

      {done && <Notice>{done}</Notice>}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {(!data && !error) || gone ? (
        <Loading />
      ) : data ? (
        <section className={cn("overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm", busy && "opacity-70 transition-opacity")} aria-busy={busy}>
          {data.items.length === 0 ? (
            <Empty>Aucune facture ne correspond à ces filtres.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left">
                <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Facture</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Montants</th>
                    <th className="px-4 py-3">Avoirs</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                  {data.items.map((invoice) => (
                    <InvoiceLine
                      key={invoice.id}
                      invoice={invoice}
                      locked={busy}
                      onCredit={() => {
                        setDone(null);
                        setSpec(creditNoteSpec(invoice));
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 bg-stone-50 px-4 py-2 text-sm">
            <span className="text-stone-500">
              {view === "unpaid"
                ? `Reste à payer sur les ${data.total} facture${data.total === 1 ? "" : "s"} de la liste (après ce que les missions ont déjà reçu)`
                : view === "credited"
                  ? `Repris par les avoirs des ${data.total} facture${data.total === 1 ? "" : "s"} de la liste (timbre compris, ceux des jours choisis)`
                  : `Facturé sur les ${data.total} facture${data.total === 1 ? "" : "s"} de la liste (annulées exclues, timbre compris, avoirs déduits)`}
            </span>
            {data.amount !== null && <strong className="tabular-nums text-blue-950">{moneyText(data.amount)}</strong>}
          </div>
          <Pager page={data.page} pages={data.pages} total={data.total} limit={data.limit} busy={busy} onPage={(next) => update({ page: next })} noun={["facture", "factures"]} />
        </section>
      ) : null}

      <ActionDialog
        spec={spec}
        onClose={() => setSpec(null)}
        onDone={() => {
          setSpec(null);
          setDone("L’avoir est émis.");
          refresh();
        }}
        onRefused={refresh}
      />
    </div>
  );
}

function InvoiceLine({ invoice, locked, onCredit }: { invoice: InvoiceRow; locked: boolean; onCredit: () => void }) {
  const money = (value: number) => moneyText(value, invoice.currency);

  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <p className="font-semibold text-blue-950">{invoice.number}</p>
        <MissionLink id={invoice.interventionId}>Mission n° {invoice.interventionId}</MissionLink>
        <p className="mt-0.5 text-xs text-stone-500">Émise le {momentText(invoice.issuedAt) ?? "—"}</p>
        <div className="mt-1">
          <DownloadButton compact route={routes.finance.invoicePdf(invoice.id)} fallbackName={`${invoice.number}.pdf`} label={`PDF de la facture ${invoice.number}`}>
            PDF
          </DownloadButton>
        </div>
      </td>
      <td className="px-4 py-3">
        <p>{invoice.clientName ?? "—"}</p>
        {invoice.clientPhone && <p className="text-xs text-stone-500">{invoice.clientPhone}</p>}
      </td>
      <td className="px-4 py-3">
        <Pill tone={invoiceTone(invoice.status)}>{invoiceStatusLabel(invoice.status)}</Pill>
        {invoice.paidAt && <p className="mt-1 text-xs text-stone-500">Payée le {momentText(invoice.paidAt)}</p>}
        {invoice.cancelReason && <p className="mt-1 max-w-[220px] text-xs text-stone-500">{invoice.cancelReason}</p>}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        <dl className="ml-auto grid max-w-[260px] grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-xs">
          <dt className="text-left text-stone-500">Total TTC</dt>
          <dd>{money(invoice.amountTTC)}</dd>
          {invoice.stampDuty > 0 && (
            <>
              <dt className="text-left text-stone-500">Timbre</dt>
              <dd>{money(invoice.stampDuty)}</dd>
            </>
          )}
          {invoice.credited > 0 && (
            <>
              <dt className="text-left text-stone-500">Avoirs</dt>
              <dd>− {money(invoice.credited)}</dd>
            </>
          )}
          <dt className="text-left font-semibold text-stone-700">À payer</dt>
          <dd className="font-semibold text-blue-950">{money(invoice.toPay)}</dd>
          <dt className="text-left text-stone-500">Reçu</dt>
          <dd>{money(invoice.received)}</dd>
          <dt className="text-left font-semibold text-stone-700">Reste</dt>
          <dd className={cn("font-semibold", invoice.left !== null && invoice.left > 0 ? "text-amber-800" : "text-emerald-700")}>{invoice.left === null ? "—" : money(invoice.left)}</dd>
        </dl>
      </td>
      <td className="px-4 py-3 text-xs">
        {invoice.creditNotes.length === 0 ? (
          <span className="text-stone-400">—</span>
        ) : (
          <ul className="space-y-1">
            {invoice.creditNotes.map((note) => (
              <li key={note.id}>
                <span className="font-semibold text-stone-700">{note.number}</span> · {money(note.amountTTC + note.stampDuty)}
                {note.issuedAt && <span className="text-stone-500"> · {momentText(note.issuedAt)}</span>}
                <br />
                <span className="text-stone-500">{note.reason}</span>
                <br />
                <DownloadButton compact route={routes.finance.creditNotePdf(note.id)} fallbackName={`${note.number}.pdf`} label={`PDF de l’avoir ${note.number}`}>
                  PDF
                </DownloadButton>
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {canCreditNote(invoice) && (
          <button
            type="button"
            onClick={onCredit}
            disabled={locked}
            aria-label={`Émettre un avoir · facture ${invoice.number}`}
            className="rounded-md border border-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Émettre un avoir
          </button>
        )}
      </td>
    </tr>
  );
}
