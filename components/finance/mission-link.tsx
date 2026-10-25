"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { canOpenDashboardPath } from "@/lib/shared";
import { useStaff } from "@/components/auth/staff-provider";

/**
 * A mission number as a link to the case file, for the roles that can open the interventions (an accountant cannot: the link would
 * only lead to a refusal, so for them it is plain text).
 */
export function MissionLink({ id, children, className }: { id: number; children: ReactNode; className?: string }) {
  const { role } = useStaff();

  return canOpenDashboardPath(role, "/dashboard/tickets") ? (
    <Link href={`/dashboard/tickets/${id}`} className={className ?? "text-xs text-blue-900 underline-offset-2 hover:underline"}>
      {children}
    </Link>
  ) : (
    <span className={className ? undefined : "text-xs text-stone-600"}>{children}</span>
  );
}
