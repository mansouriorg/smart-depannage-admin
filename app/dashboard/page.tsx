"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  TrendingUp, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Activity,
  Loader2,
  BellRing
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import api from "@/lib/api";
import { useStaff } from "@/components/auth/staff-provider";
import { connectLiveSocket } from "@/lib/socket";
import { canOpenDashboardPath } from "@/lib/shared";

// The quick links of the right-hand card. Only the ones the signed-in role can open are shown (P1-12):
// a link to a page that sends the person back here is worse than no link.
const QUICK_LINKS = [
  { href: "/dashboard/technicians", title: "Gérer les techniciens", hint: "Voir les artisans disponibles" },
  { href: "/dashboard/feedbacks", title: "Avis & Retours", hint: "Traiter les signalements clients" },
  { href: "/dashboard/applications", title: "Candidatures", hint: "Valider les nouveaux inscrits" },
];

// Types correspondant à la réponse de notre backend NestJS
interface DashboardData {
  kpis: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    resolutionRate: number;
  };
  recentActivity: Array<{
    id: number;
    serviceType: string;
    status: string;
    address: string;
    createdAt: string;
    client: { name: string; phone: string };
  }>;
}

export default function DashboardPage() {
  const { role } = useStaff();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState<string | null>(null); // État pour la notification bulle

  // Utilisation de useCallback pour pouvoir appeler cette fonction depuis le socket
  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await api.get('/interventions/dashboard/stats');
      setData(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Chargement initial des données
    fetchDashboardStats();

    // 2. 🔌 Connexion au WebSocket du Backend NestJS (token obligatoire)
    const socket = connectLiveSocket();

    if (!socket) {
      return;
    }

    // 3. Écoute de l'événement "Nouvelle Intervention"
    socket.on('newIntervention', (intervention) => {
      setLiveAlert(`🚨 Nouvelle urgence : ${intervention.serviceType}`);
      fetchDashboardStats(); // Met à jour les stats instantanément
      setTimeout(() => setLiveAlert(null), 5000);
    });

    // 4. Écoute de l'événement "Problème signalé par un client"
    socket.on('interventionIssue', (issueData) => {
      setLiveAlert(`⚠️ Problème signalé sur le ticket #${issueData.interventionId}`);
      fetchDashboardStats();
      setTimeout(() => setLiveAlert(null), 6000);
    });

    // Nettoyage de la connexion quand on quitte la page
    return () => {
      socket.disconnect();
    };
  }, [fetchDashboardStats]);

  if (isLoading || !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 text-[#D4AF37] animate-spin" />
        <p className="text-stone-500 font-medium">Connexion au centre de contrôle...</p>
      </div>
    );
  }

  const { kpis, recentActivity } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      
      {/* --- NOTIFICATION LIVE (S'affiche uniquement si le Socket reçoit un message) --- */}
      {liveAlert && (
        <div className="absolute top-0 right-0 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-blue-950 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border-l-4 border-[#D4AF37]">
            <BellRing className="h-5 w-5 text-[#D4AF37] animate-bounce" />
            <span className="font-bold text-sm">{liveAlert}</span>
          </div>
        </div>
      )}

      {/* --- EN-TÊTE --- */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-blue-950 tracking-tight">Vue d'ensemble</h1>
          <span className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-bold border border-green-200">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
            En direct
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Bienvenue sur votre espace de pilotage. Les données sont actualisées en temps réel.
        </p>
      </div>

      {/* --- CARTES KPI (Données dynamiques du Backend) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Interventions" 
          value={kpis.total.toString()} 
          trend="Depuis la création"
          icon={TrendingUp}
          theme="gold"
        />

        <StatCard 
          title="Urgences en attente" 
          value={kpis.pending.toString()} 
          trend={kpis.pending > 0 ? "Action requise" : "Tout est traité"}
          icon={AlertCircle}
          theme={kpis.pending > 0 ? "danger" : "gold"} 
        />

        <StatCard 
          title="Missions en cours" 
          value={kpis.active.toString()} 
          trend="Sur le terrain"
          icon={Users}
          theme="blue"
        />

        <StatCard 
          title="Taux de résolution" 
          value={`${kpis.resolutionRate}%`} 
          trend={kpis.resolutionRate >= 80 ? "Excellent" : "À surveiller"}
          icon={CheckCircle2}
          theme={kpis.resolutionRate >= 80 ? "green" : "blue"}
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
            {recentActivity.length === 0 ? (
              <p className="text-center text-stone-500 py-4">Aucune intervention récente.</p>
            ) : (
              recentActivity.map((ticket) => (
                <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-stone-50 border border-stone-100 hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={clsx(
                        "h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold",
                        ticket.status === 'PENDING' ? "bg-[#D4AF37]/10 text-[#B69121]" : "bg-white border border-stone-200 text-stone-400"
                      )}>
                        {ticket.client?.name ? ticket.client.name.charAt(0).toUpperCase() : "C"}
                      </div>
                      <div>
                        <p className="font-bold text-blue-950 group-hover:text-[#B69121] transition-colors">
                          {ticket.serviceType}
                        </p>
                        <p className="text-sm text-stone-500">{ticket.client?.name || "Client Invité"} • {ticket.address}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-bold border",
                        ticket.status === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-200" 
                        : ticket.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-blue-50 text-blue-600 border-blue-200"
                      )}>
                        {ticket.status === 'PENDING' ? 'À assigner' 
                        : ticket.status === 'COMPLETED' ? 'Terminé' 
                        : 'En cours'}
                      </span>
                      <p className="text-xs text-stone-400 mt-1">
                        {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Colonne Droite (Etroite) : Actions Rapides */}
        <div className="bg-[#0f111a] rounded-xl shadow-2xl shadow-blue-900/20 p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37] rounded-full blur-[60px] opacity-20 pointer-events-none" />

          <h3 className="text-lg font-bold mb-1 text-[#F3DFA2]">Accès Rapide</h3>
          <p className="text-stone-400 text-sm mb-6">Gérez votre plateforme en un clic.</p>

          <div className="space-y-3">
            {QUICK_LINKS.filter((link) => canOpenDashboardPath(role, link.href)).map((link) => (
              <Link key={link.href} href={link.href} className="w-full block text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37]/50 transition-all group">
                <span className="block font-bold text-stone-200 group-hover:text-white">{link.title}</span>
                <span className="text-xs text-stone-500 group-hover:text-[#F3DFA2]">{link.hint}</span>
              </Link>
            ))}
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
