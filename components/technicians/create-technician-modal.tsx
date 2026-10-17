"use client";

import { useState } from "react";
import { Plus, X, Loader2, UserPlus } from "lucide-react";
import api from "@/lib/api"; // Make sure this path matches your api helper!
import { PasswordLinkDialog } from "@/components/password-link-dialog";

interface CreateTechnicianModalProps {
  onSuccess: () => void;
}

export function CreateTechnicianModal({ onSuccess }: CreateTechnicianModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "Plombier", // Default value
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 🚀 Calls the new secure NestJS endpoint we just made
      const res = await api.post("/users/artisans/create", formData);

      // E-mails are not sent yet: the API returns the one-time link instead.
      if (res.data?.passwordSetupUrl) {
        setSetupUrl(res.data.passwordSetupUrl);
      }
      
      setIsOpen(false);
      setFormData({ name: "", email: "", phone: "", specialty: "Plombier" });
      
      // Refresh the table!
      onSuccess(); 
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Une erreur est survenue lors de la création.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {setupUrl && (
        <PasswordLinkDialog url={setupUrl} onClose={() => setSetupUrl(null)} />
      )}

      {/* 1. THE TRIGGER BUTTON */}
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center px-4 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#B69121] text-white font-bold shadow-md shadow-[#D4AF37]/20 border-t border-[#F3DFA2]/30 transition-all"
      >
        <Plus className="mr-2 h-4 w-4" /> Ajouter
      </button>

      {/* 2. THE MODAL POPUP */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 m-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
              <h2 className="text-lg font-bold text-blue-950 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#D4AF37]" />
                Nouveau Technicien
              </h2>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-full p-1.5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Error Message Display */}
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-stone-700">Nom Complet</label>
                <input 
                  required 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50" 
                  placeholder="Jean Dupont"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-stone-700">Adresse Email</label>
                <input 
                  required 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50" 
                  placeholder="jean.dupont@email.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-stone-700">Numéro de Téléphone</label>
                <input 
                  required 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50" 
                  placeholder="06 12 34 56 78"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-stone-700">Spécialité Principale</label>
                <select 
                  value={formData.specialty}
                  onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 bg-white"
                >
                  <option value="Plombier">Plombier</option>
                  <option value="Électricien">Électricien</option>
                  <option value="Serrurier">Serrurier</option>
                  <option value="Menuisier">Menuisier</option>
                  <option value="Polyvalent">Polyvalent</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)} 
                  className="flex-1 px-4 py-2 border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 font-medium transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="flex-1 flex justify-center items-center px-4 py-2 bg-[#D4AF37] hover:bg-[#B69121] text-white rounded-lg font-medium transition-colors disabled:opacity-70"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isLoading ? "Création..." : "Créer le compte"}
                </button>
              </div>
              
              {/* Info Note */}
              <p className="text-xs text-center text-stone-400 mt-2">
                Le technicien reçoit par email un lien à usage unique (valable 24 h)
                pour choisir son mot de passe.
              </p>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
