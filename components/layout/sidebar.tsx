"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  Settings, 
  ShieldCheck, 
  LogOut,
  FileText // ✅ Icon for Applications
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { 
    icon: LayoutDashboard, 
    label: "Vue d'ensemble", 
    href: "/dashboard" 
  },
  { 
    icon: Ticket, 
    label: "Interventions", 
    href: "/dashboard/tickets" 
  },
  // ✅ NEW: Applications Page
  { 
    icon: FileText, 
    label: "Candidatures", 
    href: "/dashboard/applications" 
  },
  { 
    icon: Users, 
    label: "Techniciens", 
    href: "/dashboard/technicians" 
  },
  { 
    icon: Settings, 
    label: "Paramètres", 
    href: "/dashboard/settings" 
  },
];

export function Sidebar() {
  const pathname = usePathname();

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
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
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
        <button className="flex items-center gap-2 text-stone-500 hover:text-red-400 hover:bg-red-900/10 text-sm font-medium w-full px-3 py-2.5 rounded-lg transition-all">
          <LogOut className="h-4 w-4" /> 
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}