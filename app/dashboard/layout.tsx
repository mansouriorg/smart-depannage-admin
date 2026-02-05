// src/app/dashboard/layout.tsx
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-stone-50 font-sans text-stone-800">
      
      {/* Barre latérale fixe */}
      <Sidebar />

      {/* Zone de contenu principale (décalée de 64 = 16rem = width de la sidebar) */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        
        {/* Topbar (Header simple) */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-stone-200 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
           
           {/* Fil d'ariane (Breadcrumb simplifié) */}
           <div className="flex items-center gap-2 text-sm text-stone-500">
             <span className="font-medium text-stone-900">Dashboard</span>
             <span>/</span>
             <span className="text-[#B69121]">Vue d'ensemble</span>
           </div>

           {/* Profil Admin */}
           <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-bold text-blue-950">Admin Principal</p>
               <p className="text-xs text-stone-500">Superviseur</p>
             </div>
             <div className="h-9 w-9 bg-gradient-to-br from-[#D4AF37] to-[#B69121] rounded-full text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-stone-100">
               A
             </div>
           </div>
        </header>

        {/* Injection des pages (children) ici */}
        <div className="p-8 flex-1 overflow-auto">
          {children}
        </div>

      </main>
    </div>
  );
}