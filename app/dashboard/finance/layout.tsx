import { Suspense, type ReactNode } from "react";
import { FinanceProvider } from "@/components/finance/finance-context";
import { FinanceNav } from "@/components/finance/finance-nav";
import { PeriodBar } from "@/components/finance/period-bar";
import { Loading } from "@/components/finance/ui";

/**
 * The finance console (P2-08): money to confirm, money to give back, invoices, payouts and the cash that artisans hold, over a
 * period chosen once for all the tabs. The state of every tab lives in the address (useSearchParams), hence the Suspense.
 */
export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header>
        <h1 data-dialog-fallback tabIndex={-1} className="text-2xl font-bold text-blue-950 outline-none">Finances</h1>
        <p className="text-sm text-stone-500">Paiements à confirmer, remboursements, factures, reversements et espèces des artisans.</p>
      </header>

      <Suspense fallback={<Loading />}>
        <FinanceProvider>
          <PeriodBar />
          <FinanceNav />
          {children}
        </FinanceProvider>
      </Suspense>
    </div>
  );
}
