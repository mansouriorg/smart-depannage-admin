"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/finance/ui";
import { useFinance } from "@/components/finance/finance-context";
import { useFinanceParams } from "@/components/finance/use-finance-params";

const TABS = [
  { id: "", label: "Résumé" },
  { id: "payments", label: "Paiements" },
  { id: "invoices", label: "Factures" },
  { id: "refunds", label: "Remboursements" },
  { id: "payouts", label: "Reversements" },
  { id: "cash", label: "Espèces" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const BASE = "/dashboard/finance";

/** The tabs of the console. The period goes with the person from one tab to the next; the filters of a tab stay in that tab. */
export function FinanceNav() {
  const pathname = usePathname();
  const { carry } = useFinanceParams();
  const { summary } = useFinance();
  const current: TabId = TABS.find((tab) => tab.id !== "" && pathname.startsWith(`${BASE}/${tab.id}`))?.id ?? "";
  const counts: Partial<Record<TabId, number>> = summary ? { payments: summary.awaiting.count, refunds: summary.refundsDue.count } : {};

  return <Tabs label="Finances" tabs={TABS.map((tab) => ({ ...tab, count: counts[tab.id] ?? null }))} current={current} hrefFor={(id) => `${BASE}${id ? `/${id}` : ""}${carry}`} />;
}
