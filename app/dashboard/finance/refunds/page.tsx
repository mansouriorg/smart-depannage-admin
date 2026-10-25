"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { callApi, moneyText, momentText, paymentMethodLabel, routes, type RefundDueRow } from "@/lib/shared";
import { refundDueSpec } from "@/lib/finance-actions";
import { ActionDialog } from "@/components/finance/action-dialog";
import { useFinance } from "@/components/finance/finance-context";
import { useFinanceData } from "@/components/finance/use-finance-data";
import { MissionLink } from "@/components/finance/mission-link";
import { Empty, ErrorBox, Loading, Notice, Stat } from "@/components/finance/ui";
import { cn } from "@/lib/utils";

/**
 * The money to give back: the customer has paid more than the invoice now asks, after a credit note, or a refund accepted on one of
 * their complaints (P2-09) has not all gone back. This list does not depend on the period: a refund that is owed stays owed until it
 * is made.
 */
export default function FinanceRefundsPage() {
  const { reloadSummary } = useFinance();
  const { data, error, busy, reload } = useFinanceData(() => callApi((config) => api.request(config), routes.finance.refundsDue()), "refunds-due", "Impossible de charger les remboursements.");
  // The form follows the list: after a refusal the list is loaded again and the form offers what is left to give back (a refund
  // made in several steps that stopped half way), keeping what was typed.
  // If the list cannot be loaded again after a refusal (the network is still down), the form stays on the row it was opened on:
  // closing it would lose the warning about a refund that stopped half way ("Déjà remboursé : ..."). A list that did load and no
  // longer has the row is another matter: nothing is left to give back, and the form goes.
  const [opened, setOpened] = useState<RefundDueRow | null>(null);
  const openRow = data ? (data.items.find((item) => item.interventionId === opened?.interventionId) ?? null) : opened;
  const spec = useMemo(() => (openRow ? refundDueSpec(openRow) : null), [openRow]);
  const [done, setDone] = useState<string | null>(null);

  const refresh = () => {
    reload();
    reloadSummary();
  };

  return (
    <div className="space-y-4">
      <Notice>
        Un avoir réduit ce que le client doit. S’il avait déjà payé plus, l’écart est à lui rendre. Un remboursement accepté sur une réclamation y figure aussi. Chaque ligne reste ici jusqu’à ce que le remboursement soit fait, quelle que soit la date de l’avoir ou de la décision.
      </Notice>

      {done && <Notice>{done}</Notice>}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {!data && !error ? (
        <Loading />
      ) : data ? (
        <div className={cn("space-y-4", busy && "opacity-70 transition-opacity")} aria-busy={busy}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Stat label="Missions à rembourser" value={data.total} tone={data.total > 0 ? "warning" : "plain"} />
            <Stat label="À rendre aux clients" value={moneyText(data.amount)} tone={data.total > 0 ? "warning" : "plain"} />
          </div>

          {data.items.length === 0 ? (
            <Empty>Aucun remboursement à faire : aucun client n’a payé plus que ce qui lui est demandé, et aucun remboursement accepté sur une réclamation n’attend.</Empty>
          ) : (
            <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left">
                  <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="px-4 py-3">Mission</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Origine</th>
                      <th className="px-4 py-3 text-right">Gardé</th>
                      <th className="px-4 py-3 text-right">Dû</th>
                      <th className="px-4 py-3 text-right">À rendre</th>
                      <th className="px-4 py-3">Paiements</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                    {data.items.map((row) => (
                      <tr key={row.interventionId} className="align-top">
                        <td className="px-4 py-3">
                          <MissionLink id={row.interventionId} className="font-semibold text-blue-900 underline-offset-2 hover:underline">
                            n° {row.interventionId}
                          </MissionLink>
                          {row.invoice ? <p className="text-xs text-stone-500">Facture {row.invoice.number}</p> : <p className="max-w-[200px] text-xs text-amber-800">Aucune facture en cours : vérifiez que la mission ne continue pas (nouvelle facture à venir) avant de rembourser.</p>}
                          {row.since && <p className="text-xs text-stone-500">Depuis le {momentText(row.since)}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p>{row.client?.name ?? "—"}</p>
                          {row.client?.phone && <p className="text-xs text-stone-500">{row.client.phone}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <ul className="space-y-0.5">
                            {row.creditNotes.map((note) => (
                              <li key={note.id}>
                                Avoir <span className="font-semibold text-stone-700">{note.number}</span> · {moneyText(note.amount)}
                              </li>
                            ))}
                            {row.complaints.map((complaint) => (
                              <li key={`complaint-${complaint.id}`}>
                                <Link href={`/dashboard/complaints/${complaint.id}`} className="font-semibold text-blue-900 underline-offset-2 hover:underline">
                                  Réclamation n° {complaint.id}
                                </Link>{" "}
                                · accepté {moneyText(complaint.accepted)}
                                {complaint.remaining < complaint.accepted ? `, reste ${moneyText(complaint.remaining)}` : ""}
                                {complaint.decidedAt && <span className="block text-stone-500">décidé le {momentText(complaint.decidedAt)}</span>}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{moneyText(row.kept)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{moneyText(row.owed)}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-amber-800">{moneyText(row.due)}</td>
                        <td className="px-4 py-3 text-xs">
                          <ul className="space-y-0.5">
                            {row.payments.map((payment) => (
                              <li key={payment.id}>
                                n° {payment.id} · {paymentMethodLabel(payment.method)} · {moneyText(payment.refundable)} à rendre au plus
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={busy}
                            aria-label={`Rembourser · mission n° ${row.interventionId}`}
                            onClick={() => {
                              setDone(null);
                              setOpened(row);
                            }}
                            className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Rembourser
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      ) : null}

      <ActionDialog
        spec={spec}
        onClose={() => setOpened(null)}
        onDone={() => {
          setOpened(null);
          setDone("Le remboursement est fait.");
          refresh();
        }}
        onRefused={refresh}
      />
    </div>
  );
}
