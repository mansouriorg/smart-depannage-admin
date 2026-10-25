"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import {
  countText,
  moneyText,
  momentText,
  paymentMethodLabel,
  reconciliationLines,
  shortDay,
  summaryProblems,
  type FinanceSummary,
} from "@/lib/shared";
import { useFinance } from "@/components/finance/finance-context";
import { useFinanceParams } from "@/components/finance/use-finance-params";
import { ErrorBox, Loading, Notice, Stat } from "@/components/finance/ui";

const BASE = "/dashboard/finance";

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <h2 className="border-b border-stone-200 px-4 py-3 text-sm font-bold text-blue-950">{title}</h2>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

const th = "px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-stone-500";
const td = "px-4 py-2 text-sm text-stone-700 tabular-nums";
const num = "text-right";

/** The week at a glance: what waits for the team first, then the figures a week is reconciled with. */
export default function FinanceSummaryPage() {
  const { problem, linkTo } = useFinanceParams();
  const { summary, summaryError, summaryBusy, reloadSummary } = useFinance();

  if (problem) return null;
  if (summaryError && !summary) return <ErrorBox message={summaryError} onRetry={reloadSummary} />;
  if (!summary) return <Loading />;

  return <Summary summary={summary} busy={summaryBusy} error={summaryError} reload={reloadSummary} linkTo={linkTo} />;
}

function Summary({ summary, busy, error, reload, linkTo }: { summary: FinanceSummary; busy: boolean; error: string | null; reload: () => void; linkTo: (path: string, extra?: Record<string, string>, withPeriod?: boolean) => string }) {
  const money = (value: number) => moneyText(value, summary.currency);
  // Every tile leads to its tab with the days the figure was made over (the summary's own, also when none is in the address), so
  // that the list holds what the tile counts and the tab "Résumé" is found again on the same days.
  // While the next summary loads, the one on screen is about the days that were asked before: its tiles are not links (a click
  // would carry the old days to the tab), and they are again when the new figures are there.
  const toTab = (path: string, extra: Record<string, string> = {}): string | undefined => (busy ? undefined : linkTo(path, { from: summary.period.from, to: summary.period.to, ...extra }, false));
  const dayHref = (day: string) => toTab(`${BASE}/payments`, { view: "received", from: day, to: day });
  const problems = summaryProblems(summary);
  const lines = reconciliationLines(summary);
  const nothingToDo = summary.awaiting.count === 0 && summary.refundsDue.count === 0;

  return (
    <div className={busy ? "space-y-5 opacity-70 transition-opacity" : "space-y-5"} aria-busy={busy}>
      {error && <ErrorBox message={error} onRetry={reload} />}

      {problems.length > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Ces chiffres ne sont pas cohérents entre eux : à vérifier avant de s’y fier.</p>
            <ul className="mt-1 list-disc pl-5">
              {problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <section aria-label="À traiter" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">À traiter</h2>
          <button type="button" onClick={reload} disabled={busy} className="rounded-md border border-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50">
            Actualiser les chiffres
          </button>
        </div>
        {nothingToDo ? (
          <Notice>Rien n’attend l’équipe : aucun paiement à confirmer, aucun remboursement à faire.</Notice>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Paiements à confirmer"
            value={summary.awaiting.count}
            tone={summary.awaiting.count > 0 ? "warning" : "plain"}
            href={toTab(`${BASE}/payments`, { view: "awaiting" })}
            hint={
              summary.awaiting.count > 0
                ? `${money(summary.awaiting.amount)}${summary.awaiting.oldestAt ? ` · le plus ancien : ${momentText(summary.awaiting.oldestAt)}` : ""}`
                : "Tout est décidé"
            }
          />
          <Stat
            label="Remboursements à faire"
            value={summary.refundsDue.count}
            tone={summary.refundsDue.count > 0 ? "warning" : "plain"}
            href={toTab(`${BASE}/refunds`)}
            hint={summary.refundsDue.count > 0 ? `${money(summary.refundsDue.amount)} à rendre aux clients` : "Aucun remboursement à faire"}
          />
          <Stat
            label="Factures impayées"
            value={summary.invoices.unpaid.count}
            href={toTab(`${BASE}/invoices`, { view: "unpaid" })}
            hint={summary.invoices.unpaid.count > 0 ? `${money(summary.invoices.unpaid.left)} restent à payer` : "Aucune facture en attente"}
          />
          <Stat
            label="Commission à récupérer"
            value={money(summary.cash.commissionOwed)}
            href={toTab(`${BASE}/cash`)}
            hint={`${countText(summary.cash.artisansOwing, "artisan doit", "artisans doivent")} une commission sur les espèces encaissées`}
          />
        </div>
      </section>

      <section aria-label="Réconciliation de la période" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TableCard title="Réconciliation de la période">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Ligne</th>
                <th className={`${th} ${num}`}>Paiements</th>
                <th className={`${th} ${num}`}>Montant</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.label} className={line.strong ? "border-t-2 border-stone-300 bg-stone-50 font-bold text-blue-950" : "border-t border-stone-100"}>
                  <td className={td}>{line.label}</td>
                  <td className={`${td} ${num}`}>{line.count === null ? "" : line.count}</td>
                  <td className={`${td} ${num}`}>{money(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-stone-500">Un paiement compte le jour où il a été confirmé. Un paiement remboursé en plusieurs fois est compté en entier, le jour de son dernier remboursement. Jours comptés à l’heure de Tunis.</p>
        </TableCard>

        <TableCard title="Reçu par mode de paiement">
          {summary.received.byMethod.length === 0 ? (
            <p className="px-4 py-6 text-sm text-stone-500">Aucun paiement reçu sur cette période.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Mode</th>
                  <th className={`${th} ${num}`}>Paiements</th>
                  <th className={`${th} ${num}`}>Montant</th>
                </tr>
              </thead>
              <tbody>
                {summary.received.byMethod.map((method) => (
                  <tr key={method.method} className="border-t border-stone-100">
                    <td className={td}>{paymentMethodLabel(method.method)}</td>
                    <td className={`${td} ${num}`}>{method.count}</td>
                    <td className={`${td} ${num}`}>{money(method.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {summary.awaiting.byMethod.length > 0 && (
            <div className="border-t border-stone-200 bg-amber-50/50 px-4 py-3 text-xs text-amber-900">
              <p className="font-semibold">En attente de confirmation</p>
              <ul className="mt-1 space-y-0.5">
                {summary.awaiting.byMethod.map((method) => (
                  <li key={method.method}>
                    {paymentMethodLabel(method.method)} : {countText(method.count, "paiement", "paiements")}, {money(method.amount)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TableCard>
      </section>

      <TableCard title="Jour par jour">
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>Jour</th>
              <th className={`${th} ${num}`}>Paiements reçus</th>
              <th className={`${th} ${num}`}>Reçu</th>
              <th className={`${th} ${num}`}>Remboursé</th>
            </tr>
          </thead>
          <tbody>
            {summary.days.map((day) => (
              <tr key={day.day} className="border-t border-stone-100">
                <td className={td}>
                  {dayHref(day.day) ? (
                    <Link href={dayHref(day.day) as string} className="font-medium text-blue-900 underline-offset-2 hover:underline">
                      {shortDay(day.day)}
                    </Link>
                  ) : (
                    <span className="font-medium text-blue-900">{shortDay(day.day)}</span>
                  )}
                </td>
                <td className={`${td} ${num}`}>{day.count}</td>
                <td className={`${td} ${num}`}>{money(day.received)}</td>
                <td className={`${td} ${num}`}>{day.refunded === 0 ? "—" : money(day.refunded)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-stone-300 bg-stone-50 font-bold text-blue-950">
              <td className={td}>Total</td>
              <td className={`${td} ${num}`}>{summary.received.count}</td>
              <td className={`${td} ${num}`}>{money(summary.received.amount)}</td>
              <td className={`${td} ${num}`}>{money(summary.refunded.amount)}</td>
            </tr>
          </tfoot>
        </table>
      </TableCard>

      <section aria-label="Factures et reversements" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Factures émises" value={summary.invoices.issued.count} hint={`${money(summary.invoices.issued.total)} facturés (timbre compris, hors annulées sans avoir)`} href={toTab(`${BASE}/invoices`)} />
        <Stat label="Avoirs émis" value={summary.invoices.creditNotes.count} hint={`${money(summary.invoices.creditNotes.total)} repris`} href={toTab(`${BASE}/invoices`, { view: "credited" })} />
        <Stat label="Reversements à payer" value={summary.payouts.open.count} tone={summary.payouts.open.count > 0 ? "warning" : "plain"} hint={`${money(summary.payouts.open.net)} aux artisans`} href={toTab(`${BASE}/payouts`)} />
        <Stat label="Reversements payés" value={summary.payouts.paid.count} hint={`${money(summary.payouts.paid.net)} sur la période`} href={toTab(`${BASE}/payouts`, { view: "paid" })} />
      </section>
    </div>
  );
}
