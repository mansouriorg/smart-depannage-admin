// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Lock, Mail, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { cancelLogin } from "@/lib/auth";
import { landingPath } from "@/lib/route-guard";
import { clearSession, saveSession, sessionWasKept, toStaffUser } from "@/lib/session";
import { staffRoleOf } from "@/lib/shared";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  // "Oublié ?": the same form asks for the e-mail address only and sends the link of the reset page (the website's /reset-password).
  const [forgotten, setForgotten] = useState(false);
  const [info, setInfo] = useState("");

  // Why the person is here, and where they were going: the address says (see proxy.ts and lib/api.ts).
  const [expired, setExpired] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [next, setNext] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);

    setNext(query.get("next"));

    // The session ended: whatever the browser still holds of it is of no use, and a leftover must not bounce the person back.
    if (query.get("reason") === "expired") {
      setExpired(true);
      clearSession();
    }

    // The password was changed from the settings: every session ended, this one too.
    if (query.get("reason") === "password") {
      setPasswordChanged(true);
      clearSession();
    }
  }, []);
  
  // No pre-filled credentials: a default password in the screen is a default
  // password in production.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function sendResetLink() {
    try {
      const res = await api.post("/auth/forgot-password", { email });

      setInfo(res.data?.message || "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.");
    } catch (err: any) {
      setError(
        err.response?.status === 429
          ? "Trop de tentatives. Réessayez dans quelques minutes."
          : err.response?.status === 400
            ? "Saisissez une adresse e-mail valide."
            : "Impossible de contacter le serveur. Vérifiez votre connexion.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(""); 
    setInfo("");

    if (forgotten) {
      await sendResetLink();
      return;
    }

    try {
      // 1. 🚀 Call NestJS Login Endpoint
      const res = await api.post("/auth/login", { email, password });

      // 2. 🛡️ Security Check: the back-office roles (admin, super admin, support, dispatcher, accountant).
      // A customer or an artisan has no business here: the session the server just opened for them is cancelled.
      const user = toStaffUser(res.data?.user);

      if (!user || !staffRoleOf(user.role)) {
        void cancelLogin(res.data?.refreshToken);
        setError("Accès refusé. Ce compte n'a pas accès à l'espace de supervision.");
        setIsLoading(false);
        return;
      }

      // 3. 💾 Keep the session (both tokens, the account, the marker for the route guard) and go to the
      // page where the person was headed, or the first page of their menu. A full load, so that
      // the guard sees the cookie that has just been written.
      const role = saveSession({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken, user });

      // A browser that refuses storage or cookies would send the person to the dashboard and straight
      // back here with no word: say it instead.
      if (!sessionWasKept()) {
        clearSession();
        void cancelLogin(res.data?.refreshToken);
        setError("Votre navigateur refuse de garder la session (stockage ou cookies bloqués). Autorisez-les pour ce site, puis réessayez.");
        setIsLoading(false);
        return;
      }

      window.location.assign(landingPath(role, next));
      
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.response?.status === 401) {
        setError("Identifiants incorrects. Veuillez réessayer.");
      } else if (err.response?.status === 429) {
        setError("Trop de tentatives. Réessayez dans quelques minutes.");
      } else {
        setError("Impossible de se connecter au serveur. Vérifiez votre connexion.");
      }
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f111a] relative overflow-hidden font-sans selection:bg-[#D4AF37]/30">
      
      {/* --- FOND ANIMÉ --- */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      {/* --- CARTE DE CONNEXION --- */}
      <div className="w-full max-w-md p-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* En-tête Carte */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-[#D4AF37] to-[#B69121] rounded-2xl shadow-2xl shadow-[#D4AF37]/20 mb-6 ring-4 ring-[#D4AF37]/10">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Smart Depannage
          </h1>
          <p className="text-stone-400 mt-2 text-sm">
            Accédez à votre espace de supervision sécurisé.
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleLogin} className="space-y-6 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
          
          {/* Email */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider ml-1">Email professionnel</label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-[#D4AF37] transition-colors">
                <Mail className="h-5 w-5" />
              </div>
              <input 
                type="email" 
                placeholder="admin@smart-depannage.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0a0c12] border border-stone-800 text-stone-200 rounded-xl px-10 py-3.5 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all placeholder:text-stone-600"
                required
              />
            </div>
          </div>

          {/* Mot de passe */}
          {!forgotten && (
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Mot de passe</label>
              <button
                type="button"
                onClick={() => { setForgotten(true); setError(""); setInfo(""); }}
                className="text-xs text-stone-500 hover:text-white transition-colors"
              >
                Oublié ?
              </button>
            </div>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-[#D4AF37] transition-colors">
                <Lock className="h-5 w-5" />
              </div>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0a0c12] border border-stone-800 text-stone-200 rounded-xl px-10 py-3.5 outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all placeholder:text-stone-600"
                required
              />
            </div>
          </div>
          )}

            {/* La session a pris fin (jeton refusé, compte désactivé) */}
            {expired && !error && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-3 text-amber-300 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>Votre session a expiré. Reconnectez-vous pour continuer.</span>
            </div>
            )}

            {/* Mot de passe modifié depuis les paramètres */}
            {passwordChanged && !info && !error && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-3 text-green-400 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>Mot de passe modifié. Reconnectez-vous avec le nouveau.</span>
            </div>
            )}

            {/* Lien de réinitialisation envoyé */}
            {info && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-3 text-green-400 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{info}</span>
            </div>
            )}

            {/* 🔴 MESSAGE D'ERREUR */}
            {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
            </div>
            )}

          {/* Bouton de connexion */}
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#D4AF37] via-[#E5C04A] to-[#B69121] hover:brightness-110 text-white font-bold py-4 rounded-xl shadow-lg shadow-[#D4AF37]/20 border-t border-[#FFF5D1]/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> {forgotten ? "Envoi..." : "Connexion..."}
              </>
            ) : (
              <>
                {forgotten ? "Envoyer le lien" : "Se connecter"} <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          {forgotten && (
            <button
              type="button"
              onClick={() => { setForgotten(false); setError(""); setInfo(""); }}
              className="w-full text-sm text-stone-400 hover:text-white transition-colors"
            >
              Retour à la connexion
            </button>
          )}

        </form>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-stone-600">
            © 2026 Smart-Dépannage Enterprise. <br/>
            Accès restreint au personnel autorisé.
          </p>
        </div>

      </div>
    </div>
  );
}
