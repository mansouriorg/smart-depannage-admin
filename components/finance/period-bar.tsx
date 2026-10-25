"use client";

import { usePathname } from "next/navigation";
import { periodChoices, choiceOf, periodText } from "@/lib/shared";
import { useFinanceParams } from "@/components/finance/use-finance-params";
import { cn } from "@/lib/utils";

/** The tabs whose figures do not depend on a period: what is owed stays owed (refunds, cash held by artisans), and a payout names its own days. */
const WITHOUT_PERIOD = ["/refunds", "/payouts", "/cash"];

/**
 * The period of the console: a few usual ones, and two days of one's own. It lives in the address, so the tabs, a reload and a
 * link sent to a colleague all show the same days. Without a period the server takes the last seven days.
 */
export function PeriodBar() {
  const { from, to, today, update, problem, get } = useFinanceParams();
  const pathname = usePathname();

  // The payouts that were paid are the one list of those tabs that is about a period (the day they were paid).
  const paidPayouts = pathname.endsWith("/payouts") && get("view") === "paid";

  if (!paidPayouts && WITHOUT_PERIOD.some((tab) => pathname.endsWith(tab))) return null;

  const choices = periodChoices(today);
  const current = choiceOf(today, from, to);

  return (
    <section aria-label="Période" className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            aria-pressed={current === choice.id}
            onClick={() => update({ from: choice.from, to: choice.to })}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              current === choice.id ? "border-blue-950 bg-blue-950 text-white" : "border-stone-200 text-stone-600 hover:border-[#D4AF37]/60",
            )}
          >
            {choice.label}
          </button>
        ))}
        {(from || to) && (
          <button type="button" onClick={() => update({ from: undefined, to: undefined })} className="text-xs font-medium text-stone-500 underline underline-offset-2 hover:text-stone-800">
            Revenir aux 7 derniers jours
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-bold uppercase text-stone-500">
          Du
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => update({ from: event.target.value })}
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-normal normal-case text-stone-800 outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold uppercase text-stone-500">
          Au
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => update({ to: event.target.value })}
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-normal normal-case text-stone-800 outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
          />
        </label>
        <p className="pb-2 text-xs text-stone-500" aria-live="polite">
          {problem ? null : from || to ? (from && to ? periodText(from, to) : from ? `À partir du ${periodText(from, from)} (7 jours)` : `Jusqu’au ${periodText(to, to)} (7 jours)`) : "Les 7 derniers jours, aujourd’hui compris"}
        </p>
      </div>

      {problem && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {problem}
        </p>
      )}
    </section>
  );
}
