"use client";

import { 
  MapPin, 
  Calendar, 
  User,
  Phone,
  Eye // ✅ 1. Imported the Eye icon
} from "lucide-react";
import { useRouter } from "next/navigation"; // ✅ 2. Imported the Next.js router
import { TicketStatusBadge } from "./ticket-status-badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TicketActions } from "./ticket-actions"; 

// Definition of an Artisan
interface Artisan {
  id: number;
  name: string;
}

// Match the Interface to your Real Backend Data
interface Ticket {
  id: number;
  serviceType: string;
  description: string;
  address: string;
  status: string;
  createdAt: string;
  client?: {
    name: string;
    phone?: string; 
  };
  artisanId?: number; 
  artisan?: {
    id: number;
    name: string;
  };
}

interface TicketTableProps {
  data: Ticket[];
  artisans: Artisan[]; 
}

export function TicketTable({ data, artisans }: TicketTableProps) {
  const router = useRouter(); // ✅ 3. Initialize the router

  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-xl shadow-stone-200/40 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          
          {/* --- HEADER --- */}
          <thead className="bg-stone-50 border-b border-stone-100">
            <tr>
              <th className="px-6 py-4 font-semibold text-stone-500 uppercase tracking-wider text-xs">Client</th>
              <th className="px-6 py-4 font-semibold text-stone-500 uppercase tracking-wider text-xs">Type</th>
              <th className="px-6 py-4 font-semibold text-stone-500 uppercase tracking-wider text-xs">Statut</th>
              <th className="px-6 py-4 font-semibold text-stone-500 uppercase tracking-wider text-xs">Lieu & Date</th>
              <th className="px-6 py-4 font-semibold text-stone-500 uppercase tracking-wider text-xs text-right">Gestion</th>
            </tr>
          </thead>

          {/* --- BODY --- */}
          <tbody className="divide-y divide-stone-100">
            {data.length === 0 ? (
              // Empty State Row
              <tr>
                <td colSpan={5} className="p-12 text-center text-stone-500">
                   <p>Aucune demande trouvée.</p>
                </td>
              </tr>
            ) : (
              data.map((ticket) => (
                <tr 
                  key={ticket.id} 
                  // ✅ 4. Make the entire row clickable to navigate to details
                  onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                  // ✅ Added cursor-pointer so the mouse changes to a hand
                  className="group hover:bg-[#D4AF37]/5 transition-colors duration-200 cursor-pointer"
                >
                  
                  {/* 1. Client Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 border border-stone-200 group-hover:border-[#D4AF37]/30 group-hover:text-[#B69121] transition-colors">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-blue-950 group-hover:text-[#B69121] transition-colors">
                          {ticket.client?.name || "Client Invité"}
                        </div>
                        <div className="text-stone-400 text-xs font-medium flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3 text-[#D4AF37]" />
                          <span>{ticket.client?.phone || "Non renseigné"}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 2. Service Type */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-50 text-stone-600 border border-stone-200 shadow-sm uppercase">
                      {ticket.serviceType}
                    </span>
                  </td>

                  {/* 3. Status Badge */}
                  <td className="px-6 py-4">
                    <TicketStatusBadge status={ticket.status} />
                  </td>

                  {/* 4. Location & Date */}
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-stone-700 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
                        <span className="truncate max-w-[180px]" title={ticket.address}>
                          {ticket.address}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-stone-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {format(new Date(ticket.createdAt), "d MMM, HH:mm", { locale: fr })}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 5. ACTIONS */}
                  <td className="px-6 py-4 text-right">
                    {/* ✅ 5. Wrap actions in a div that STOPS the click event so clicking buttons doesn't trigger the row navigation */}
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      
                      {/* Visual indicator that the row has a details page */}
                      <div 
                        className="p-2 text-stone-400 group-hover:text-[#B69121] group-hover:bg-[#D4AF37]/10 rounded-lg transition-colors" 
                        title="Voir les détails du dossier"
                      >
                        <Eye className="h-4 w-4" />
                      </div>

                      <TicketActions 
                        ticket={ticket} 
                        artisans={artisans} 
                      />
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 rounded-b-xl border-x border-b">
          <span>{data.length} résultats affichés</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-white border border-stone-200 rounded text-stone-400 text-xs cursor-not-allowed" disabled>Précédent</button>
            <button className="px-3 py-1 bg-white border border-stone-200 rounded text-stone-400 text-xs cursor-not-allowed" disabled>Suivant</button>
          </div>
      </div>
    </div>
  );
}