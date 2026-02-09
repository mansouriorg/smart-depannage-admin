"use client";

import { 
  MapPin, 
  Calendar, 
  User 
} from "lucide-react";
import { TicketStatusBadge } from "./ticket-status-badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ✅ Import the new Actions component
import { TicketActions } from "./ticket-actions"; 

// ✅ 1. Match the Interface to your Real Backend Data
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
  // Added artisan so the dropdown knows who is already assigned
  artisan?: {
    id: number;
    name: string;
  };
}

interface TicketTableProps {
  data: Ticket[];
}

export function TicketTable({ data }: TicketTableProps) {
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
                  className="group hover:bg-[#D4AF37]/5 transition-colors duration-200"
                >
                  
                  {/* 1. Client Info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 border border-stone-200 group-hover:border-[#D4AF37]/30 group-hover:text-[#B69121] transition-colors">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-blue-950 group-hover:text-[#B69121] transition-colors">
                          {ticket.client?.name || "Client Invité"}
                        </div>
                        <div className="text-stone-400 text-xs font-medium">
                          {ticket.client?.phone || "Non renseigné"}
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

                  {/* 5. ACTIONS (Replaced static buttons with the dynamic component) */}
                  <td className="px-6 py-4 text-right">
                    <TicketActions ticket={ticket} />
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
            {/* Disabled for now as backend pagination isn't implemented yet */}
            <button className="px-3 py-1 bg-white border border-stone-200 rounded text-stone-400 text-xs cursor-not-allowed" disabled>Précédent</button>
            <button className="px-3 py-1 bg-white border border-stone-200 rounded text-stone-400 text-xs cursor-not-allowed" disabled>Suivant</button>
          </div>
      </div>
    </div>
  );
}