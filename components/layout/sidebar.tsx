"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  Settings, 
  ShieldCheck, 
  LogOut,
  FileText, // ✅ Icon for Applications
  Loader2,
  Star, // ✅ NEW: Icon for Feedbacks
  Wallet, // ✅ Icon for Finance (P2-08)
  MessageSquareWarning, // Icon for the complaints (P2-09)
  Building2 // Icon for the company (P2-09)
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { dashboardPagesFor, type PageId } from "@/lib/shared";
import { useStaff } from "@/components/auth/staff-provider";

// The menu is the pages of the role (P1-12): the table lives in the server and comes with the shared package.
const ICONS: Record<PageId, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  interventions: Ticket,
  applications: FileText,
  technicians: Users,
  feedbacks: Star,
  finance: Wallet,
  complaints: MessageSquareWarning,
  company: Building2,
  settings: Settings,
};

export function Sidebar() {
  const pathname = usePathname();
  const { ready, role } = useStaff();
  const [leaving, setLeaving] = useState(false);
  const items = ready ? dashboardPagesFor(role) : [];

  return (
    <aside className="w-64 bg-[#0f111a] border-r border-[#D4AF37]/20 flex flex-col fixed h-full z-20 shadow-2xl">
      
      {/* --- LOGO ADMIN --- */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-[#D4AF37]/10 bg-[#0f111a]">
        <div className="bg-gradient-to-br from-[#D4AF37] to-[#B69121] p-1.5 rounded-lg text-white shadow-lg shadow-[#D4AF37]/20 ring-1 ring-[#D4AF37]/50">
           <ShieldCheck className="h-5 w-5" />
        </div>
        <span className="font-bold text-stone-200 tracking-tight text-lg">Smart Depannage</span>
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {items.map((item) => {
          // The pages under a page (a ticket) keep their menu entry lit; the overview is only itself.
          const isActive = pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(`${item.path}/`));
          const Icon = ICONS[item.id];

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 group relative overflow-hidden",
                isActive
                  // STYLE ACTIF : Fond sombre teinté d'Or + Bordure Or + Texte Or
                  ? "bg-[#D4AF37]/10 text-[#D4AF37]" 
                  // STYLE INACTIF : Gris pierre + Hover blanc
                  : "text-stone-400 hover:text-stone-100 hover:bg-stone-800"
              )}
            >
              {/* Barre latérale active */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D4AF37] rounded-r-full shadow-[0_0_10px_#D4AF37]" />
              )}
              
              <Icon className={cn(
                "h-5 w-5 transition-colors duration-300", 
                isActive ? "text-[#D4AF37] drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]" : "group-hover:text-[#D4AF37]"
              )} />
              
              <span className="font-medium tracking-wide text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* --- FOOTER (Déconnexion) --- */}
      <div className="p-4 border-t border-[#D4AF37]/10 bg-[#0a0c12]">
        <button
          type="button"
          disabled={leaving}
          onClick={() => {
            setLeaving(true);
            void logout();
          }}
          className="flex items-center gap-2 text-stone-500 hover:text-red-400 hover:bg-red-900/10 text-sm font-medium w-full px-3 py-2.5 rounded-lg transition-all disabled:opacity-60"
        >
          {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          <span>{leaving ? "Déconnexion..." : "Déconnexion"}</span>
        </button>
      </div>
    </aside>
  );
}
