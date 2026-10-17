"use client"; // ✅ Required for useEffect and useState

import { useEffect, useState } from "react";
import { Filter, Loader2, RefreshCcw } from "lucide-react";
import api, { unwrapList } from "@/lib/api"; // ✅ Use your configured Axios helper
import { TicketTable } from "@/components/tickets/ticket-table";
// ✅ IMPORT THE NEW MODAL
import { CreateTicketModal } from "@/components/tickets/create-ticket-modal";

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [artisans, setArtisans] = useState([]); // ✅ State for Artisans
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ 1. ÉTAT POUR LE FILTRE (Par défaut sur "ALL")
  const [statusFilter, setStatusFilter] = useState("ALL");

  // 1. Fetch data from the server on load
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 🚀 Parallel Fetch: Get Tickets AND Artisans at the same time
      const [ticketsRes, artisansRes] = await Promise.all([
        api.get("/interventions"),
        api.get("/users/artisans") 
      ]);

      // /users/artisans answers { data, meta }: unwrap it (P0-12)
      setTickets(unwrapList<any>(ticketsRes.data));
      setArtisans(unwrapList<any>(artisansRes.data));
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError("Impossible de charger les données.");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 2. LOGIQUE DE FILTRAGE
  const filteredTickets = tickets.filter((ticket: any) => {
    if (statusFilter === "ALL") return true;
    return ticket.status === statusFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* --- EN-TÊTE DE PAGE --- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-950 tracking-tight">
            Interventions
          </h1>
          <p className="text-stone-500 mt-1">
            {/* Petit détail UX : on affiche le compteur filtré */}
            Affichage de {filteredTickets.length} sur {tickets.length} interventions.
          </p>
        </div>
        
        <div className="flex gap-3">
           
           {/* Bouton Rafraîchir */}
           <button 
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 bg-white border border-stone-200 px-3 py-2.5 rounded-lg text-sm font-medium hover:border-[#D4AF37]/50 hover:text-[#B69121] transition-colors shadow-sm text-stone-600 disabled:opacity-50"
            title="Rafraîchir les données"
          >
            <RefreshCcw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> 
          </button>

           {/* ✅ 3. MENU DÉROULANT DE FILTRE ACTIF */}
           <div className="relative group">
             {/* Icône positionnée en absolu par-dessus le select */}
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-hover:text-[#D4AF37] pointer-events-none" />
             
             <select
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
               className="appearance-none pl-9 pr-8 py-2.5 bg-white border border-stone-200 rounded-lg text-sm font-medium hover:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all cursor-pointer text-stone-600 shadow-sm"
             >
               <option value="ALL">Tout voir</option>
               <option value="PENDING">En attente</option>
               <option value="ACCEPTED">Affecté</option>
               <option value="IN_PROGRESS">En cours</option>
               <option value="COMPLETED">Terminé</option>
               <option value="CANCELLED">Annulé</option>
             </select>
           </div>
          
          {/* ✅ 4. BOUTON CRÉER (Via Modal) */}
          <CreateTicketModal onSuccess={loadData} />
        </div>
      </div>

      {/* --- ÉTATS DE CHARGEMENT / ERREUR --- */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 text-[#D4AF37] animate-spin" />
          <p className="text-stone-500 font-medium">Récupération des données...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
          {error}
        </div>
      )}

      {/* --- TABLEAU DES TICKETS RÉELS --- */}
      {!isLoading && !error && (
        <TicketTable 
          data={filteredTickets} // 👈 On passe la liste FILTRÉE ici
          artisans={artisans} 
        />
      )}

    </div>
  );
}
