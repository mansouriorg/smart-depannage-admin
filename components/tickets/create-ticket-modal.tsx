"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Save, MapPin, FileText, Wrench, Phone } from "lucide-react";
import api from "@/lib/api";

interface CreateTicketModalProps {
  onSuccess: () => void; // To refresh the table after creation
}

export function CreateTicketModal({ onSuccess }: CreateTicketModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    serviceType: "PLOMBIER",
    description: "",
    address: "",
    contactPhone: "", // ✅ Added phone number field
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // ✅ UPDATED: Use '/interventions/secure' so the backend knows you are Admin
      await api.post("/interventions/secure", formData);
      
      setIsOpen(false);
      // Reset form
      setFormData({ 
        serviceType: "PLOMBIER", 
        description: "", 
        address: "", 
        contactPhone: "" 
      }); 
      
      alert("Ticket créé avec succès !");
      onSuccess(); // Refresh parent list
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message;
      alert(Array.isArray(msg) ? msg[0] : msg || "Erreur lors de la création");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 bg-blue-950 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all">
            <Plus className="h-4 w-4" /> Créer un ticket
        </button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] bg-white text-stone-800">
        <DialogHeader>
          <DialogTitle className="text-blue-950 flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#D4AF37]" />
            Nouveau Ticket Admin
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          
          {/* 1. Service Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1.5">
              <Wrench className="h-3 w-3" /> Type de service
            </label>
            <div className="relative">
              <select
                className="w-full appearance-none bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#D4AF37]/50 outline-none"
                value={formData.serviceType}
                onChange={(e) => setFormData({...formData, serviceType: e.target.value})}
              >
                <option value="PLOMBIER">Plomberie</option>
                <option value="ELECTRICIEN">Électricité</option>
                <option value="SERRURIER">Serrurerie</option>
                <option value="MENUISIER">Menuiserie</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
          </div>

          {/* 2. Phone Number (ADDED) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> Numéro de téléphone
            </label>
            <input 
              required
              type="tel"
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37]/50 outline-none"
              placeholder="Ex: 50 123 456"
              value={formData.contactPhone}
              onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
            />
          </div>

          {/* 3. Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Adresse d'intervention
            </label>
            <input 
              required
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37]/50 outline-none"
              placeholder="Ex: Bureau Admin, 12 Rue du Lac..."
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
          </div>

          {/* 4. Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Description du problème
            </label>
            <textarea 
              required
              rows={4}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#D4AF37]/50 outline-none resize-none"
              placeholder="Décrivez le problème en détail..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={isLoading} className="w-full bg-[#D4AF37] hover:bg-[#B69121] text-white font-bold h-10">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Créer la demande
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}