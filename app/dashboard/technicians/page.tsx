"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { callApi, clockText, pageItems, routes } from "@/lib/shared";
import { 
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

// The "Add technician" form is an invitation (P1-11)
import { InviteTechnicianModal } from "@/components/technicians/invite-technician-modal";
import { PasswordLinkDialog } from "@/components/password-link-dialog";
import { useStaff } from "@/components/auth/staff-provider";
import { PositionBadge } from "@/components/technicians/position-badge";
import { noPositionYet, positionIsExpected, ratingLabel } from "@/lib/technicians";

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
  // When the phone last said where it is, and whether that is too long ago (P3-05): GET /users/artisans carries the flag
  locationState?: "fresh" | "stale" | "unknown";
  locationAgeMinutes?: number | null;
  location?: string; 
  // The trade and the real rating of the profile (P1-12): GET /users/artisans carries them
  artisanProfile?: { specialty?: string | null; averageRating?: number | null; ratingCount?: number | null; availabilityStatus?: string | null } | null;
  // A job on the way, arrived or at work: the phone sends its position for it whatever the switch says (P3-05)
  hasJobUnderWay?: boolean;
  // What customers answered after the jobs of this artisan (the rating of the tracking link)
  feedback?: { average?: number | null; count?: number | null } | null;
}

/** How often the list is read again while the page is open and in front, and the least time between the start of two readings. */
const REFRESH_EVERY_MS = 60_000;
const REFRESH_MIN_GAP_MS = 30_000;

// The list is read in pages of this size, all of them: with no search box, a technician beyond the first page could not be reached.
const PAGE_SIZE = 200;
const MAX_PAGES = 10;
// A read that has not answered after this long is given up and said so: a connection that hangs (a laptop that slept) must not keep the "à jour" badges on the screen for ever.
const READ_TIMEOUT_MS = 20_000;

export default function TechniciansPage() {
  // A dispatcher or a support agent reads the list; inviting, switching off and sending a password link are for the administrators (the API refuses the others).
  const { can } = useStaff();
  const canInvite = can("inviteTechnician");
  const canManage = can("manageTechnician");
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);

  // The flag on a position is worked out by the server when the list is read: a page left open has to read again, or "up to date" would stay
  // on the screen for hours after the phone went quiet (P3-05). `updatedAt` tells the dispatcher how old the screen is, and a reading that
  // failed says so (the list on the screen is then the one of `updatedAt`).
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [readFailed, setReadFailed] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const fetching = useRef(false);
  // When the last reading began (a failed one counts: a server that is down is not asked more often because the person alt-tabs).
  const lastAttempt = useRef(0);
  // Bumped by every change made from this page (a deactivation, an invitation): a reading that began before it would bring back the rows as they
  // were, so it is dropped and made again.
  const changes = useRef(0);

  const fetchTechnicians = async () => {
    if (fetching.current) return;

    fetching.current = true;
    lastAttempt.current = Date.now();

    const startedAt = changes.current;
    let again = false;

    try {
      // /users/artisans answers a page ({ data, meta }): a screen that reads another shape does not compile (P1-09)
      // Kept by number: a technician invited while the pages are being read moves the others by one, and one would be seen twice.
      const all = new Map<number, Technician>();
      let page = 1;
      let pages = 1;

      do {
        const answer = await callApi((config) => api.request({ ...config, timeout: READ_TIMEOUT_MS }), routes.users.artisans<Technician>({ page, limit: PAGE_SIZE }));

        for (const item of pageItems(answer)) all.set(item.id, item);
        pages = answer?.meta?.totalPages ?? 1;
        page += 1;
      } while (page <= pages && page <= MAX_PAGES);

      if (changes.current !== startedAt) {
        again = true;
      } else {
        setTechnicians([...all.values()]);
        setTruncated(pages > MAX_PAGES);
        setReadFailed(false);
        setUpdatedAt(Date.now());
      }
    } catch (err) {
      console.error("Failed to fetch technicians", err);
      setReadFailed(true);
    } finally {
      fetching.current = false;
      setLoading(false);
    }

    if (again) void fetchTechnicians();
  };

  // Something was changed from this page: read the list again once the reading that may have begun before it is over.
  const changed = () => {
    changes.current += 1;
    void fetchTechnicians();
  };

  useEffect(() => {
    void fetchTechnicians();

    // Every minute while the tab is in front, and when the person comes back to it; never more often than every thirty seconds.
    const refreshIfDue = () => {
      if (document.visibilityState === "visible" && Date.now() - lastAttempt.current >= REFRESH_MIN_GAP_MS) void fetchTechnicians();
    };
    const timer = setInterval(refreshIfDue, REFRESH_EVERY_MS);

    document.addEventListener("visibilitychange", refreshIfDue);
    window.addEventListener("focus", refreshIfDue);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfDue);
      window.removeEventListener("focus", refreshIfDue);
    };
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
      changed();
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
          {updatedAt ? (
            <p className="text-xs text-stone-400 mt-0.5">Liste mise à jour à {clockText(new Date(updatedAt).toISOString())}</p>
          ) : null}
          {readFailed && technicians.length > 0 ? (
            <p className="text-xs text-red-600 mt-0.5">La mise à jour de la liste a échoué : ce qui est affiché peut ne plus être juste.</p>
          ) : null}
          {truncated ? (
            <p className="text-xs text-amber-700 mt-0.5">Seuls les {MAX_PAGES * PAGE_SIZE} techniciens les plus récents sont affichés.</p>
          ) : null}
        </div>
        
        {canInvite && (
          <div className="flex gap-3">
            <InviteTechnicianModal onSuccess={changed} />
          </div>
        )}
      </div>

      {/* GRID */}
      {technicians.length === 0 ? (
        <div className="text-center py-20 bg-stone-50 rounded-xl border border-stone-200 border-dashed">
          <Wrench className="h-10 w-10 text-stone-300 mx-auto mb-3" /> 
          <p className="text-stone-400 text-sm">{readFailed ? "Impossible de charger la liste des techniciens." : "Aucun technicien pour le moment."}</p>
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
              {canManage && tech.isActive && (
                <button onClick={() => handlePasswordLink(tech.id)} className="absolute top-4 right-12 text-stone-300 hover:text-[#B69121] transition-colors p-1" title="Créer un nouveau lien de mot de passe">
                  <KeyRound className="h-5 w-5" />
                </button>
              )}

              {/* DELETE BUTTON */}
              {canManage && tech.isActive && (
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
                    {tech.artisanProfile?.specialty || tech.specialty || "Technicien Polyvalent"}
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

                  {/* How old that position is: a technician whose phone has been silent is flagged (P3-05), but only one who is at work: an
                      offline or deactivated technician sends nothing, and an amber flag on each of them hides the one who really went quiet. */}
                  {tech.latitude && tech.longitude && positionIsExpected(tech) ? (
                    <div className="flex justify-end">
                      <PositionBadge state={tech.locationState} ageMinutes={tech.locationAgeMinutes} />
                    </div>
                  ) : noPositionYet(tech) ? (
                    <div className="flex justify-end">
                      <PositionBadge missing />
                    </div>
                  ) : null}
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
                  <span>{ratingLabel(tech.artisanProfile, tech.feedback)}</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
