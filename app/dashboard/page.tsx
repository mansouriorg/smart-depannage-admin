// src/app/dashboard/page.tsx
import { 
  TrendingUp, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Activity
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { MOCK_TICKETS } from "@/lib/mock-data"; // On réutilise vos fausses données

export default function DashboardPage() {
  // Calculs simples basés sur les fausses données
  const totalTickets = MOCK_TICKETS.length;
  const pendingTickets = MOCK_TICKETS.filter(t => t.status === "EN_ATTENTE").length;
  const completedTickets = MOCK_TICKETS.filter(t => t.status === "TERMINE").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* --- EN-TÊTE --- */}
      <div>
        <h1 className="text-3xl font-bold text-blue-950 tracking-tight">Vue d'ensemble</h1>
        <p className="text-stone-500 mt-1">
          Bienvenue sur votre espace de pilotage. Voici ce qu'il se passe aujourd'hui.
        </p>
      </div>

      {/* --- CARTES KPI (Indicateurs) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1 : Chiffre d'affaires (OR) */}
        <StatCard 
          title="Chiffre d'affaires (Mois)" 
          value="12,450 TND" 
          trend="+15% vs janv."
          icon={TrendingUp}
          theme="gold"
        />

        {/* KPI 2 : Urgences (ROUGE/OR si critique) */}
        <StatCard 
          title="Urgences en attente" 
          value={pendingTickets.toString()} 
          trend="Action requise"
          icon={AlertCircle}
          theme="danger" // Rouge pour alerter, mais stylisé propre
        />

        {/* KPI 3 : Techniciens Actifs (BLEU) */}
        <StatCard 
          title="Techniciens actifs" 
          value="8 / 12" 
          trend="Haute disponibilité"
          icon={Users}
          theme="blue"
        />

        {/* KPI 4 : Taux de résolution (VERT) */}
        <StatCard 
          title="Taux de résolution" 
          value="94%" 
          trend="Excellent"
          icon={CheckCircle2}
          theme="green"
        />
      </div>

      {/* --- SECTION BASSE : ACTIVITÉ RÉCENTE --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Colonne Gauche (Large) : Derniers Tickets */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-xl shadow-lg shadow-stone-200/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-blue-950 flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#B69121]" />
              Activité Récente
            </h2>
            <Link href="/dashboard/tickets" className="text-sm font-medium text-[#B69121] hover:text-[#D4AF37] hover:underline flex items-center gap-1">
              Tout voir <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {MOCK_TICKETS.slice(0, 4).map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-4 rounded-lg bg-stone-50 border border-stone-100 hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 transition-all group">
                <div className="flex items-center gap-4">
                  <div className={clsx(
                    "h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold",
                    ticket.status === 'EN_ATTENTE' ? "bg-[#D4AF37]/10 text-[#B69121]" : "bg-white border border-stone-200 text-stone-400"
                  )}>
                    {ticket.clientName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-blue-950 group-hover:text-[#B69121] transition-colors">{ticket.type}</p>
                    <p className="text-sm text-stone-500">{ticket.clientName} • {ticket.address}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={clsx(
                    "px-2.5 py-1 rounded-full text-xs font-bold border",
                    ticket.status === 'EN_ATTENTE' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-stone-100 text-stone-500 border-stone-200"
                  )}>
                    {ticket.status === 'EN_ATTENTE' ? 'Nouveau' : 'Traité'}
                  </span>
                  <p className="text-xs text-stone-400 mt-1">Il y a 2h</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Colonne Droite (Etroite) : Actions Rapides */}
        <div className="bg-[#0f111a] rounded-xl shadow-2xl shadow-blue-900/20 p-6 text-white relative overflow-hidden">
          {/* Décoration de fond Or */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] rounded-full blur-[60px] opacity-20 pointer-events-none" />

          <h3 className="text-lg font-bold mb-1 text-[#F3DFA2]">Accès Rapide</h3>
          <p className="text-stone-400 text-sm mb-6">Gérez votre flotte en un clic.</p>

          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37]/50 transition-all group">
              <span className="block font-bold text-stone-200 group-hover:text-white">Ajouter un technicien</span>
              <span className="text-xs text-stone-500 group-hover:text-[#F3DFA2]">Envoyer une invitation par email</span>
            </button>
            
            <button className="w-full text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37]/50 transition-all group">
              <span className="block font-bold text-stone-200 group-hover:text-white">Exporter les rapports</span>
              <span className="text-xs text-stone-500 group-hover:text-[#F3DFA2]">Format CSV ou PDF</span>
            </button>

            <button className="w-full text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37]/50 transition-all group">
              <span className="block font-bold text-stone-200 group-hover:text-white">Paramètres de facturation</span>
              <span className="text-xs text-stone-500 group-hover:text-[#F3DFA2]">Mettre à jour les taux horaires</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- COMPOSANT UI : CARTE KPI ---
function StatCard({ 
  title, 
  value, 
  trend, 
  icon: Icon, 
  theme = "blue" 
}: { 
  title: string, 
  value: string, 
  trend: string, 
  icon: any, 
  theme?: "gold" | "blue" | "green" | "danger" 
}) {
  
  const themeStyles = {
    gold: {
      iconBg: "bg-[#D4AF37]/10 text-[#B69121]",
      trend: "text-[#B69121]",
      border: "hover:border-[#D4AF37]/50"
    },
    blue: {
      iconBg: "bg-blue-50 text-blue-700",
      trend: "text-blue-600",
      border: "hover:border-blue-200"
    },
    green: {
      iconBg: "bg-emerald-50 text-emerald-700",
      trend: "text-emerald-600",
      border: "hover:border-emerald-200"
    },
    danger: {
      iconBg: "bg-rose-50 text-rose-600",
      trend: "text-rose-600 font-bold",
      border: "hover:border-rose-200"
    }
  };

  const style = themeStyles[theme];

  return (
    <div className={clsx(
      "bg-white p-6 rounded-xl border border-stone-200 shadow-sm transition-all duration-300 group",
      style.border,
      "hover:shadow-lg hover:-translate-y-1"
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-stone-500 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-blue-950 mt-1 group-hover:scale-105 transition-transform origin-left">{value}</h3>
        </div>
        <div className={clsx("p-2.5 rounded-lg transition-colors", style.iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center text-xs">
        <span className={clsx("font-medium", style.trend)}>{trend}</span>
      </div>
    </div>
  );
}