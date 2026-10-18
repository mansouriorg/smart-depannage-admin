"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { apiErrorMessage, callApi, statusLabel, type CanonicalStatus } from "@/lib/shared";
import { clientName, statusMovesFor, statusRequest, type QueueJob, type StatusMove } from "@/lib/dispatch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { cn } from "@/lib/utils";

interface StatusDialogProps {
  /** The job whose status is changed, as the list shows it now; null keeps the dialog closed. */
  job: QueueJob | null;
  onClose: () => void;
  /** The server accepted the change. */
  onChanged: (job: QueueJob, move: StatusMove) => void;
  /** The server refused (the job moved meanwhile, say): the list is loaded again so that it tells the truth. */
  onRefused?: () => void;
  /** The job is no longer in the list on screen: what the dialog shows of it may be out of date. */
  stale?: boolean;
}

const MIN_REASON = 3;

/**
 * Changing the status of a job (P1-13). Only the moves the status table allows are listed (the server
 * checks again and says why when it refuses); choosing one only selects it, and nothing is sent until
 * the confirm button is pressed. Cancelling needs a reason, which the customer and the technician read.
 *
 * The menu follows the job as the list shows it: if somebody else moves the job while the dialog is
 * open, the choices are drawn again and the selection is dropped. The change names the status the
 * person saw, so that the server refuses it (409) instead of overwriting a move made in the meantime.
 */
export function StatusDialog({ job, onClose, onChanged, onRefused, stale = false }: StatusDialogProps) {
  const [choiceValue, setChoiceValue] = useState<CanonicalStatus | null>(null);
  // Two boxes: the internal note (kept inside the team) and the reason of a cancellation (read by the customer
  // and the technician). What was typed in one must never become the other by switching the choice.
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobId = job?.id ?? null;
  const jobStatus = job?.status ?? null;
  const statusSeen = useRef<string | null>(null);

  useEffect(() => {
    setChoiceValue(null);
    setNote("");
    setReason("");
    setSaving(false);
    setError(null);
    statusSeen.current = null;
  }, [jobId]);

  // The job moved while the dialog was open.
  useEffect(() => {
    if (statusSeen.current !== null && jobStatus !== null && jobStatus !== statusSeen.current) {
      setChoiceValue(null);
      setError("Le statut de cette demande vient de changer : les choix ont été mis à jour, choisissez à nouveau.");
    }

    statusSeen.current = jobStatus;
  }, [jobStatus]);

  const moves = job ? statusMovesFor(job) : [];
  const choice = moves.find((move) => move.value === choiceValue) ?? null;
  const text = choice?.needsReason ? reason : note;
  const reasonMissing = choice?.needsReason === true && reason.trim().length < MIN_REASON;

  const confirm = async () => {
    if (!job || !choice || saving || reasonMissing) return;

    setSaving(true);
    setError(null);

    try {
      await callApi((config) => api.request(config), statusRequest(job, choice, { note, reason }));

      onChanged(job, choice);
    } catch (failure) {
      setError(apiErrorMessage(failure, "Le changement de statut a échoué."));
      onRefused?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={job !== null} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-stone-800 sm:max-w-[480px]">
        {job && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 pr-6 text-blue-950">
                <RefreshCw className="h-5 w-5 text-[#D4AF37]" />
                Changer le statut · demande n° {job.id}
              </DialogTitle>
            </DialogHeader>

            {stale && (
              <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                Cette demande n&apos;est plus dans la liste affichée (elle a changé de file ou de page) : son état a peut-être changé. Le serveur refusera le changement s&apos;il n&apos;est plus possible.
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-600">
              <span>{clientName(job)}</span>
              <span>·</span>
              <TicketStatusBadge status={job.status} />
              {choice && (
                <>
                  <ArrowRight className="h-4 w-4 text-stone-400" />
                  <span className="font-semibold text-blue-950">{statusLabel(choice.value)}</span>
                </>
              )}
            </div>

            {moves.length === 0 ? (
              <p className="mt-4 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">Aucun changement de statut n&apos;est possible depuis cet état.</p>
            ) : (
              <ChoiceGroup label="Nouveau statut" className="mt-4 space-y-2">
                {moves.map((move) => {
                  const selected = choice?.value === move.value;

                  return (
                    <div key={move.value}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={saving}
                        onClick={() => {
                          setChoiceValue(move.value);
                          setError(null);
                        }}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                          selected ? "border-[#D4AF37] bg-[#D4AF37]/5 ring-2 ring-[#D4AF37]/30 text-blue-950" : "border-stone-200 bg-white text-stone-700 hover:border-[#D4AF37]/50",
                          move.needsReason && !selected && "text-red-700",
                        )}
                      >
                        {move.label}
                      </button>
                    </div>
                  );
                })}
              </ChoiceGroup>
            )}

            {choice && (
              <div className="mt-4 space-y-1.5">
                <label htmlFor="status-note" className="text-xs font-bold uppercase text-stone-500">
                  {choice.needsReason ? "Motif de l'annulation (obligatoire)" : "Note interne (facultative)"}
                </label>
                <textarea
                  id="status-note"
                  rows={3}
                  maxLength={500}
                  value={text}
                  onChange={(event) => (choice.needsReason ? setReason(event.target.value) : setNote(event.target.value))}
                  disabled={saving}
                  placeholder={choice.needsReason ? "Ex : le client a trouvé une solution" : "Visible par l'équipe seulement"}
                  className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                />
                {choice.needsReason && <p className="text-xs text-stone-500">Le client et le technicien verront que la demande est annulée, avec ce motif.</p>}
              </div>
            )}

            {error && (
              <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={!choice || saving || reasonMissing}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50",
                  choice?.needsReason ? "bg-red-600 hover:bg-red-700" : "bg-blue-950 hover:bg-blue-900",
                )}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {choice ? (choice.needsReason ? "Confirmer l'annulation" : `Confirmer : ${statusLabel(choice.value)}`) : "Choisissez un statut"}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
