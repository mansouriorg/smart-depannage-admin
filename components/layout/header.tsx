"use client";

import { usePathname } from "next/navigation";
import { dashboardPageFor, staffRoleLabel } from "@/lib/shared";
import { displayName, initialOf } from "@/lib/staff-display";
import { useStaff } from "@/components/auth/staff-provider";

/** Top bar of the dashboard (P1-12): where the person is, and who they are, as the server knows them. */
export function Header() {
  const pathname = usePathname();
  const { ready, user, role } = useStaff();
  const page = dashboardPageFor(pathname);

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-stone-200 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
      {/* Fil d'ariane */}
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <span className="font-medium text-stone-900">Dashboard</span>
        {page && (
          <>
            <span>/</span>
            <span className="text-[#B69121]">{page.label}</span>
          </>
        )}
      </div>

      {/* Compte connecté */}
      {ready && user && (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-blue-950">{displayName(user)}</p>
            <p className="text-xs text-stone-500">{staffRoleLabel(role)}</p>
          </div>
          <div className="h-9 w-9 bg-gradient-to-br from-[#D4AF37] to-[#B69121] rounded-full text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-stone-100">
            {initialOf(user)}
          </div>
        </div>
      )}
    </header>
  );
}
