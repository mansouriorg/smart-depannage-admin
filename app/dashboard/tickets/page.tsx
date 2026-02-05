// src/app/dashboard/tickets/page.tsx
import { Filter } from "lucide-react";
import { MOCK_TICKETS } from "@/lib/mock-data"; // Données de test
import { TicketTable } from "@/components/tickets/ticket-table"; // Le nouveau composant propre

export default function TicketsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* --- EN-TÊTE DE PAGE --- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-950 tracking-tight">
            Interventions
          </h1>
          <p className="text-stone-500 mt-1">
            Gérez les demandes entrantes et assignez vos experts.
          </p>
        </div>
        
        <div className="flex gap-3">
           <button className="flex items-center gap-2 bg-white border border-stone-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:border-[#D4AF37]/50 hover:text-[#B69121] transition-colors shadow-sm text-stone-600">
            <Filter className="h-4 w-4" /> 
            <span>Filtrer</span>
          </button>
          
          {/* Bouton Créer (Bleu Nuit pour contraste) */}
          <button className="bg-blue-950 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all">
            + Créer un ticket
          </button>
        </div>
      </div>

      {/* --- TABLEAU DES TICKETS --- */}
      {/* On passe simplement les données au composant */}
      <TicketTable data={MOCK_TICKETS} />

    </div>
  );
}