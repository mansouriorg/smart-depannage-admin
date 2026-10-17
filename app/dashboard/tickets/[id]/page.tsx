"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  MapPin, 
  User, 
  Calendar, 
  AlertCircle, 
  Camera, 
  Wrench,
  Phone,
  Loader2,
  CheckCircle2,
  AlertTriangle // ✅ Added AlertTriangle for the issue block
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api"; 
import { SERVER_URL } from "@/lib/config";
import { dashboardStatus } from "@/lib/ticket-status";
import { clsx } from "clsx";

export default function TicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Uploaded files are served from the backend host, NOT under the "/api"
  // prefix that NEXT_PUBLIC_API_URL carries.
  const backendUrl = SERVER_URL;

  useEffect(() => {
    if (ticketId) {
      loadTicketDetails();
    }
  }, [ticketId]);

  const loadTicketDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/interventions/${ticketId}`);
      setTicket(response.data);
    } catch (err: any) {
      console.error("Error fetching ticket:", err);
      setError("Impossible de charger les détails de l'intervention.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for Status Badge styling
  const getStatusStyle = (rawStatus: string) => {
    const status = dashboardStatus(rawStatus);
    switch (status) {
      case "PENDING": return "bg-amber-50 text-amber-600 border-amber-200";
      case "ASSIGNED": return "bg-sky-50 text-sky-600 border-sky-200";
      case "ACCEPTED": return "bg-blue-50 text-blue-600 border-blue-200";
      case "IN_PROGRESS": return "bg-purple-50 text-purple-600 border-purple-200";
      case "COMPLETED": return "bg-emerald-50 text-emerald-600 border-emerald-200";
      case "CANCELLED": return "bg-rose-50 text-rose-600 border-rose-200";
      default: return "bg-stone-100 text-stone-500 border-stone-200";
    }
  };

  const getStatusLabel = (rawStatus: string) => {
    const status = dashboardStatus(rawStatus);
    switch (status) {
      case "PENDING": return "En attente";
      case "ASSIGNED": return "Assigné";
      case "ACCEPTED": return "Affecté";
      case "IN_PROGRESS": return "En cours";
      case "COMPLETED": return "Terminé";
      case "CANCELLED": return "Annulé";
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-10 w-10 text-[#D4AF37] animate-spin" />
        <p className="text-stone-500 font-medium">Chargement du dossier...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl text-center max-w-lg mx-auto mt-20">
        <AlertCircle className="h-10 w-10 mx-auto mb-2 text-red-500" />
        <h2 className="font-bold text-lg mb-1">Erreur</h2>
        <p>{error || "Ticket introuvable"}</p>
        <button onClick={() => router.back()} className="mt-4 text-red-700 font-medium underline">
          Retour aux interventions
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
      
      {/* --- EN-TÊTE --- */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Link 
            href="/dashboard/tickets" 
            className="p-2 bg-stone-50 hover:bg-stone-100 rounded-lg text-stone-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-blue-950">
                Intervention #{ticket.id}
              </h1>
              <span className={clsx("px-3 py-1 rounded-full text-xs font-bold border", getStatusStyle(ticket.status))}>
                {getStatusLabel(ticket.status)}
              </span>
            </div>
            <p className="text-stone-500 text-sm mt-1">{ticket.serviceType}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- COLONNE GAUCHE (Détails) --- */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Bloc 1: Informations du Client */}
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
            <h2 className="text-lg font-bold text-blue-950 flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-[#D4AF37]" />
              Informations du Client
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-stone-500">Nom complet</p>
                <p className="font-medium text-blue-950">{ticket.client?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Téléphone</p>
                <p className="font-medium text-blue-950 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-stone-400" />
                  {ticket.client?.phone || "N/A"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-stone-500">Adresse d'intervention</p>
                <p className="font-medium text-blue-950 flex items-start gap-1 mt-1">
                  <MapPin className="h-4 w-4 text-stone-400 mt-0.5 shrink-0" />
                  {ticket.address}
                </p>
              </div>
            </div>
          </div>

          {/* Bloc 2: Description du problème */}
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
            <h2 className="text-lg font-bold text-blue-950 flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              Description du problème
            </h2>
            <div className="p-4 bg-stone-50 rounded-lg border border-stone-100 text-stone-700 whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>

          {/* ✅ NEW: Bloc 2.5: ALERTES EN COURS (Signalement de retard, etc.) */}
          {ticket.hasIssue && ticket.feedbackNotes && (
            <div className="bg-red-50 p-6 rounded-xl border border-red-200 shadow-sm animate-pulse-subtle">
              <h2 className="text-lg font-bold text-red-800 flex items-center gap-2 mb-4 uppercase tracking-wider text-sm">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Signalement Actif du Client
              </h2>
              <div className="p-4 bg-white rounded-lg border border-red-100 text-red-900 whitespace-pre-wrap font-medium">
                {ticket.feedbackNotes}
              </div>
              {ticket.status !== 'COMPLETED' && (
                <p className="text-xs text-red-600 mt-3 italic">
                  Cette alerte a été soumise pendant que l'intervention est toujours en cours.
                </p>
              )}
            </div>
          )}

          {/* 📸 Bloc 3: PREUVE DE TRAVAIL SÉCURISÉE (Affiché uniquement si terminé) */}
          {ticket.status === 'COMPLETED' && ticket.afterPhotoUrl && (
            <div className="bg-[#0f172a] p-6 rounded-xl shadow-lg border border-blue-900 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37] rounded-full blur-[80px] opacity-10 pointer-events-none" />
              
              <h2 className="text-lg font-bold text-[#F3DFA2] flex items-center gap-2 mb-6 relative z-10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Preuve de Travail Sécurisée
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                <div className="rounded-lg overflow-hidden border-2 border-stone-700 bg-black/50 aspect-video relative">
                  <img 
                    src={`${backendUrl}${ticket.afterPhotoUrl}`} 
                    alt="Preuve du travail" 
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div className="space-y-4 flex flex-col justify-center">
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <p className="text-xs text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Date & Heure
                    </p>
                    <p className="font-mono text-sm text-emerald-300">
                      {new Date(ticket.afterPhotoAt).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </p>
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <p className="text-xs text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Coordonnées GPS
                    </p>
                    <p className="font-mono text-sm text-blue-300">Lat: {ticket.afterPhotoLat}</p>
                    <p className="font-mono text-sm text-blue-300">Lng: {ticket.afterPhotoLng}</p>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${ticket.afterPhotoLat},${ticket.afterPhotoLng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#D4AF37] hover:underline mt-2 inline-block"
                    >
                      Ouvrir dans Google Maps ↗
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- COLONNE DROITE (Actions / Artisan) --- */}
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
            <h2 className="text-lg font-bold text-blue-950 flex items-center gap-2 mb-4">
              <Wrench className="h-5 w-5 text-[#D4AF37]" />
              Artisan Assigné
            </h2>
            
            {ticket.artisan ? (
              <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-lg border border-stone-100">
                <div className="h-12 w-12 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#B69121] font-bold text-lg">
                  {ticket.artisan.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-blue-950">{ticket.artisan.name}</p>
                  <p className="text-sm text-stone-500">{ticket.artisan.phone}</p>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 bg-stone-50 rounded-lg border border-stone-100 border-dashed">
                <p className="text-sm text-stone-500">Aucun artisan n'est encore affecté à cette intervention.</p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
            <h2 className="text-lg font-bold text-blue-950 flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-[#D4AF37]" />
              Historique
            </h2>
            <div className="space-y-3 text-sm text-stone-600">
              <div className="flex justify-between border-b border-stone-100 pb-2">
                <span>Créé le</span>
                <span className="font-medium">{new Date(ticket.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between border-b border-stone-100 pb-2">
                <span>Dernière maj</span>
                <span className="font-medium">{new Date(ticket.updatedAt).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
