"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  User, 
  Lock, 
  Save, 
  Loader2,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";
import api, { apiErrorMessage } from "@/lib/api";
import { leaveAfterPasswordChange } from "@/lib/auth";
import { passwordFormProblem } from "@/lib/password";
import { toStaffUser } from "@/lib/session";
import { displayName, frenchDate, initialOf } from "@/lib/staff-display";
import { canOpenDashboardPath, staffRoleLabel } from "@/lib/shared";
import { useStaff } from "@/components/auth/staff-provider";

export default function SettingsPage() {
  // Whose profile this is (P1-12): the signed-in account, as the server describes it. Every staff role has one.
  // The company (its name, its address, its tax numbers) is not a field of this account: it is set in "Entreprise" (P2-09).
  const { user, role, update } = useStaff();
  const companyPage = canOpenDashboardPath(role, "/dashboard/company");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // ✅ ÉTAT POUR L'ONGLET ACTIF (Sidebar)
  const [activeTab, setActiveTab] = useState("profile");

  // État dynamique aligné avec ton schéma Prisma
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(null);

  // Récupération des données du backend
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await api.get('/users/profile');
        setFormData({
          name: response.data.name || "",
          email: response.data.email || "",
          phone: response.data.phone || "",
          address: response.data.address || "",
        });
        setPasswordChangedAt(response.data.passwordChangedAt ?? null);
      } catch (error) {
        console.error("Erreur lors du chargement du profil", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Gestion dynamique de la saisie
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Sauvegarde dans la base de données
  // The e-mail and the phone number are how the account is recovered: they change through the
  // confirmation routes of the server, not from this form, so they are not sent.
  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMsg(null);
    setSaveError(null);
    try {
      const response = await api.patch('/users/profile', {
        name: formData.name,
        address: formData.address,
      });

      // The header and the menu follow the new name at once.
      const saved = toStaffUser(response.data);

      if (saved) update(saved);

      setSuccessMsg("Informations enregistrées avec succès !");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde", error);
      setSaveError(apiErrorMessage(error, "Erreur lors de la sauvegarde."));
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ FONCTION POUR LE DÉFILEMENT FLUIDE (Smooth Scroll)
  const scrollToSection = (sectionId: string) => {
    setActiveTab(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-10 w-10 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10 relative">
      
      {/* NOTIFICATION DE SUCCÈS */}
      {successMsg && (
        <div className="absolute -top-4 right-0 bg-green-50 text-green-700 px-4 py-3 rounded-lg border border-green-200 flex items-center gap-2 shadow-lg animate-in slide-in-from-top-2 z-50">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-bold text-sm">{successMsg}</span>
        </div>
      )}

      {/* --- EN-TÊTE --- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-950 tracking-tight">
            Paramètres
          </h1>
          <p className="text-stone-500 mt-1">
            Gérez vos informations et la sécurité de votre compte.
          </p>
        </div>
        
        {/* Bouton de Sauvegarde Global */}
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="shadow-lg bg-[#D4AF37] hover:bg-[#B69121] text-white font-bold"
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

      {saveError && (
        <div className="flex items-start gap-2 whitespace-pre-line rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- COLONNE GAUCHE : MENU RAPIDE --- */}
        <div className="lg:col-span-1">
          {/* ✅ Rendu 'sticky' pour suivre le scroll */}
          <div className="sticky top-24 space-y-6">
            {/* Carte Profil Résumé : le compte connecté, tel que le serveur le décrit */}
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm text-center">
                <div className="mx-auto h-24 w-24 rounded-full bg-stone-100 flex items-center justify-center border-4 border-stone-50 shadow-inner mb-4">
                  <span className="text-3xl font-bold text-stone-400">
                    {initialOf({ name: formData.name, email: formData.email || user?.email || "" })}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-blue-950">{displayName({ name: formData.name, email: formData.email || user?.email || "" })}</h3>
                <p className="text-sm text-stone-500">{staffRoleLabel(role)}</p>
            </div>

            {/* ✅ Menu de navigation interactif */}
            <nav className="flex flex-col space-y-1">
              <MenuLink 
                icon={User} 
                label="Mon profil" 
                active={activeTab === "profile"} 
                onClick={() => scrollToSection("profile")}
              />
              <MenuLink 
                icon={Lock} 
                label="Sécurité" 
                active={activeTab === "security"} 
                onClick={() => scrollToSection("security")}
              />
            </nav>
          </div>
        </div>

        {/* --- COLONNE DROITE : FORMULAIRES --- */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 1. MON PROFIL ✅ id="profile" et scroll-mt-24 */}
          <div id="profile" className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden scroll-mt-24">
            <div className="bg-stone-50/50 px-6 py-4 border-b border-stone-100 flex items-center gap-3">
              <User className="h-5 w-5 text-[#B69121]" />
              <h3 className="font-bold text-blue-950">Mes informations</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup 
                  label="Nom" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Votre nom" 
                />
              </div>
              <InputGroup 
                label="Adresse" 
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="15 Avenue de la Liberté, Tunis" 
                icon={MapPin} 
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup 
                  label="Email" 
                  name="email"
                  value={formData.email}
                  readOnly
                  icon={Mail} 
                />
                <InputGroup 
                  label="Téléphone" 
                  name="phone"
                  value={formData.phone}
                  readOnly
                  placeholder="Non renseigné" 
                  icon={Phone} 
                />
              </div>
              <p className="text-xs text-stone-400">
                L'email et le téléphone servent à retrouver votre compte : ils ne se modifient pas ici.
              </p>
              {companyPage && (
                <p className="text-xs text-stone-500">
                  Le nom, l'adresse et les numéros fiscaux de l'entreprise, ceux que les factures impriment, se règlent dans{" "}
                  <Link href="/dashboard/company" className="font-medium text-blue-900 underline underline-offset-2">
                    Entreprise
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>

          {/* 2. SECURITÉ ✅ id="security" et scroll-mt-24 */}
          <div id="security" className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden scroll-mt-24">
             <div className="bg-stone-50/50 px-6 py-4 border-b border-stone-100 flex items-center gap-3">
              <Lock className="h-5 w-5 text-[#B69121]" />
              <h3 className="font-bold text-blue-950">Sécurité</h3>
            </div>
            
            <ChangePasswordForm passwordChangedAt={passwordChangedAt} />
          </div>

        </div>
      </div>
    </div>
  );
}

// --- COMPOSANTS LOCAUX ---

// ✅ AJOUT DU SUPPORT POUR LE CLICK SUR LE MENU
function MenuLink({ 
  icon: Icon, 
  label, 
  active = false, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active?: boolean,
  onClick?: () => void 
}) {
  return (
    <button 
      onClick={onClick}
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all text-left w-full",
        active 
          ? "bg-blue-950 text-white shadow-md shadow-blue-900/20 border-l-4 border-[#D4AF37]" 
          : "text-stone-600 hover:bg-stone-100 hover:text-blue-950"
      )}
    >
      <Icon className={clsx("h-4 w-4", active ? "text-[#D4AF37]" : "text-stone-400")} />
      {label}
    </button>
  );
}

function InputGroup({ 
  label, 
  name,
  value,
  onChange,
  placeholder, 
  readOnly = false,
  icon: Icon 
}: { 
  label: string;
  name: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  readOnly?: boolean;
  icon?: any;
}) {
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
          name={name}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          className={clsx(
            "w-full border border-stone-200 text-stone-800 rounded-lg py-2.5 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all placeholder:text-stone-300 text-sm",
            readOnly ? "bg-stone-50 text-stone-500" : "bg-white",
            Icon ? "pl-9 pr-3" : "px-3"
          )}
        />
      </div>
    </div>
  );
}

/**
 * Changing the password (P1-12). The server cancels every session of the account when it is changed,
 * this one included: the person signs in again with the new password.
 */
function ChangePasswordForm({ passwordChangedAt }: { passwordChangedAt: string | null }) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const found = passwordFormProblem(fields);

    if (found) {
      setProblem(found);
      return;
    }

    setBusy(true);
    setProblem(null);

    try {
      await api.post("/auth/change-password", { currentPassword: fields.current, newPassword: fields.next });
      leaveAfterPasswordChange();
    } catch (error) {
      setProblem(apiErrorMessage(error, "Impossible de modifier le mot de passe."));
      setBusy(false);
    }
  };

  const set = (key: "current" | "next" | "confirm") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((previous) => ({ ...previous, [key]: e.target.value }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-blue-950">Mot de passe</p>
          <p className="text-sm text-stone-500">
            {passwordChangedAt ? `Dernière modification le ${frenchDate(passwordChangedAt, "—")}` : "Jamais modifié depuis la création du compte"}
          </p>
        </div>
        {!open && (
          <Button type="button" variant="outline" size="sm" className="font-bold" onClick={() => setOpen(true)}>Changer</Button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="space-y-3">
          <PasswordField label="Mot de passe actuel" value={fields.current} onChange={set("current")} autoComplete="current-password" />
          <PasswordField label="Nouveau mot de passe" value={fields.next} onChange={set("next")} autoComplete="new-password" />
          <PasswordField label="Confirmer le nouveau mot de passe" value={fields.confirm} onChange={set("confirm")} autoComplete="new-password" />
          <p className="text-xs text-stone-400">8 caractères au moins, avec une majuscule et un chiffre. Vous serez déconnecté de tous vos appareils.</p>

          {problem && (
            <div className="flex items-start gap-2 whitespace-pre-line rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {problem}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => { setOpen(false); setProblem(null); setFields({ current: "", next: "", confirm: "" }); }}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={busy} className="bg-[#D4AF37] hover:bg-[#B69121] text-white font-bold">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</> : "Modifier le mot de passe"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-stone-500 uppercase tracking-wide ml-1">{label}</label>
      <input
        type="password"
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="w-full bg-white border border-stone-200 text-stone-800 rounded-lg py-2.5 px-3 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all text-sm"
      />
    </div>
  );
}
