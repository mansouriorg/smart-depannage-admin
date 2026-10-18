// src/app/dashboard/layout.tsx
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PageGate, StaffProvider } from "@/components/auth/staff-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StaffProvider>
      <div className="flex min-h-screen bg-stone-50 font-sans text-stone-800">
        
        {/* Barre latérale fixe : les pages du rôle connecté */}
        <Sidebar />

        {/* Zone de contenu principale (décalée de 64 = 16rem = width de la sidebar) */}
        <main className="flex-1 ml-64 flex flex-col min-h-screen">
          
          {/* Topbar : fil d'ariane et compte connecté (données réelles) */}
          <Header />

          {/* Injection des pages (children) ici, pour le rôle qui peut les ouvrir */}
          <div className="p-8 flex-1 overflow-auto">
            <PageGate>{children}</PageGate>
          </div>

        </main>
      </div>
    </StaffProvider>
  );
}
