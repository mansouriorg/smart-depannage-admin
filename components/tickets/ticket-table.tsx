"use client";

import { 
  MapPin, 
  Calendar, 
  ArrowUpRight, 
  MoreHorizontal, 
  User 
} from "lucide-react";
import { Ticket } from "@/lib/mock-data";
import { TicketStatusBadge } from "./ticket-status-badge";
import { Button } from "../ui/button";

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
              <th className="px-6 py-4 font-semibold text-stone-500 uppercase tracking-wider text-xs text-right">Action</th>
            </tr>
          </thead>

          {/* --- BODY --- */}
          <tbody className="divide-y divide-stone-100">
            {data.map((ticket) => (
              <tr 
                key={ticket.id} 
                className="group hover:bg-[#D4AF37]/5 transition-colors duration-200 cursor-pointer"
              >
                
                {/* 1. Client */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar avec initiales */}
                    <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 border border-stone-200 group-hover:border-[#D4AF37]/30 group-hover:text-[#B69121] transition-colors">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-blue-950 group-hover:text-[#B69121] transition-colors">
                        {ticket.clientName}
                      </div>
                      <div className="text-stone-400 text-xs font-medium">
                        {ticket.clientPhone}
                      </div>
                    </div>
                  </div>
                </td>

                {/* 2. Type */}
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-50 text-stone-600 border border-stone-200 shadow-sm">
                    {ticket.type}
                  </span>
                </td>

                {/* 3. Statut (Utilisation de votre Badge) */}
                <td className="px-6 py-4">
                  <TicketStatusBadge status={ticket.status} />
                </td>

                {/* 4. Lieu et Date */}
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-stone-700 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
                      <span className="truncate max-w-[180px]">{ticket.address}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-stone-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(ticket.date).toLocaleDateString('fr-FR', { 
                          day: 'numeric', 
                          month: 'short', 
                          hour: '2-digit', 
                          minute:'2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                </td>

                {/* 5. Actions */}
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 items-center">
                     
                     {/* Bouton Traiter (OR - Variante 'gold' de votre bouton) */}
                     <Button 
                        variant="gold" 
                        size="sm" 
                        className="hidden group-hover:inline-flex h-8 text-xs font-bold animate-in slide-in-from-right-2 duration-200"
                     >
                        Traiter <ArrowUpRight className="ml-1 h-3 w-3" />
                     </Button>
                     
                     {/* Menu Options */}
                     <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400">
                       <MoreHorizontal className="h-4 w-4" />
                     </Button>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>

        {/* --- ETAT VIDE (Si pas de tickets) --- */}
        {data.length === 0 && (
          <div className="p-12 text-center text-stone-500">
             <p>Aucune demande trouvée.</p>
          </div>
        )}
      </div>
      
      {/* Pagination */}
      <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500 rounded-b-xl border-x border-b">
          <span>{data.length} résultats affichés</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled>Précédent</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">Suivant</Button>
          </div>
      </div>
    </div>
  );
}