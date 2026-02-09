"use client"; // ✅ Required for useEffect and useState

import { useEffect, useState } from "react";
import { Filter, Loader2, RefreshCcw } from "lucide-react";
import api from "@/lib/api"; // ✅ Use your configured Axios helper
import { TicketTable } from "@/components/tickets/ticket-table";

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch data from the server on load
  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 🚀 Calls GET /api/interventions
      // Since your api helper attaches the 'adminToken', 
      // the backend will return all tickets for the Admin.
      const response = await api.get("/interventions");
      setTickets(response.data);
    } catch (err: any) {
      console.error("Error fetching tickets:", err);
      setError("Impossible de charger les interventions.");
    } finally {
      setIsLoading(false);
    }
  };

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
           {/* Refresh Button */}
           <button 
            onClick={loadTickets}
            className="flex items-center gap-2 bg-white border border-stone-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:border-[#D4AF37]/50 hover:text-[#B69121] transition-colors shadow-sm text-stone-600"
          >
            <RefreshCcw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> 
          </button>

           <button className="flex items-center gap-2 bg-white border border-stone-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:border-[#D4AF37]/50 hover:text-[#B69121] transition-colors shadow-sm text-stone-600">
            <Filter className="h-4 w-4" /> 
            <span>Filtrer</span>
          </button>
          
          <button className="bg-blue-950 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all">
            + Créer un ticket
          </button>
        </div>
      </div>

      {/* --- ÉTATS DE CHARGEMENT / ERREUR --- */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 text-[#D4AF37] animate-spin" />
          <p className="text-stone-500 font-medium">Récupération des tickets...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
          {error}
        </div>
      )}

      {/* --- TABLEAU DES TICKETS RÉELS --- */}
      {!isLoading && !error && (
        <TicketTable data={tickets} />
      )}

    </div>
  );
}