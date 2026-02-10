"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { 
  Search, 
  MapPin, 
  Star, 
  Phone, 
  MoreHorizontal,
  Plus,
  Wrench,
  Zap,
  Key,
  Users,
  Loader2,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Interface matching your User model from the API
interface Technician {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "ARTISAN";
  // These fields are mock for now until added to DB schema
  specialty?: string; 
  status?: string;
  location?: string;
  rating?: number;
  interventionCount?: number;
}

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        // ✅ Fetch real artisans from your NestJS backend
        const res = await api.get("/users/artisans");
        setTechnicians(res.data);
      } catch (err) {
        console.error("Failed to fetch technicians", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTechnicians();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-950 tracking-tight">
            Techniciens
          </h1>
          <p className="text-stone-500 mt-1">
            Gérez votre flotte d'experts ({technicians.length} actifs).
          </p>
        </div>
        
        <div className="flex gap-3">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
             <input 
               type="text" 
               placeholder="Rechercher..." 
               className="pl-9 pr-4 py-2.5 rounded-lg border border-stone-200 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all"
             />
           </div>
           
           <Link href="/dashboard/applications">
             <Button className="bg-[#D4AF37] hover:bg-[#B69121] text-white font-bold shadow-md shadow-[#D4AF37]/20 border-t border-[#F3DFA2]/30">
               <Plus className="mr-2 h-4 w-4" /> Ajouter
             </Button>
           </Link>
        </div>
      </div>

      {/* --- GRID --- */}
      {technicians.length === 0 ? (
        <div className="text-center py-20 bg-stone-50 rounded-xl border border-stone-200 border-dashed">
          <Users className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-stone-600">Aucun technicien trouvé</h3>
          <p className="text-stone-400 text-sm">Approuvez des candidatures pour ajouter des experts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technicians.map((tech) => (
            <div key={tech.id} className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm hover:shadow-lg hover:shadow-[#D4AF37]/10 hover:border-[#D4AF37]/30 transition-all group relative">
              
              <button className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-stone-100 flex items-center justify-center border-2 border-stone-100 group-hover:border-[#D4AF37] transition-colors overflow-hidden">
                   {/* Initials Avatar */}
                   <span className="text-xl font-bold text-stone-500 group-hover:text-[#B69121]">
                     {tech.name?.charAt(0) || "T"}
                   </span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-blue-950 truncate max-w-[150px]">{tech.name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-[#B69121] font-medium">
                    <Wrench className="h-3.5 w-3.5" />
                    {/* Fallback specialty until added to User model */}
                    {tech.specialty || "Technicien Polyvalent"}
                  </div>
                </div>
              </div>

              {/* Info Details */}
              <div className="space-y-3 mb-6">
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-stone-500 flex items-center gap-2">
                     <Phone className="h-4 w-4" /> Tél
                   </span>
                   <span className="font-medium text-blue-950">{tech.phone || "Non renseigné"}</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-stone-500 flex items-center gap-2">
                     <Mail className="h-4 w-4" /> Email
                   </span>
                   <span className="font-medium text-blue-950 truncate max-w-[150px]" title={tech.email}>{tech.email}</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-stone-500 flex items-center gap-2">
                     <MapPin className="h-4 w-4" /> Zone
                   </span>
                   <span className="font-medium text-blue-950">{tech.location || "Grand Tunis"}</span>
                 </div>
              </div>

              {/* Status Footer */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Disponible
                </span>
                
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