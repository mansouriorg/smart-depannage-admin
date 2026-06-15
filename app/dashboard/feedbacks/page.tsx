"use client";

import { useEffect, useState } from "react";
import { Star, AlertTriangle, Clock, CheckCircle2, MessageSquare, Loader2, Search } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// TypeScript interface based on your Prisma Schema
interface InterventionFeedback {
  id: number;
  serviceType: string;
  status: string;
  address: string;
  client: { name: string; phone: string };
  artisan: { name: string; phone: string } | null;
  rating: number | null;
  isOnTime: boolean | null;
  hasIssue: boolean;
  feedbackNotes: string | null;
  updatedAt: string;
}

export default function AdminFeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<InterventionFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchFeedbacks() {
      try {
        // Since the user is an Admin, this returns ALL interventions
        const response = await api.get('/interventions');
        
        // Filter out interventions that haven't been rated yet
        const completedWithFeedback = response.data.filter(
          (inv: InterventionFeedback) => inv.status === 'COMPLETED' && inv.rating !== null
        );
        
        setFeedbacks(completedWithFeedback);
      } catch (error) {
        console.error("Erreur lors de la récupération des avis:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeedbacks();
  }, []);

  // Filter functionality for the search bar
  const filteredFeedbacks = feedbacks.filter(f => 
    f.client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.artisan?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.serviceType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-950">Avis & Retours Clients</h1>
            <p className="text-stone-500 font-medium mt-1">
              Surveillez la qualité des interventions et gérez les signalements.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input 
              placeholder="Chercher un client ou technicien..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11 border-stone-200 focus-visible:ring-[#D4AF37] focus-visible:border-[#D4AF37] bg-white rounded-xl shadow-sm"
            />
          </div>
        </div>

        {/* Feedback Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredFeedbacks.length === 0 ? (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-stone-200 rounded-xl bg-white">
              <p className="text-stone-500 font-medium">Aucun avis trouvé.</p>
            </div>
          ) : (
            filteredFeedbacks.map((feedback) => (
              <Card 
                key={feedback.id} 
                className={cn(
                  "overflow-hidden border transition-shadow hover:shadow-md",
                  feedback.hasIssue ? "border-red-200 bg-red-50/30" : "border-stone-200 bg-white"
                )}
              >
                {/* Visual Indicator Top Bar */}
                <div className={cn(
                  "h-1.5 w-full",
                  feedback.hasIssue ? "bg-red-500" : "bg-gradient-to-r from-[#D4AF37] to-[#B69121]"
                )} />
                
                <CardHeader className="pb-4 border-b border-stone-100 bg-stone-50/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-950 uppercase tracking-wider text-xs bg-white px-2 py-1 rounded border border-stone-200 shadow-sm">
                          #{feedback.id} • {feedback.serviceType}
                        </span>
                        {feedback.hasIssue && (
                          <span className="flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded border border-red-200">
                            <AlertTriangle className="h-3 w-3" />
                            PROBLÈME SIGNALÉ
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg font-bold text-blue-950 mt-3">
                        Client: {feedback.client.name}
                      </CardTitle>
                      <CardDescription className="text-stone-500 text-sm mt-1">
                        Artisan: <span className="font-semibold text-stone-700">{feedback.artisan?.name || "Non assigné"}</span>
                      </CardDescription>
                    </div>

                    {/* Rating Display */}
                    <div className="flex flex-col items-end">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={cn(
                              "h-5 w-5 stroke-[1.5px]",
                              (feedback.rating || 0) >= star 
                                ? "fill-[#D4AF37] text-[#D4AF37]" 
                                : "fill-stone-100 text-stone-300"
                            )} 
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-stone-500 mt-1 uppercase tracking-wider">
                        {new Date(feedback.updatedAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-4">
                  {/* Punctuality Indicator */}
                  <div className="flex items-center gap-2">
                    {feedback.isOnTime ? (
                      <span className="flex items-center gap-2 text-sm font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                        <CheckCircle2 className="h-4 w-4" /> Technicien à l'heure
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-sm font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                        <Clock className="h-4 w-4" /> Technicien en retard
                      </span>
                    )}
                  </div>

                  {/* Feedback Notes */}
                  {feedback.feedbackNotes && (
                    <div className={cn(
                      "p-4 rounded-xl text-sm border",
                      feedback.hasIssue ? "bg-white border-red-100 text-red-900" : "bg-stone-50 border-stone-200 text-stone-700"
                    )}>
                      <div className="flex items-center gap-2 mb-2 font-bold opacity-80">
                        <MessageSquare className="h-4 w-4" />
                        Commentaire du client :
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {feedback.feedbackNotes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

      </div>
    </div>
  );
}