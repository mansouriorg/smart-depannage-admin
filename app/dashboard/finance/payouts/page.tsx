"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import {
  callApi,
  holdWords,
  inPeriod,
  isDay,
  lastDays,
  moneyText,
  momentText,
  outcomeIsUnknown,
  payoutActions,
  payoutPeriod,
  payoutStatusLabel,
  payoutTone,
  periodDays,
  periodText,
  routes,
  sumAmounts,
  weekRange,
  dayText,
  type PayoutPreview,
  type PayoutRow,
} from "@/lib/shared";
import { payoutCancelSpec, payoutPaidSpec } from "@/lib/finance-actions";
import { ActionDialog, type ActionSpec } from "@/components/finance/action-dialog";
import { useFinance } from "@/components/finance/finance-context";
import { MissionLink } from "@/components/finance/mission-link";
import { useFinanceData } from "@/components/finance/use-finance-data";
import { useFinanceParams } from "@/components/finance/use-finance-params";
import { Empty, ErrorBox, Loading, Notice, Pill } from "@/components/finance/ui";
import { cn } from "@/lib/utils";

const VIEWS = [
  { id: "open", label: "À payer", statuses: ["PENDING", "READY"] },
  { id: "paid", label: "Payés", statuses: ["PAID"] },
  { id: "closed", label: "Annulés ou échoués", statuses: ["CANCELLED", "FAILED"] },
  { id: "all", label: "Tous", statuses: null },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

/** How long the creation of a payout is waited for: a hung request must not leave the button disabled for ever. */
const CREATE_TIMEOUT_MS = 30_000;

const viewOf = (text: string): ViewId => VIEWS.find((view) => view.id === text)?.id ?? "open";

export default function FinancePayoutsPage() {
  const { get, update, today, from, to, problem } = useFinanceParams();
  const { reloadSummary } = useFinance();
  const view = viewOf(get("view"));
  const { data, error, busy, reload } = useFinanceData(() => callApi((config) => api.request(config), routes.finance.payouts()), "payouts", "Impossible de charger les reversements.");
  const balances = useFinanceData(() => callApi((config) => api.request(config), routes.finance.balances()), "payout-artisans", "Impossible de charger les artisans.");

  const [spec, setSpec] = useState<ActionSpec<unknown> | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const refresh = () => {
    reload();
    reloadSummary();
  };

  // The payouts that were paid are counted and listed for the days they were paid on: the days of the bar, which are the last seven
  // when the address names none (the bar says so, and so does the list).
  const paidWindow = problem ? null : (periodDays(from, to) ?? lastDays(today, 7));
  const paidDays = view === "paid" ? paidWindow : null;
  const paidFrom = paidWindow?.from;
  const paidTo = paidWindow?.to;

  /** Whether a payout belongs to a view: its status, and for the paid ones the day they were paid on. */
  const belongs = useCallback(
    (payout: PayoutRow, viewId: ViewId) => {
      const statuses = VIEWS.find((entry) => entry.id === viewId)?.statuses ?? null;

      if (statuses && !(statuses as readonly string[]).includes(payout.status)) return false;

      return viewId !== "paid" || !paidFrom || !paidTo || inPeriod(payout.paidAt, paidFrom, paidTo);
    },
    [paidFrom, paidTo],
  );

  const rows = useMemo(() => (data ?? []).filter((payout) => belongs(payout, view)), [data, view, belongs]);

  // The artisans the form suggests: those with a ledger and those who have been paid before. (The route that lists all artisans is not for the accountant.)
  const known = useMemo(() => {
    const names = new Map<number, string>();

    for (const entry of balances.data ?? []) names.set(entry.artisanId, entry.name ?? `Artisan n° ${entry.artisanId}`);
    for (const payout of data ?? []) if (!names.has(payout.artisanId)) names.set(payout.artisanId, payout.artisan?.name ?? `Artisan n° ${payout.artisanId}`);

    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [balances.data, data]);

  return (
    <div className="space-y-5">
      <Notice>Un reversement est la somme que la plateforme doit à un artisan pour une période. Préparez-le, vérifiez ce qu’il paie et ce qui est mis de côté, puis marquez-le payé une fois le virement fait. Les reversements à payer ne dépendent pas de la période ; la vue « Payés » suit les jours choisis ci-dessus (le jour du paiement).</Notice>

      <PreparePanel
        today={today}
        known={known}
        onCreated={(payout) => {
          setDone(`Le reversement n° ${payout.id} est prêt à payer.`);
          update({ view: "open" });
          refresh();
        }}
        onUnknown={refresh}
      />

      {done && <Notice>{done}</Notice>}

      <nav aria-label="Vue" className="flex flex-wrap gap-1 rounded-lg border border-stone-200 bg-white p-1">
        {VIEWS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={view === entry.id}
            onClick={() => update({ view: entry.id === "open" ? undefined : entry.id })}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", view === entry.id ? "bg-blue-950 text-white" : "text-stone-600 hover:bg-stone-100")}
          >
            {entry.label}
            {data && entry.statuses && (
              <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-[11px] font-bold", view === entry.id ? "bg-white/20" : "bg-stone-100 text-stone-600")}>
                {data.filter((payout) => belongs(payout, entry.id)).length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {paidDays && (
        <Notice>
          Reversements payés sur la période : {periodText(paidDays.from, paidDays.to)} (jour du paiement, à l’heure de Tunis). {rows.length} reversement{rows.length === 1 ? "" : "s"}, {moneyText(sumAmounts(rows.map((payout) => payout.netAmount)))} versés.
        </Notice>
      )}

      {error && <ErrorBox message={error} onRetry={reload} />}

      {!data && !error ? (
        <Loading />
      ) : data ? (
        <section className={cn("overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm", busy && "opacity-70 transition-opacity")} aria-busy={busy}>
          {rows.length === 0 ? (
            <Empty>{view === "open" ? "Aucun reversement n’attend d’être payé." : paidDays ? "Aucun reversement n’a été payé sur ces jours." : "Aucun reversement dans cette vue."}</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Reversement</th>
                    <th className="px-4 py-3">Artisan</th>
                    <th className="px-4 py-3">Période</th>
                    <th className="px-4 py-3 text-right">Montants</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                  {rows.map((payout) => (
                    <PayoutLine
                      key={payout.id}
                      payout={payout}
                      locked={busy}
                      onPaid={() => {
                        setDone(null);
                        setSpec(payoutPaidSpec(payout, today));
                      }}
                      onCancel={() => {
                        setDone(null);
                        setSpec(payoutCancelSpec(payout));
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <ActionDialog
        spec={spec}
        onClose={() => setSpec(null)}
        onDone={() => {
          const title = spec?.title ?? "";

          setSpec(null);
          setDone(`${title} : c’est fait.`);
          refresh();
        }}
        onRefused={refresh}
      />
    </div>
  );
}

function PayoutLine({ payout, locked, onPaid, onCancel }: { payout: PayoutRow; locked: boolean; onPaid: () => void; onCancel: () => void }) {
  const money = (value: number | string) => moneyText(value, payout.currency);
  const actions = payoutActions(payout.status);

  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <p className="font-semibold text-blue-950">n° {payout.id}</p>
        <p className="text-xs text-stone-500">{payout.items.length} mission{payout.items.length === 1 ? "" : "s"}</p>
        <p className="text-xs text-stone-500">Créé le {momentText(payout.createdAt) ?? "—"}</p>
      </td>
      <td className="px-4 py-3">
        <p>{payout.artisan?.name ?? `Artisan n° ${payout.artisanId}`}</p>
        {payout.artisan?.phone && <p className="text-xs text-stone-500">{payout.artisan.phone}</p>}
      </td>
      <td className="px-4 py-3 text-xs">
        <p>{dayText(payout.periodStart) ?? "—"}</p>
        <p className="text-stone-500">au {dayText(payout.periodEnd) ?? "—"}</p>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        <dl className="ml-auto grid max-w-[240px] grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-xs">
          <dt className="text-left text-stone-500">Brut</dt>
          <dd>{money(payout.grossAmount)}</dd>
          <dt className="text-left text-stone-500">Frais</dt>
          <dd>− {money(payout.paymentProviderFees)}</dd>
          <dt className="text-left text-stone-500">Remboursements</dt>
          <dd>− {money(payout.refundsDeducted)}</dd>
          <dt className="text-left font-semibold text-stone-700">Net à verser</dt>
          <dd className="font-semibold text-blue-950">{money(payout.netAmount)}</dd>
        </dl>
      </td>
      <td className="px-4 py-3">
        <Pill tone={payoutTone(payout.status)}>{payoutStatusLabel(payout.status)}</Pill>
        {payout.paidAt && <p className="mt-1 text-xs text-stone-500">Payé le {momentText(payout.paidAt)}</p>}
        {payout.paymentReference && <p className="text-xs text-stone-500">Réf. {payout.paymentReference}</p>}
        {payout.notes && <p className="mt-1 max-w-[200px] text-xs text-stone-500">{payout.notes}</p>}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap justify-end gap-1.5">
          {actions.includes("paid") && (
            <button
              type="button"
              onClick={onPaid}
              disabled={locked}
              aria-label={`Marquer payé · reversement n° ${payout.id}`}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Marquer payé
            </button>
          )}
          {actions.includes("cancel") && (
            <button
              type="button"
              onClick={onCancel}
              disabled={locked}
              aria-label={`Annuler · reversement n° ${payout.id}`}
              className="rounded-md border border-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annuler
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * Making a payout takes two steps: see what it would pay and what it would leave out (and why), then create it. What was previewed
 * is what is created: changing the artisan or a day takes the preview away.
 */
function PreparePanel({ today, known, onCreated, onUnknown }: { today: string; known: Array<[number, string]>; onCreated: (payout: PayoutRow) => void; onUnknown: () => void }) {
  const lastWeek = useMemo(() => weekRange(today, 1), [today]);
  const [artisan, setArtisan] = useState("");
  const [from, setFrom] = useState(lastWeek.from);
  const [to, setTo] = useState(lastWeek.to);
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<{ key: string; value: PayoutPreview } | null>(null);
  const [working, setWorking] = useState<"preview" | "create" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const artisanId = /^\d{1,9}$/.test(artisan.trim()) ? Number(artisan.trim()) : null;
  const key = `${artisanId}|${from}|${to}`;
  const shown = preview && preview.key === key ? preview.value : null;

  const inputProblem = (): string | null => {
    if (artisanId === null || artisanId < 1) return "Indiquez le numéro de l’artisan.";
    if (!isDay(from) || !isDay(to)) return "Choisissez le premier et le dernier jour de la période.";
    if (from > to) return "Le premier jour est après le dernier.";

    return null;
  };

  const look = async () => {
    const wrong = inputProblem();

    if (wrong || artisanId === null) {
      setProblem(wrong);
      return;
    }

    setWorking("preview");
    setProblem(null);

    try {
      const value = await callApi((config) => api.request(config), routes.finance.payoutPreview({ artisanId, ...payoutPeriod(from, to) }));

      setPreview({ key, value });
    } catch (failure) {
      setPreview(null);
      setProblem(apiErrorMessage(failure, "Impossible de calculer ce reversement."));
    } finally {
      setWorking(null);
    }
  };

  const create = async () => {
    if (!shown || artisanId === null || working) return;

    setWorking("create");
    setProblem(null);

    try {
      const payout = await callApi((config) => api.request({ ...config, timeout: CREATE_TIMEOUT_MS }), routes.finance.createPayout({ artisanId, ...payoutPeriod(from, to), notes: notes.trim() || undefined }));

      setPreview(null);
      setNotes("");
      onCreated(payout);
    } catch (failure) {
      if (outcomeIsUnknown(failure)) {
        // No answer came, or the server failed after it began: the payout may exist. The preview goes (what it showed may have been
        // taken), the list is loaded again, and the next click on "Créer" needs a new look at what is left.
        setPreview(null);
        setProblem("La réponse du serveur n’est pas arrivée : le reversement a peut-être été créé. Regardez la liste « À payer » (elle est rechargée) avant de recommencer.");
        onUnknown();
      } else {
        setProblem(apiErrorMessage(failure, "Le reversement n’a pas été créé."));
      }
    } finally {
      setWorking(null);
    }
  };

  return (
    <section aria-label="Préparer un reversement" className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-blue-950">Préparer un reversement</h2>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-bold uppercase text-stone-500">
          Artisan (numéro)
          <input
            list="payout-artisans"
            inputMode="numeric"
            value={artisan}
            onChange={(event) => setArtisan(event.target.value)}
            placeholder="Ex : 12"
            className="w-44 rounded-lg border border-stone-200 px-3 py-2 text-sm font-normal normal-case text-stone-800 outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
          />
          <datalist id="payout-artisans">
            {known.map(([id, name]) => (
              <option key={id} value={String(id)}>
                {name}
              </option>
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase text-stone-500">
          Du
          <input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-normal normal-case text-stone-800 outline-none focus:ring-2 focus:ring-[#D4AF37]/50" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase text-stone-500">
          Au
          <input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-normal normal-case text-stone-800 outline-none focus:ring-2 focus:ring-[#D4AF37]/50" />
        </label>
        <button
          type="button"
          onClick={look}
          disabled={working !== null}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-950 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {working === "preview" && <Loader2 className="h-4 w-4 animate-spin" />}
          Voir ce qui serait payé
        </button>
      </div>

      {problem && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {problem}
        </p>
      )}

      {shown && (
        <div className="space-y-4" aria-live="polite">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-lg border border-stone-200">
              <h3 className="border-b border-stone-200 bg-emerald-50 px-3 py-2 text-xs font-bold uppercase text-emerald-800">Inclus dans le reversement</h3>
              {shown.included.length === 0 ? (
                <p className="px-3 py-4 text-sm text-stone-500">Aucune mission ne peut être payée sur cette période.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-stone-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Mission</th>
                      <th className="px-3 py-2 text-right font-semibold">Montant</th>
                      <th className="px-3 py-2 text-right font-semibold">Espèces gardées</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.included.map((line) => (
                      <tr key={line.financialId} className="border-t border-stone-100 tabular-nums">
                        <td className="px-3 py-2">
                          <MissionLink id={line.interventionId}>n° {line.interventionId}</MissionLink>
                        </td>
                        <td className="px-3 py-2 text-right">{moneyText(line.amount, shown.currency)}</td>
                        <td className="px-3 py-2 text-right">{line.cashHeld > 0 ? moneyText(line.cashHeld, shown.currency) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-stone-300 bg-stone-50 font-bold text-blue-950 tabular-nums">
                      <td className="px-3 py-2">Total brut</td>
                      <td className="px-3 py-2 text-right">{moneyText(shown.grossAmount, shown.currency)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-stone-200">
              <h3 className="border-b border-stone-200 bg-amber-50 px-3 py-2 text-xs font-bold uppercase text-amber-800">Mis de côté</h3>
              {shown.held.length === 0 ? (
                <p className="px-3 py-4 text-sm text-stone-500">Rien n’est mis de côté.</p>
              ) : (
                <ul className="divide-y divide-stone-100 text-sm">
                  {shown.held.map((line) => (
                    <li key={line.financialId} className="px-3 py-2">
                      <p className="tabular-nums">
                        <MissionLink id={line.interventionId}>Mission n° {line.interventionId}</MissionLink> · {moneyText(line.amount, shown.currency)}
                      </p>
                      <p className="text-xs text-amber-800">{holdWords(line.reasons)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-xs font-bold uppercase text-stone-500">
              Note (facultative)
              <input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-normal normal-case text-stone-800 outline-none focus:ring-2 focus:ring-[#D4AF37]/50" />
            </label>
            <button
              type="button"
              onClick={create}
              disabled={working !== null || shown.included.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {working === "create" && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer le reversement (brut {moneyText(shown.grossAmount, shown.currency)})
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
