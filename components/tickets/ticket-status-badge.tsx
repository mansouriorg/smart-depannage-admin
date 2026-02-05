// src/components/tickets/ticket-status-badge.tsx
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  User 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type TicketStatus } from "@/lib/mock-data";

interface TicketStatusBadgeProps {
  status: TicketStatus;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  
  // Configuration des styles et icônes pour chaque statut
  const config = {
    EN_ATTENTE: {
      label: "En attente",
      icon: AlertCircle,
      // STYLE OR (Urgent / Action requise)
      // Fond Or très léger, Texte Or foncé, Bordure Or
      className: "bg-[#D4AF37]/10 text-[#B69121] border-[#D4AF37]/20 ring-[#D4AF37]/10",
    },
    AFFECTE: {
      label: "Affecté",
      icon: User,
      // STYLE BLEU (Information)
      className: "bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10",
    },
    EN_COURS: {
      label: "En cours",
      icon: Clock,
      // STYLE VIOLET (Activité en cours)
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
    <span 
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ring-1 ring-inset transition-all",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}