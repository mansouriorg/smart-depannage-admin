// src/app/dashboard/tickets/page.tsx
import { 
  MapPin, 
  Calendar, 
  Filter, 
  ArrowUpRight, 
  MoreHorizontal, 
  Clock, 
  CheckCircle2, 
  User, 
  AlertCircle 
} from "lucide-react";
import { clsx } from "clsx";
import { MOCK_TICKETS, type TicketStatus } from "@/lib/mock-data"; // Assurez-vous du chemin

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
          <button className="bg-blue-950 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all">
            + Créer un ticket
          </button>
        </div>
      </div>

      {/* --- TABLEAU DES TICKETS --- */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-xl shadow-stone-200/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            
            {/* Header du tableau */}
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-stone-500 uppercase tracking-wider text-xs">Client</th>
                <th className="px-6 py-4 font-semibold text-stone-500 uppercase tracking-wider text-xs">Type</th>
                <th className="px-6 py-4 font-semibold text-stone-500 uppercase tracking-wider text-xs">Statut</th>
                <th className="px-6 py-4 font-semibold text-stone-500 uppercase tracking-wider text-xs">Lieu & Date</th>
                <th className="px-6 py-4 font-semibold text-stone-500 uppercase tracking-wider text-xs text-right">Action</th>
              </tr>
            </thead>

            {/* Corps du tableau */}
            <tbody className="divide-y divide-stone-100">
              {MOCK_TICKETS.map((ticket) => (
                <tr 
                  key={ticket.id} 
                  className="group hover:bg-[#D4AF37]/5 transition-colors cursor-pointer"
                >
                  
                  {/* 1. Client */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 border border-stone-200 group-hover:border-[#D4AF37]/30 group-hover:text-[#B69121] transition-colors">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-blue-950">{ticket.clientName}</div>
                        <div className="text-stone-400 text-xs font-medium">{ticket.clientPhone}</div>
                      </div>
                    </div>
                  </td>

                  {/* 2. Type */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-50 text-stone-600 border border-stone-200 shadow-sm">
                      {ticket.type}
                    </span>
                  </td>

                  {/* 3. Statut (Badge Custom) */}
                  <td className="px-6 py-4">
                    <StatusBadge status={ticket.status} />
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
                        <span>{new Date(ticket.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}</span>
                      </div>
                    </div>
                  </td>

                  {/* 5. Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       {/* Bouton Traiter (OR) */}
                       <button className="hidden group-hover:inline-flex items-center gap-1.5 bg-gradient-to-r from-[#D4AF37] to-[#B69121] text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-md hover:brightness-110 transition-all animate-in slide-in-from-right-2 duration-200">
                          Traiter <ArrowUpRight className="h-3 w-3" />
                       </button>
                       <button className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors">
                         <MoreHorizontal className="h-4 w-4" />
                       </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Simple (Fake) */}
        <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span>Affichage de 1 à 5 sur 12 résultats</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-stone-200 rounded bg-white hover:bg-stone-100 disabled:opacity-50" disabled>Précédent</button>
            <button className="px-3 py-1 border border-stone-200 rounded bg-white hover:bg-stone-100 text-blue-950 font-medium">Suivant</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- COMPOSANT INTERNE : BADGE DE STATUT ---
function StatusBadge({ status }: { status: TicketStatus }) {
  // Configuration des styles par statut
  const config = {
    EN_ATTENTE: {
      label: "En attente",
      icon: AlertCircle,
      // STYLE OR (Urgent)
      className: "bg-[#D4AF37]/10 text-[#B69121] border-[#D4AF37]/20 ring-[#D4AF37]/10",
    },
    AFFECTE: {
      label: "Affecté",
      icon: User,
      // STYLE BLEU (Info)
      className: "bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10",
    },
    EN_COURS: {
      label: "En cours",
      icon: Clock,
      // STYLE VIOLET (Actif)
      className: "bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/10",
    },
    TERMINE: {
      label: "Terminé",
      icon: CheckCircle2,
      // STYLE VERT (Succès)
      className: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10",
    },
  };

  const { label, icon: Icon, className } = config[status];

  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ring-1 ring-inset",
      className
    )}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}