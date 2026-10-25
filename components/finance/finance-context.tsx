"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import api from "@/lib/api";
import { callApi, routes, type FinanceSummary } from "@/lib/shared";
import { useFinanceData } from "@/components/finance/use-finance-data";
import { useFinanceParams } from "@/components/finance/use-finance-params";

interface FinanceState {
  /** The summary of the period in the address; null while it loads, or when the period cannot be asked for. */
  summary: FinanceSummary | null;
  summaryError: string | null;
  summaryBusy: boolean;
  /** Loads the summary again (after a payment was confirmed, a refund made, ...): the counts on the tabs follow. */
  reloadSummary: () => void;
}

const FinanceContext = createContext<FinanceState>({ summary: null, summaryError: null, summaryBusy: false, reloadSummary: () => undefined });

export const useFinance = () => useContext(FinanceContext);

/** The summary is loaded once for the whole console, so that the summary tab and the counts on the other tabs say the same thing. */
export function FinanceProvider({ children }: { children: ReactNode }) {
  const { problem, period, from, to, today } = useFinanceParams();
  const { data, error, busy, reload } = useFinanceData(
    () => (problem ? Promise.resolve(null) : callApi((config) => api.request(config), routes.finance.summary(period))),
    // Without a period the summary is about "the last seven days", which are other days after midnight: a page left open loads it again.
    `${problem ?? ""}|${from}|${to}|${from || to ? "" : today}`,
    "Impossible de charger le résumé.",
  );

  const value = useMemo<FinanceState>(() => ({ summary: problem ? null : data, summaryError: problem ? null : error, summaryBusy: busy, reloadSummary: reload }), [problem, data, error, busy, reload]);

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
