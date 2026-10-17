"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Briefcase, 
  Phone, 
  Mail,
  Loader2,
  AlertTriangle,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordLinkDialog } from "@/components/password-link-dialog";

// Match the data shape from your Backend
interface Application {
  id: number;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  experience: number;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

// --- TYPES FOR UI FEEDBACK ---
type ConfirmState = {
  isOpen: boolean;
  id: number | null;
  action: "approve" | "reject" | null;
};

type ToastState = {
  show: boolean;
  message: string;
  type: "success" | "error";
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);

  // UI States
  const [confirmModal, setConfirmModal] = useState<ConfirmState>({ isOpen: false, id: null, action: null });
  const [toast, setToast] = useState<ToastState>({ show: false, message: "", type: "success" });

  // Helper to show toast
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000); // Auto hide after 4s
  };

  // 1. Fetch Data on Load
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const res = await api.get("/artisan-applications");
        setApplications(res.data);
      } catch (err) {
        console.error("Failed to fetch applications", err);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  // 2. Open Confirmation Modal
  const requestAction = (id: number, action: "approve" | "reject") => {
    setConfirmModal({ isOpen: true, id, action });
  };

  // 3. Execute Logic
  const executeAction = async () => {
    if (!confirmModal.id || !confirmModal.action) return;

    const { id, action } = confirmModal;
    setProcessingId(id);
    
    // Close modal immediately so we can show loading on the table row (optional UX choice)
    setConfirmModal({ isOpen: false, id: null, action: null });

    try {
      const res = await api.patch(`/artisan-applications/${id}/${action}`);

      // E-mails are not sent yet: the API returns the one-time link instead.
      if (action === "approve" && res.data?.passwordSetupUrl) {
        setSetupUrl(res.data.passwordSetupUrl);
      }
      
      // Update UI
      setApplications(prev => prev.map(app => 
        app.id === id ? { ...app, status: action === "approve" ? "APPROVED" : "REJECTED" } : app
      ));

      showToast(
        action === "approve" 
          ? "Compte technicien créé avec succès !" 
          : "Candidature refusée.", 
        "success"
      );

    } catch (err: any) {
      console.error(`Failed to ${action}`, err);
      showToast(err.response?.data?.message || "Une erreur est survenue.", "error");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-stone-500 animate-pulse">Chargement des candidatures...</div>;

  return (
    <div className="relative p-6 max-w-7xl mx-auto space-y-6">

      {setupUrl && (
        <PasswordLinkDialog
          url={setupUrl}
          title="Compte créé : lien pour l'artisan"
          onClose={() => setSetupUrl(null)}
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold text-blue-950">Candidatures Techniciens</h1>
           <p className="text-sm text-stone-500">Gérez les demandes d'adhésion des artisans.</p>
        </div>
        <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-xs font-bold border border-stone-200">
           {applications.filter(a => a.status === 'PENDING').length} en attente
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 border-b border-stone-100">
            <tr>
              <th className="px-6 py-4 font-semibold text-stone-500 uppercase text-xs">Candidat</th>
              <th className="px-6 py-4 font-semibold text-stone-500 uppercase text-xs">Profil</th>
              <th className="px-6 py-4 font-semibold text-stone-500 uppercase text-xs">Motivation</th>
              <th className="px-6 py-4 font-semibold text-stone-500 uppercase text-xs">Date</th>
              <th className="px-6 py-4 font-semibold text-stone-500 uppercase text-xs text-center">Statut</th>
              <th className="px-6 py-4 font-semibold text-stone-500 uppercase text-xs text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {applications.length === 0 ? (
              <tr><td colSpan={6} className="p-12 text-center text-stone-500">Aucune candidature pour le moment.</td></tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id} className="hover:bg-stone-50/50 transition-colors group">
                  
                  {/* CANDIDAT INFO */}
                  <td className="px-6 py-4">
                    <div className="font-bold text-blue-950 text-base">{app.name}</div>
                    <div className="flex flex-col text-xs text-stone-500 mt-1 gap-1">
                      <span className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-[#D4AF37]"/> {app.email}</span>
                      <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-[#D4AF37]"/> {app.phone}</span>
                    </div>
                  </td>

                  {/* PROFIL (Spécialité & Exp) */}
                  <td className="px-6 py-4">
                     <div className="flex flex-col gap-1.5">
                        <span className="inline-flex w-fit px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100">
                          {app.specialty}
                        </span>
                        <div className="text-xs text-stone-500 flex items-center gap-1">
                           <Briefcase className="h-3 w-3" /> {app.experience} ans d'expérience
                        </div>
                     </div>
                  </td>

                  {/* DESCRIPTION */}
                  <td className="px-6 py-4 max-w-xs">
                    <p className="truncate text-stone-600 text-xs italic bg-stone-50 p-2 rounded border border-stone-100" title={app.description}>
                      "{app.description || "Aucune description."}"
                    </p>
                  </td>

                  {/* DATE */}
                  <td className="px-6 py-4 text-xs text-stone-500 font-medium">
                    {format(new Date(app.createdAt), "d MMM yyyy", { locale: fr })}
                  </td>

                  {/* STATUT BADGE */}
                  <td className="px-6 py-4 text-center">
                    {app.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                        <Clock className="h-3 w-3" /> En attente
                      </span>
                    )}
                    {app.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                        <CheckCircle2 className="h-3 w-3" /> Approuvé
                      </span>
                    )}
                    {app.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                        <XCircle className="h-3 w-3" /> Refusé
                      </span>
                    )}
                  </td>

                  {/* ACTIONS */}
                  <td className="px-6 py-4 text-right">
                    {app.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                         <Button 
                           size="sm" 
                           onClick={() => requestAction(app.id, "approve")}
                           disabled={processingId === app.id}
                           className="bg-green-600 hover:bg-green-700 text-white h-8 w-8 p-0 rounded-full shadow-sm"
                           title="Approuver"
                         >
                           {processingId === app.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                         </Button>
                         <Button 
                           size="sm" 
                           variant="destructive"
                           onClick={() => requestAction(app.id, "reject")}
                           disabled={processingId === app.id}
                           className="h-8 w-8 p-0 rounded-full shadow-sm bg-red-500 hover:bg-red-600"
                           title="Refuser"
                         >
                           <XCircle className="h-4 w-4" />
                         </Button>
                      </div>
                    ) : (
                      <span className="text-stone-300 text-xs">—</span>
                    )}
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- 1. CONFIRMATION MODAL (Custom Implementation) --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-stone-200 scale-100 animate-in zoom-in-95 duration-200">
            
            {/* Modal Icon */}
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto ${confirmModal.action === "approve" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
               {confirmModal.action === "approve" ? <CheckCircle2 className="h-6 w-6"/> : <AlertTriangle className="h-6 w-6"/>}
            </div>

            {/* Modal Text */}
            <div className="text-center space-y-2 mb-6">
              <h3 className="text-lg font-bold text-blue-950">
                {confirmModal.action === "approve" ? "Approuver ce technicien ?" : "Refuser la candidature ?"}
              </h3>
              <p className="text-sm text-stone-500">
                {confirmModal.action === "approve" 
                  ? "Cette action va créer automatiquement un compte utilisateur avec le rôle Technicien."
                  : "Le candidat sera marqué comme refusé. Cette action est irréversible."}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setConfirmModal({ isOpen: false, id: null, action: null })}
              >
                Annuler
              </Button>
              <Button 
                className={`flex-1 text-white ${confirmModal.action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                onClick={executeAction}
              >
                {confirmModal.action === "approve" ? "Confirmer" : "Refuser"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. TOAST NOTIFICATION (Custom Implementation) --- */}
      <div 
        className={`fixed bottom-6 right-6 z-50 transition-all duration-500 transform ${toast.show ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0 pointer-events-none"}`}
      >
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
          toast.type === "success" 
            ? "bg-green-50 border-green-200 text-green-800" 
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="h-5 w-5"/> : <AlertTriangle className="h-5 w-5"/>}
          <span className="font-medium text-sm">{toast.message}</span>
          <button onClick={() => setToast(prev => ({ ...prev, show: false }))} className="ml-2 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
