"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Loader2, MapPin, Phone, Star, UserCheck, Wrench } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import api from "@/lib/api";
import { apiErrorMessage, callApi, routes, serviceNameOf } from "@/lib/shared";
import {
  assignRequest,
  bestMatch,
  clientName,
  distanceLabel,
  etaLabel,
  isChoosable,
  scoreTone,
  whyNotChoosable,
  artisanName,
  type ArtisanMatch,
  type MatchResult,
  type QueueJob,
} from "@/lib/dispatch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { UrgencyBadge } from "@/components/tickets/urgency-badge";
import { cn } from "@/lib/utils";

interface AssignDialogProps {
  /** The job to give to somebody; null keeps the dialog closed. */
  job: QueueJob | null;
  onClose: () => void;
  /** The server accepted the assignment. */
  onAssigned: (job: QueueJob, artisan: ArtisanMatch) => void;
  /** The server refused (somebody else was given the job meanwhile, say): the list is loaded again so that it tells the truth. */
  onRefused?: () => void;
  /** The job is no longer in the list on screen: what the dialog shows of it may be out of date. */
  stale?: boolean;
}

const TONE: Record<"high" | "medium" | "low", string> = {
  high: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-stone-100 text-stone-600 border-stone-200",
};

/**
 * Giving a job to a technician (P1-13). The technicians who can take the job are listed best first, each
 * with its score and its time of arrival; the best one is selected, and nothing happens until the person
 * presses the confirm button. Choosing another technician in the list only moves the selection.
 *
 * The one who is assigned is the one that was shown and selected (not "whoever is best when the button
 * is pressed"): the server checks again that they are approved and free, and says why when they are not.
 */
export function AssignDialog({ job, onClose, onAssigned, onRefused, stale = false }: AssignDialogProps) {
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const request = useRef(0);

  const jobId = job?.id ?? null;
  // The technician who already has the job (when it is given to another one) is never proposed again.
  const holder = job?.artisanId ?? null;
  const holderRef = useRef<number | null>(null);

  useEffect(() => {
    holderRef.current = holder;
  }, [holder]);

  /**
   * `reselect` false (after a refusal): keep the person's choice if it is still possible, otherwise
   * leave the choice empty instead of silently moving the selection to somebody else.
   */
  const load = useCallback(async (id: number, all: boolean, reselect = true) => {
    const mine = ++request.current;

    setLoading(true);
    setLoadError(null);

    try {
      const answer = await callApi(
        (config) => api.request(config),
        routes.matching.forIntervention<MatchResult>(id, { onlyAvailable: !all, limit: all ? 10 : 5 }),
      );

      // A slower answer for another job, or for the other list, must not replace this one.
      if (mine !== request.current) return;

      const matches = Array.isArray(answer?.matches) ? answer.matches : [];

      setResult({ ...answer, matches });
      setSelected((current) => {
        // Keep the choice the person made when the list is loaded again, if that technician is still in it.
        const kept = matches.find((match) => match.artisanId === current && isChoosable(match, holderRef.current));

        if (kept) return kept.artisanId;

        return reselect ? (bestMatch(matches, holderRef.current)?.artisanId ?? null) : null;
      });
    } catch (error) {
      if (mine !== request.current) return;

      setResult(null);
      setSelected(null);
      setLoadError(apiErrorMessage(error, "Impossible de charger les techniciens."));
    } finally {
      if (mine === request.current) setLoading(false);
    }
  }, []);

  // A new job (or the dialog closing) starts from nothing.
  useEffect(() => {
    request.current += 1;
    setResult(null);
    setSelected(null);
    setShowAll(false);
    setAssignError(null);
    setLoadError(null);
    setAssigning(false);

    if (jobId !== null) void load(jobId, false);
  }, [jobId, load]);

  const toggleAll = () => {
    if (jobId === null) return;

    const next = !showAll;

    setShowAll(next);
    setAssignError(null);
    void load(jobId, next);
  };

  const chosen = result?.matches.find((match) => match.artisanId === selected) ?? null;

  const confirm = async () => {
    if (!job || !chosen || assigning) return;

    setAssigning(true);
    setAssignError(null);

    try {
      // Who the screen shows as holding the job travels with the choice: if somebody else was given the job
      // since (another dispatcher, a minute ago), the server refuses it instead of overwriting their choice.
      await callApi((config) => api.request(config), assignRequest(job, chosen.artisanId));

      onAssigned(job, chosen);
    } catch (error) {
      setAssignError(apiErrorMessage(error, "L'assignation a échoué."));
      // The technician may have been booked, or the job taken, a moment ago: show the list as it is now.
      void load(job.id, showAll, false);
      onRefused?.();
    } finally {
      setAssigning(false);
    }
  };

  const slot = result?.requestedSlot;
  const reassigning = Boolean(job?.artisanId);

  return (
    <Dialog open={job !== null} onOpenChange={(open) => !open && !assigning && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-stone-800 sm:max-w-[640px]">
        {job && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 pr-6 text-blue-950">
                <UserCheck className="h-5 w-5 text-[#D4AF37]" />
                {reassigning ? "Réassigner" : "Assigner un technicien"} · demande n° {job.id}
              </DialogTitle>
            </DialogHeader>

            {stale && (
              <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                Cette demande n&apos;est plus dans la liste affichée (elle a changé de file ou de page) : son état a peut-être changé. Le serveur refusera l&apos;assignation si elle n&apos;est plus possible.
              </p>
            )}

            <div className="mt-3 space-y-1 rounded-lg border border-stone-100 bg-stone-50 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 font-semibold text-blue-950">
                  <Wrench className="h-3.5 w-3.5 text-[#D4AF37]" />
                  {serviceNameOf(job.serviceType)}
                </span>
                <UrgencyBadge urgency={job.urgency} />
                <span className="text-stone-500">· {clientName(job)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-600">
                <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
                <span>{job.address}</span>
              </div>
              {slot && (
                <div className="flex items-center gap-1.5 text-stone-600">
                  <Clock className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span>
                    Créneau souhaité : {format(new Date(slot.startsAt), "EEE d MMM HH:mm", { locale: fr })} – {format(new Date(slot.endsAt), "HH:mm", { locale: fr })}
                  </span>
                </div>
              )}
              {slot && <p className="pl-5 text-xs text-stone-500">Assigner ne réserve pas ce créneau dans l&apos;agenda du technicien.</p>}
              {reassigning && (
                <p className="pt-1 text-xs font-medium text-amber-700">Actuellement chez {artisanName(job)} : il sera remplacé.</p>
              )}
            </div>

            <div className="mt-4" aria-busy={loading}>
              {loading && !result && (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-stone-500">
                  <Loader2 className="h-5 w-5 animate-spin text-[#D4AF37]" /> Recherche des techniciens…
                </div>
              )}

              {loadError && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="flex-1">{loadError}</span>
                  <button type="button" onClick={() => void load(job.id, showAll)} disabled={loading} className="shrink-0 font-semibold underline disabled:opacity-50">
                    Réessayer
                  </button>
                </div>
              )}

              {result && result.matches.length === 0 && !loadError && (
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                  {showAll
                    ? "Aucun technicien ne correspond à ce métier."
                    : "Aucun technicien disponible pour cette demande. Vous pouvez afficher aussi les techniciens indisponibles pour voir pourquoi."}
                </div>
              )}

              {result && result.matches.length > 0 && (
                <ChoiceGroup label="Techniciens proposés" className={cn("space-y-2", loading && "opacity-60")}>
                  {result.matches.map((match) => {
                    const choosable = isChoosable(match, holder);
                    const isSelected = match.artisanId === selected;
                    const best = choosable && bestMatch(result.matches, holder)?.artisanId === match.artisanId;
                    const distance = distanceLabel(match.distanceKm);

                    return (
                      <div key={match.artisanId}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          disabled={!choosable || assigning}
                          onClick={() => {
                            setSelected(match.artisanId);
                            setAssignError(null);
                          }}
                          className={cn(
                            "block w-full rounded-xl border p-3 text-left transition-colors",
                            isSelected ? "border-[#D4AF37] bg-[#D4AF37]/5 ring-2 ring-[#D4AF37]/30" : "border-stone-200 bg-white hover:border-[#D4AF37]/50",
                            !choosable && "cursor-not-allowed bg-stone-50 opacity-70 hover:border-stone-200",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate font-bold text-blue-950">{match.name?.trim() || `Technicien n° ${match.artisanId}`}</span>
                                {best && (
                                  <span className="rounded-full bg-[#D4AF37] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Meilleur choix</span>
                                )}
                                {isSelected && <CheckCircle2 className="h-4 w-4 text-[#B69121]" />}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {etaLabel(match.estimatedArrivalMinutes)}
                                </span>
                                {distance && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {distance}
                                  </span>
                                )}
                                {typeof match.rating === "number" && match.rating > 0 && (
                                  <span className="inline-flex items-center gap-1">
                                    <Star className="h-3 w-3" /> {match.rating.toFixed(1)}
                                  </span>
                                )}
                                {typeof match.activeJobsCount === "number" && (
                                  <span>
                                    {match.activeJobsCount} mission{match.activeJobsCount > 1 ? "s" : ""} en cours
                                    {match.maxActiveJobs ? ` sur ${match.maxActiveJobs}` : ""}
                                  </span>
                                )}
                                {match.phone && (
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {match.phone}
                                  </span>
                                )}
                              </div>
                            </div>

                            <span
                              className={cn("shrink-0 rounded-lg border px-2.5 py-1 text-center text-sm font-bold", TONE[scoreTone(match.score)])}
                              title="Score de correspondance (sur 100)"
                            >
                              {Math.round(match.score)}
                              <span className="text-[10px] font-medium">/100</span>
                            </span>
                          </div>

                          {!choosable && <span className="mt-2 block text-xs font-medium text-red-600">{whyNotChoosable(match, holder)}</span>}

                          {choosable && match.reasons && match.reasons.length > 0 && (
                            <span className="mt-2 flex flex-wrap gap-1.5">
                              {match.reasons.slice(0, 3).map((reason) => (
                                <span key={reason} className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                                  {reason}
                                </span>
                              ))}
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </ChoiceGroup>
              )}

              {result && (
                <button
                  type="button"
                  onClick={toggleAll}
                  disabled={loading || assigning}
                  className="mt-3 text-xs font-semibold text-[#B69121] hover:underline disabled:opacity-50"
                >
                  {showAll ? "Afficher seulement les techniciens disponibles" : "Afficher aussi les techniciens indisponibles"}
                </button>
              )}
            </div>

            {assignError && (
              <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {assignError}
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={assigning}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={!chosen || assigning || loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B69121] px-5 py-2 text-sm font-bold text-white shadow-md hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                {chosen ? `Confirmer : ${chosen.name?.trim() || `technicien n° ${chosen.artisanId}`}` : "Choisissez un technicien"}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
