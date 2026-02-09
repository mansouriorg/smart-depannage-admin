// src/app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import api from "@/lib/api"; // ✅ Import your API helper

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // ✅ State for inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(""); // Reset previous errors

    try {
      // 1. 🚀 Call NestJS Login Endpoint
      const res = await api.post("/auth/login", { email, password });

      // 2. 🛡️ Security Check: Ensure user is ADMIN
      if (res.data.user.role !== 'ADMIN') {
        setError("Accès refusé. Ce compte n'a pas les droits d'administration.");
        setIsLoading(false);
        return;
      }

      // 3. 💾 Save Token & Redirect
      localStorage.setItem("adminToken", res.data.accessToken);
      
      // Optional: Add a small delay for the user to see the success state
      router.push("/dashboard"); 
      
    } catch (err: any) {
      console.error("Login failed:", err);
      // Handle Errors
      if (err.response?.status === 401) {
        setError("Identifiants incorrects. Veuillez réessayer.");
      } else {
        setError("Impossible de se connecter au serveur. Vérifiez votre connexion.");
      }
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f111a] relative overflow-hidden font-sans selection:bg-[#D4AF37]/30">
      
      {/* --- FOND ANIMÉ --- */}
      {/* Glow Or (Haut Gauche) */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />
      {/* Glow Bleu (Bas Droite) */}
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Grille subtile */}
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
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Mot de passe</label>
              <a href="#" className="text-xs text-stone-500 hover:text-white transition-colors">Oublié ?</a>
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

            {/* 🔴 MESSAGE D'ERREUR */}
            {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
            </div>
            )}

          {/* Bouton de connexion (OR) */}
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#D4AF37] via-[#E5C04A] to-[#B69121] hover:brightness-110 text-white font-bold py-4 rounded-xl shadow-lg shadow-[#D4AF37]/20 border-t border-[#FFF5D1]/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Connexion...
              </>
            ) : (
              <>
                Se connecter <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

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