import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  User, 
  XCircle, 
  HelpCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardStatus } from "@/lib/ticket-status";

interface TicketStatusBadgeProps {
  status: string;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  
  // 1. Configuration: Maps Backend ENUM (keys) -> Frontend UI (values)
  // Keys must match exactly what is in your Database (PENDING, COMPLETED...)
  const config: Record<string, { label: string; icon: any; className: string }> = {
    
    // Status: En Attente (PENDING)
    PENDING: {
      label: "En attente",
      icon: AlertCircle,
      // STYLE OR
      className: "bg-[#D4AF37]/10 text-[#B69121] border-[#D4AF37]/20 ring-[#D4AF37]/10",
    },
    
    // Status: Assigné (ASSIGNED) - un artisan a la mission, il ne l'a pas encore acceptée
    ASSIGNED: {
      label: "Assigné",
      icon: User,
      // STYLE CIEL
      className: "bg-sky-50 text-sky-700 border-sky-200 ring-sky-500/10",
    },

    // Status: Accepté (ACCEPTED) - Souvent utilisé pour "Affecté"
    ACCEPTED: {
      label: "Affecté",
      icon: User,
      // STYLE BLEU
      className: "bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10",
    },
    
    // Status: En Cours (IN_PROGRESS)
    IN_PROGRESS: {
      label: "En cours",
      icon: Clock,
      // STYLE VIOLET
      className: "bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/10",
    },
    
    // Status: Terminé (COMPLETED)
    COMPLETED: {
      label: "Terminé",
      icon: CheckCircle2,
      // STYLE VERT
      className: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10",
    },

    // Status: Annulé (CANCELLED)
    CANCELLED: {
      label: "Annulé",
      icon: XCircle,
      // STYLE ROUGE
      className: "bg-red-50 text-red-700 border-red-200 ring-red-500/10",
    },
  };

  // 2. 🛡️ SAFE GUARD: Fallback if status is unknown/undefined
  // This prevents the "Cannot destructure property label of undefined" error.
  const statusConfig = config[dashboardStatus(status)] || {
    label: status || "Inconnu",
    icon: HelpCircle,
    className: "bg-gray-100 text-gray-600 border-gray-200",
  };

  const { label, icon: Icon, className } = statusConfig;

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
