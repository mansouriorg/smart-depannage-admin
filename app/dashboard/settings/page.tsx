"use client";

import { useState } from "react";
import { 
  User, 
  Building, 
  Bell, 
  Lock, 
  Save, 
  Loader2,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);

  // Simulation de sauvegarde
  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSaving(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
      
      {/* --- EN-TÊTE --- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-950 tracking-tight">
            Paramètres
          </h1>
          <p className="text-stone-500 mt-1">
            Gérez les informations de votre entreprise et vos préférences.
          </p>
        </div>
        
        {/* Bouton de Sauvegarde Global */}
        <Button 
          variant="gold" 
          onClick={handleSave}
          disabled={isSaving}
          className="shadow-lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Enregistrer les modifications
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- COLONNE GAUCHE : MENU RAPIDE (Visuel) --- */}
        <div className="lg:col-span-1 space-y-6">
           {/* Carte Profil Résumé */}
           <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-stone-100 flex items-center justify-center border-4 border-stone-50 shadow-inner mb-4 relative">
                <span className="text-3xl font-bold text-stone-400">A</span>
                <button className="absolute bottom-0 right-0 bg-[#D4AF37] text-white p-1.5 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform">
                  <User className="h-4 w-4" />
                </button>
              </div>
              <h3 className="font-bold text-lg text-blue-950">Admin Principal</h3>
              <p className="text-sm text-stone-500">Superviseur</p>
              <div className="mt-4 pt-4 border-t border-stone-100 flex justify-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#D4AF37]/10 text-[#B69121]">
                  Compte Premium
                </span>
              </div>
           </div>

           {/* Menu de navigation settings (Statique pour l'instant) */}
           <nav className="flex flex-col space-y-1">
             <MenuLink icon={User} label="Mon Profil" active />
             <MenuLink icon={Building} label="Entreprise" />
             <MenuLink icon={Bell} label="Notifications" />
             <MenuLink icon={CreditCard} label="Facturation" />
             <MenuLink icon={Lock} label="Sécurité" />
           </nav>
        </div>

        {/* --- COLONNE DROITE : FORMULAIRES --- */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. INFORMATIONS ENTREPRISE */}
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-stone-50/50 px-6 py-4 border-b border-stone-100 flex items-center gap-3">
              <Building className="h-5 w-5 text-[#B69121]" />
              <h3 className="font-bold text-blue-950">Informations Entreprise</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Nom de la société" placeholder="Smart-Dépannage SARL" />
                <InputGroup label="Matricule Fiscale" placeholder="1234567/A/M/000" />
              </div>
              <InputGroup label="Adresse du siège" placeholder="15 Avenue de la Liberté, Tunis" icon={MapPin} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Email de contact" placeholder="contact@smart-depannage.tn" icon={Mail} />
                <InputGroup label="Téléphone public" placeholder="+216 71 000 000" icon={Phone} />
              </div>
              <InputGroup label="Site Web" placeholder="https://www.smart-depannage.tn" icon={Globe} />
            </div>
          </div>

          {/* 2. NOTIFICATIONS */}
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
             <div className="bg-stone-50/50 px-6 py-4 border-b border-stone-100 flex items-center gap-3">
              <Bell className="h-5 w-5 text-[#B69121]" />
              <h3 className="font-bold text-blue-950">Préférences de Notification</h3>
            </div>
            
            <div className="p-6 space-y-6">
               <ToggleRow 
                  title="Nouvelle demande d'intervention" 
                  desc="Recevoir un email quand un client soumet un ticket." 
                  checked={true} 
               />
               <ToggleRow 
                  title="Alerte SMS Urgente" 
                  desc="Recevoir un SMS pour les pannes critiques (Fuites, Coupures)." 
                  checked={true} 
               />
               <ToggleRow 
                  title="Rapport hebdomadaire" 
                  desc="Recevoir un résumé des performances chaque lundi." 
                  checked={false} 
               />
            </div>
          </div>

          {/* 3. SECURITÉ */}
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
             <div className="bg-stone-50/50 px-6 py-4 border-b border-stone-100 flex items-center gap-3">
              <Lock className="h-5 w-5 text-[#B69121]" />
              <h3 className="font-bold text-blue-950">Sécurité</h3>
            </div>
            
            <div className="p-6 flex items-center justify-between">
               <div>
                 <p className="font-medium text-blue-950">Mot de passe</p>
                 <p className="text-sm text-stone-500">Dernière modification il y a 3 mois</p>
               </div>
               <Button variant="outline" size="sm">Changer</Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- COMPOSANTS LOCAUX ---

function MenuLink({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <button className={clsx(
      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left",
      active 
        ? "bg-blue-950 text-white shadow-md shadow-blue-900/20" 
        : "text-stone-600 hover:bg-stone-100 hover:text-blue-950"
    )}>
      <Icon className={clsx("h-4 w-4", active ? "text-[#D4AF37]" : "text-stone-400")} />
      {label}
    </button>
  );
}

function InputGroup({ label, placeholder, icon: Icon }: { label: string, placeholder: string, icon?: any }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-stone-500 uppercase tracking-wide ml-1">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input 
          type="text" 
          placeholder={placeholder}
          className={clsx(
            "w-full bg-white border border-stone-200 text-stone-800 rounded-lg py-2.5 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all placeholder:text-stone-300 text-sm",
            Icon ? "pl-9 pr-3" : "px-3"
          )}
        />
      </div>
    </div>
  );
}

function ToggleRow({ title, desc, checked: initialChecked }: { title: string, desc: string, checked: boolean }) {
  const [checked, setChecked] = useState(initialChecked);

  return (
    <div className="flex items-center justify-between">
       <div>
         <p className="font-bold text-blue-950 text-sm">{title}</p>
         <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
       </div>
       {/* Custom Toggle Switch */}
       <button 
         onClick={() => setChecked(!checked)}
         className={clsx(
           "w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50",
           checked ? "bg-[#D4AF37]" : "bg-stone-200"
         )}
       >
         <span className={clsx(
           "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out",
           checked ? "translate-x-5" : "translate-x-0"
         )} />
       </button>
    </div>
  );
}