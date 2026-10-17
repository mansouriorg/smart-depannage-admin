"use client";

import { useState } from "react";
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { useRouter } from "next/navigation";
import { dashboardStatus } from "@/lib/ticket-status";

// 1. Define the Artisan Interface
interface Artisan {
  id: number;
  name: string;
}

// 2. Update Props to accept the list of Artisans
interface TicketActionsProps {
  ticket: any;
  artisans: Artisan[]; // 👈 We receive the real list here
}

export function TicketActions({ ticket, artisans }: TicketActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // The artisan who has the job is always in the menu, even when they are no longer
  // assignable (suspended, or beyond the first page of the list): the menu says who has it.
  const current = ticket.artisanId
    ? ticket.artisan ?? { id: ticket.artisanId, name: `Artisan #${ticket.artisanId}` }
    : null;
  const options: Artisan[] =
    current && !artisans.some((artisan) => artisan.id === current.id) ? [current, ...artisans] : artisans;

  // --- 1. Handle Status Change ---
  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true);
    try {
      await api.patch(`/interventions/${ticket.id}`, { status: newStatus });
      router.refresh(); 
      window.location.reload(); 
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Erreur lors de la mise à jour du statut.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. Handle Technician Assignment ---
  const handleAssignArtisan = async (artisanId: string, select: HTMLSelectElement) => {
    if (!artisanId) return;
    setIsLoading(true);
    try {
      // Sends the Artisan ID to the backend. The server checks that the artisan is
      // approved and free and that the job can be assigned (P1-05), then links the
      // two and sets the status to "Affecté" (accepted), as this menu always did.
      await api.patch(`/interventions/${ticket.id}`, { artisanId: Number(artisanId) });

      alert("Technicien assigné avec succès !");
      window.location.reload();
    } catch (error) {
      console.error("Failed to assign artisan", error);
      // The refusal says why (not approved, already booked, job already started...).
      alert(apiErrorMessage(error, "Erreur lors de l'assignation."));
      // The menu goes back to who really has the job.
      select.value = ticket.artisanId ? String(ticket.artisanId) : "";
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      
      {/* --- SELECT STATUS --- */}
      <div className="relative">
        <select
          disabled={isLoading}
          defaultValue={dashboardStatus(ticket.status)}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="appearance-none bg-stone-50 border border-stone-200 text-stone-600 text-xs font-bold py-1.5 pl-3 pr-8 rounded-lg cursor-pointer hover:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-50"
        >
          <option value="PENDING">En attente</option>
          {/* "Assigné" is set by the assignment (an artisan is chosen), never by hand: shown, not selectable */}
          <option value="ASSIGNED" disabled>Assigné</option>
          <option value="ACCEPTED">Affecté</option>
          <option value="IN_PROGRESS">En cours</option>
          <option value="COMPLETED">Terminé</option>
          <option value="CANCELLED">Annulé</option>
        </select>
        {/* Loading Indicator */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
        </div>
      </div>

      {/* --- SELECT TECHNICIAN --- */}
      {/* Only show assignment dropdown if not completed/cancelled */}
      {ticket.status !== 'COMPLETED' && ticket.status !== 'CANCELLED' && (
        <div className="relative group">
           <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 group-hover:text-[#D4AF37]">
             <UserPlus className="h-3.5 w-3.5" />
           </div>
           
           <select
            disabled={isLoading}
            // If an artisan is already assigned, select them. Otherwise default to ""
            defaultValue={ticket.artisanId || ""} 
            onChange={(e) => handleAssignArtisan(e.target.value, e.target)}
            className="appearance-none w-[140px] bg-white border border-stone-200 text-stone-600 text-xs py-1.5 pl-8 pr-2 rounded-lg cursor-pointer hover:border-[#D4AF37] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-50"
          >
            <option value="" disabled>Assigner...</option>
            
            {/* ✅ MAP OVER REAL ARTISANS */}
            {options.map((artisan) => (
              <option key={artisan.id} value={artisan.id}>
                {artisan.name}
              </option>
            ))}
          </select>
        </div>
      )}

    </div>
  );
}
