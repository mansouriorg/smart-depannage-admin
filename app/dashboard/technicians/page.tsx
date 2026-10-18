"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { callApi, pageItems, routes } from "@/lib/shared";
import { 
  Search, 
  MapPin, 
  Star, 
  Phone, 
  Wrench,
  Mail,
  Loader2,
  Trash2, 
  Ban,
  ExternalLink,
  KeyRound
} from "lucide-react";

// ✅ 1. IMPORT THE NEW MODAL HERE
import { CreateTechnicianModal } from "@/components/technicians/create-technician-modal";
import { PasswordLinkDialog } from "@/components/password-link-dialog";

interface Technician {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "ARTISAN";
  isActive: boolean;
  specialty?: string; 
  latitude?: number;
  longitude?: number;
  location?: string; 
}

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);

  const fetchTechnicians = async () => {
    try {
      // /users/artisans answers a page ({ data, meta }): a screen that reads another shape does not compile (P1-09)
      const page = await callApi((config) => api.request(config), routes.users.artisans<Technician>());

      setTechnicians(pageItems(page));
    } catch (err) {
      console.error("Failed to fetch technicians", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnicians();
  }, []);

  // New one-time "choose your password" link (the first one was lost or expired)
  const handlePasswordLink = async (id: number) => {
    try {
      const res = await api.post(`/users/${id}/password-setup-link`);

      if (res.data?.passwordSetupUrl) {
        setSetupUrl(res.data.passwordSetupUrl);
      } else {
        alert(res.data?.message || "Un nouveau lien a été envoyé.");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Impossible de créer le lien.");
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm("Êtes-vous sûr ?")) return;
    try {
      await api.delete(`/users/${id}`);
      setTechnicians(prev => prev.map(tech => 
        tech.id === id ? { ...tech, isActive: false } : tech
      ));
    } catch (err) {
      alert("Erreur lors de la désactivation.");
    }
  };

  const getMapLink = (lat?: number, lng?: number) => {
    if (!lat || !lng) return null;
    return `http://maps.google.com/maps?q=${lat},${lng}`;
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {setupUrl && (
        <PasswordLinkDialog url={setupUrl} onClose={() => setSetupUrl(null)} />
      )}
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-950 tracking-tight">Techniciens</h1>
          <p className="text-stone-500 mt-1">
            Gérez votre flotte d'experts ({technicians.filter(t => t.isActive).length} actifs).
          </p>
        </div>
        
        <div className="flex gap-3">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
             <input type="text" placeholder="Rechercher..." className="pl-9 pr-4 py-2.5 rounded-lg border border-stone-200 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all" />
           </div>
           
           {/* ✅ 2. REPLACED THE OLD LINK WITH THE MODAL */}
           <CreateTechnicianModal onSuccess={fetchTechnicians} />
        </div>
      </div>

      {/* GRID */}
      {technicians.length === 0 ? (
        <div className="text-center py-20 bg-stone-50 rounded-xl border border-stone-200 border-dashed">
          <Loader2 className="h-10 w-10 text-stone-300 mx-auto mb-3 animate-spin" /> 
          <p className="text-stone-400 text-sm">Chargement ou aucun technicien...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technicians.map((tech) => (
            <div 
              key={tech.id} 
              className={`border rounded-xl p-6 shadow-sm transition-all relative group ${
                tech.isActive 
                  ? "bg-white border-stone-200 hover:shadow-lg hover:border-[#D4AF37]/30" 
                  : "bg-stone-50 border-stone-200 opacity-70 grayscale"
              }`}
            >
              
              {/* NEW PASSWORD LINK */}
              {tech.isActive && (
                <button onClick={() => handlePasswordLink(tech.id)} className="absolute top-4 right-12 text-stone-300 hover:text-[#B69121] transition-colors p-1" title="Créer un nouveau lien de mot de passe">
                  <KeyRound className="h-5 w-5" />
                </button>
              )}

              {/* DELETE BUTTON */}
              {tech.isActive && (
                <button onClick={() => handleDeactivate(tech.id)} className="absolute top-4 right-4 text-stone-300 hover:text-red-500 transition-colors p-1" title="Désactiver le compte">
                  <Trash2 className="h-5 w-5" />
                </button>
              )}

              {/* IDENTITY */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`h-16 w-16 rounded-full flex items-center justify-center border-2 transition-colors overflow-hidden ${
                  tech.isActive ? "bg-stone-100 border-stone-100 group-hover:border-[#D4AF37]" : "bg-stone-200 border-stone-200"
                }`}>
                    <span className={`text-xl font-bold ${tech.isActive ? "text-stone-500 group-hover:text-[#B69121]" : "text-stone-400"}`}>
                      {tech.name?.charAt(0) || "T"}
                    </span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-blue-950 truncate max-w-[150px]">{tech.name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-[#B69121] font-medium">
                    <Wrench className="h-3.5 w-3.5" />
                    {tech.specialty || "Technicien Polyvalent"}
                  </div>
                </div>
              </div>

              {/* CONTACT & LOCATION */}
              <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500 flex items-center gap-2"><Phone className="h-4 w-4" /> Tél</span>
                    <span className="font-medium text-blue-950">{tech.phone || "-"}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500 flex items-center gap-2"><Mail className="h-4 w-4" /> Email</span>
                    <span className="font-medium text-blue-950 truncate max-w-[150px]" title={tech.email}>{tech.email}</span>
                  </div>

                  {/* ✅ REAL LOCATION DISPLAY */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500 flex items-center gap-2"><MapPin className="h-4 w-4" /> Position</span>
                    
                    {tech.latitude && tech.longitude ? (
                      <a 
                        href={getMapLink(tech.latitude, tech.longitude) || "#"} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline font-medium cursor-pointer"
                      >
                        Voir sur la carte <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="font-medium text-stone-400 italic">Non disponible</span>
                    )}
                  </div>
              </div>

              {/* FOOTER */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                {tech.isActive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Compte Actif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-red-50 text-red-700 border-red-200">
                    <Ban className="h-3 w-3" />
                    Désactivé
                  </span>
                )}
                
                <div className="text-xs text-stone-400 font-medium flex items-center gap-1">
                  <Star className="h-3 w-3 text-[#D4AF37] fill-[#D4AF37]" />
                  <span>5.0</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
