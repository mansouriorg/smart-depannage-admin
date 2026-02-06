// src/app/dashboard/technicians/page.tsx
import { 
  Search, 
  MapPin, 
  Star, 
  Phone, 
  MoreHorizontal,
  Plus,
  Wrench,
  Zap,
  Key
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Fausses données pour les techniciens
const TECHNICIANS = [
  {
    id: 1,
    name: "Sami Ben Ali",
    role: "Plombier",
    status: "DISPONIBLE",
    rating: 4.8,
    interventions: 142,
    phone: "20 111 222",
    location: "La Marsa",
  },
  {
    id: 2,
    name: "Ahmed Tounsi",
    role: "Électricien",
    status: "EN_INTERVENTION",
    rating: 4.9,
    interventions: 89,
    phone: "55 666 777",
    location: "Centre Ville",
  },
  {
    id: 3,
    name: "Mounir K.",
    role: "Serrurier",
    status: "INDISPONIBLE",
    rating: 4.5,
    interventions: 56,
    phone: "98 123 123",
    location: "Ariana",
  },
];

export default function TechniciansPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* --- EN-TÊTE --- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-950 tracking-tight">
            Techniciens
          </h1>
          <p className="text-stone-500 mt-1">
            Gérez votre flotte d'experts et suivez leur disponibilité.
          </p>
        </div>
        
        <div className="flex gap-3">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
             <input 
               type="text" 
               placeholder="Rechercher un expert..." 
               className="pl-9 pr-4 py-2.5 rounded-lg border border-stone-200 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all"
             />
           </div>
           {/* Bouton Or */}
           <Button variant="gold" className="font-bold">
             <Plus className="mr-2 h-4 w-4" /> Ajouter
           </Button>
        </div>
      </div>

      {/* --- GRILLE DES TECHNICIENS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TECHNICIANS.map((tech) => (
          <div key={tech.id} className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm hover:shadow-lg hover:shadow-[#D4AF37]/10 hover:border-[#D4AF37]/30 transition-all group relative">
            
            {/* Options (3 points) */}
            <button className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
              <MoreHorizontal className="h-5 w-5" />
            </button>

            {/* Header Carte */}
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-stone-100 flex items-center justify-center border-2 border-stone-100 group-hover:border-[#D4AF37]">
                <span className="text-xl font-bold text-stone-500 group-hover:text-[#B69121]">{tech.name.charAt(0)}</span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-blue-950">{tech.name}</h3>
                <div className="flex items-center gap-1.5 text-sm text-[#B69121] font-medium">
                  {tech.role === "Plombier" && <Wrench className="h-3.5 w-3.5" />}
                  {tech.role === "Électricien" && <Zap className="h-3.5 w-3.5" />}
                  {tech.role === "Serrurier" && <Key className="h-3.5 w-3.5" />}
                  {tech.role}
                </div>
              </div>
            </div>

            {/* Infos Clés */}
            <div className="space-y-3 mb-6">
               <div className="flex items-center justify-between text-sm">
                 <span className="text-stone-500 flex items-center gap-2">
                   <Phone className="h-4 w-4" /> Téléphone
                 </span>
                 <span className="font-medium text-blue-950">{tech.phone}</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <span className="text-stone-500 flex items-center gap-2">
                   <MapPin className="h-4 w-4" /> Zone
                 </span>
                 <span className="font-medium text-blue-950">{tech.location}</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <span className="text-stone-500 flex items-center gap-2">
                   <Star className="h-4 w-4" /> Note
                 </span>
                 <span className="font-bold text-[#B69121] flex items-center gap-1">
                   {tech.rating} <span className="text-stone-300 font-normal">/ 5</span>
                 </span>
               </div>
            </div>

            {/* Footer Carte (Statut) */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                tech.status === 'DISPONIBLE' 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : tech.status === 'EN_INTERVENTION'
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-stone-100 text-stone-500 border-stone-200"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${
                   tech.status === 'DISPONIBLE' ? "bg-emerald-500" : tech.status === 'EN_INTERVENTION' ? "bg-amber-500" : "bg-stone-400"
                }`} />
                {tech.status === 'DISPONIBLE' ? 'Disponible' : tech.status === 'EN_INTERVENTION' ? 'En intervention' : 'Indisponible'}
              </span>
              
              <div className="text-xs text-stone-400">
                {tech.interventions} missions
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}