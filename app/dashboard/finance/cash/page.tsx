"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import {
  appendEntries,
  callApi,
  cashOverview,
  entryWords,
  momentText,
  moneyText,
  owingArtisans,
  routes,
  type ArtisanBalance,
  type ArtisanLedger,
  type LedgerEntry,
} from "@/lib/shared";
import { remittanceSpec } from "@/lib/finance-actions";
import { ActionDialog, type ActionSpec } from "@/components/finance/action-dialog";
import { useFinance } from "@/components/finance/finance-context";
import { MissionLink } from "@/components/finance/mission-link";
import { useFinanceData } from "@/components/finance/use-finance-data";
import { Empty, ErrorBox, Loading, Notice, Stat } from "@/components/finance/ui";
import { cn } from "@/lib/utils";

/**
 * The cash that artisans hold: what they took from customers, the commission it brings to the platform, what they have handed
 * over, and what they still owe. A handover is written here by the team; the ledger of each artisan shows every line.
 * This tab does not depend on the period: a debt stays a debt.
 */
export default function FinanceCashPage() {
  const { reloadSummary } = useFinance();
  const { data, error, busy, reload } = useFinanceData(() => callApi((config) => api.request(config), routes.finance.balances()), "balances", "Impossible de charger les espèces des artisans.");
  const [onlyOwing, setOnlyOwing] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const [spec, setSpec] = useState<ActionSpec<unknown> | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [ledgerVersion, setLedgerVersion] = useState(0);

  const refresh = () => {
    reload();
    reloadSummary();
    setLedgerVersion((value) => value + 1);
  };

  const overview = useMemo(() => cashOverview(data ?? []), [data]);
  const rows = useMemo(() => {
    const all = data ?? [];

    return onlyOwing ? owingArtisans(all) : [...all].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "fr") || a.artisanId - b.artisanId);
  }, [data, onlyOwing]);

  return (
    <div className="space-y-4">
      <Notice>Quand un client paie un artisan en espèces, la commission de la plateforme sur cette somme est due par l’artisan. Enregistrez ici chaque versement qu’il remet : le solde se met à jour et la ligne reste dans son relevé.</Notice>

      {done && <Notice>{done}</Notice>}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {!data && !error ? (
        <Loading />
      ) : data ? (
        <div className={cn("space-y-4", busy && "opacity-70 transition-opacity")} aria-busy={busy}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Commission à récupérer" value={moneyText(overview.owed / 1000)} tone={overview.owed > 0 ? "warning" : "plain"} hint={`${overview.owing} artisan${overview.owing === 1 ? "" : "s"} concerné${overview.owing === 1 ? "" : "s"}`} />
            <Stat label="Espèces encaissées par les artisans" value={moneyText(overview.held / 1000)} hint="Net de ce qui a été repris" />
            <Stat label="Artisans suivis" value={data.length} hint="Avec au moins une ligne dans leur relevé" />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" checked={onlyOwing} onChange={(event) => setOnlyOwing(event.target.checked)} className="h-4 w-4 rounded border-stone-300" />
            Seulement les artisans qui doivent quelque chose
          </label>

          {rows.length === 0 ? (
            <Empty>{onlyOwing ? "Aucun artisan ne doit de commission." : "Aucun artisan n’a encore encaissé d’espèces."}</Empty>
          ) : (
            <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="px-4 py-3">Artisan</th>
                      <th className="px-4 py-3 text-right">Espèces encaissées</th>
                      <th className="px-4 py-3 text-right">Commission due</th>
                      <th className="px-4 py-3 text-right">Déjà versé</th>
                      <th className="px-4 py-3 text-right">Reste dû</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                    {rows.map((artisan) => (
                      <BalanceLine
                        key={artisan.artisanId}
                        artisan={artisan}
                        expanded={open === artisan.artisanId}
                        version={ledgerVersion}
                        locked={busy}
                        onToggle={() => setOpen(open === artisan.artisanId ? null : artisan.artisanId)}
                        onRemit={() => {
                          setDone(null);
                          setSpec(remittanceSpec(artisan));
                        }}
                      />
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
        onClose={() => setSpec(null)}
        onDone={() => {
          setSpec(null);
          setDone("Le versement est enregistré.");
          refresh();
        }}
        onRefused={refresh}
      />
    </div>
  );
}

function BalanceLine({ artisan, expanded, version, locked, onToggle, onRemit }: { artisan: ArtisanBalance; expanded: boolean; version: number; locked: boolean; onToggle: () => void; onRemit: () => void }) {
  const money = (value: number) => moneyText(value, artisan.currency);
  const owes = artisan.balance > 0;

  return (
    <>
      <tr className="align-top">
        <td className="px-4 py-3">
          <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex items-start gap-1.5 text-left">
            {expanded ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />}
            <span>
              <span className="block font-semibold text-blue-950">{artisan.name ?? `Artisan n° ${artisan.artisanId}`}</span>
              <span className="block text-xs text-stone-500">
                n° {artisan.artisanId}
                {artisan.phone ? ` · ${artisan.phone}` : ""}
              </span>
            </span>
          </button>
        </td>
        <td className="px-4 py-3 text-right tabular-nums">{money(artisan.cashCollected)}</td>
        <td className="px-4 py-3 text-right tabular-nums">{money(artisan.commissionDue)}</td>
        <td className="px-4 py-3 text-right tabular-nums">{money(artisan.commissionRemitted)}</td>
        <td className={cn("px-4 py-3 text-right font-bold tabular-nums", owes ? "text-amber-800" : artisan.balance < 0 ? "text-sky-700" : "text-emerald-700")}>
          {money(artisan.balance)}
          {artisan.balance < 0 && <span className="block text-xs font-normal">de trop versé</span>}
        </td>
        <td className="px-4 py-3 text-right">
          {owes && (
            <button
              type="button"
              onClick={onRemit}
              disabled={locked}
              aria-label={`Enregistrer un versement · artisan n° ${artisan.artisanId}`}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enregistrer un versement
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="bg-stone-50 px-4 py-3">
            <LedgerPanel artisanId={artisan.artisanId} version={version} />
          </td>
        </tr>
      )}
    </>
  );
}

/** The lines of one artisan, newest first, a page at a time. */
function LedgerPanel({ artisanId, version }: { artisanId: number; version: number }) {
  const first = useFinanceData<ArtisanLedger>(() => callApi((config) => api.request(config), routes.finance.artisanLedger(artisanId, { limit: 20 })), `ledger-${artisanId}-${version}`, "Impossible de charger le relevé.");
  const [more, setMore] = useState<{ entries: LedgerEntry[]; nextBefore: number | null; version: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (first.error && !first.data) return <ErrorBox message={first.error} onRetry={first.reload} />;
  if (!first.data) return <Loading />;

  // Pages added after a reload are dropped: the first page is the truth now.
  const extra = more && more.version === version ? more : null;
  const entries = extra ? appendEntries(first.data.entries, extra.entries) : first.data.entries;
  const next = extra ? extra.nextBefore : first.data.nextBefore;

  const loadMore = async () => {
    if (next === null || loading) return;

    setLoading(true);
    setProblem(null);

    try {
      const page = await callApi((config) => api.request(config), routes.finance.artisanLedger(artisanId, { limit: 20, before: next }));

      setMore({ entries: extra ? appendEntries(extra.entries, page.entries) : page.entries, nextBefore: page.nextBefore, version });
    } catch (failure) {
      setProblem(apiErrorMessage(failure, "Impossible de charger la suite du relevé."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <p className="text-sm text-stone-500">Aucune ligne dans le relevé de cet artisan.</p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white text-sm">
          {entries.map((entry) => {
            const words = entryWords(entry);

            return (
              <li key={entry.id} className="flex flex-wrap items-start justify-between gap-3 px-3 py-2">
                <div>
                  <p className="font-medium text-stone-800">
                    {entry.interventionId !== null ? (
                      <>
                        {words.title.split(" – ")[0]} – <MissionLink id={entry.interventionId} className="text-blue-900 underline-offset-2 hover:underline">mission #{entry.interventionId}</MissionLink>
                      </>
                    ) : (
                      words.title
                    )}
                  </p>
                  <p className="text-xs text-stone-500">{momentText(entry.createdAt) ?? "—"}</p>
                  {words.detail && <p className="text-xs text-stone-500">{words.detail}</p>}
                </div>
                <div className="text-right tabular-nums">
                  <p className={cn("font-semibold", words.direction === "up" ? "text-amber-800" : words.direction === "down" ? "text-emerald-700" : "text-stone-600")}>{words.effect}</p>
                  {words.cash && <p className="text-xs text-stone-500">{words.cash}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {problem && (
        <p role="alert" className="text-xs text-red-700">
          {problem}
        </p>
      )}
      {next !== null && (
        <button type="button" onClick={loadMore} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Lignes plus anciennes
        </button>
      )}
    </div>
  );
}
