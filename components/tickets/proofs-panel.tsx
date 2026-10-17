"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Calendar, CheckCircle2, Loader2, MapPin, ShieldAlert, XCircle } from "lucide-react";
import { clsx } from "clsx";
import { apiErrorMessage } from "@/lib/api";
import {
  PROOF_KIND_LABEL,
  PROOF_STATUS_LABEL,
  fetchProofs,
  formatDateTime,
  formatDistance,
  retainedProof,
  reviewProof,
  type ProofKind,
  type ProofRecord,
  type ProofStatus,
} from "@/lib/proofs";
import { AuthenticatedImage } from "./authenticated-image";

const STATUS_STYLE: Record<ProofStatus, string> = {
  ACCEPTED: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  NEEDS_REVIEW: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  REJECTED: "bg-rose-500/15 text-rose-300 border-rose-400/30",
};

const KINDS: ProofKind[] = ["BEFORE", "AFTER"];

function mapsLink(latitude: number | string, longitude: number | string) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

function StatusBadge({ status }: { status: ProofStatus }) {
  const Icon = status === "ACCEPTED" ? CheckCircle2 : status === "NEEDS_REVIEW" ? AlertTriangle : XCircle;

  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold", STATUS_STYLE[status])}>
      <Icon className="h-3.5 w-3.5" />
      {PROOF_STATUS_LABEL[status]}
    </span>
  );
}

/** One attempt: the picture (when it was kept), what the server found, and the buttons of a person who must decide. */
function ProofCard({ proof, retained, onDecided }: { proof: ProofRecord; retained: boolean; onDecided: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"APPROVE" | "REJECT" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const decide = async (decision: "APPROVE" | "REJECT") => {
    setBusy(decision);
    setProblem(null);

    try {
      await reviewProof(proof.id, decision, note);
      onDecided();
    } catch (error) {
      setProblem(apiErrorMessage(error, "La décision n’a pas pu être enregistrée."));
      // Someone else may have decided first: show what is true now.
      onDecided();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={proof.status} />
          {retained && <span className="text-xs text-stone-400">Photo retenue sur l’intervention</span>}
        </div>
        <span className="text-xs text-stone-400">
          {proof.source === "STAFF" ? "Ajoutée par l’administration" : "Envoyée par l’artisan"}
        </span>
      </div>

      {proof.photoUrl ? (
        <div className="relative aspect-video overflow-hidden rounded-lg border-2 border-stone-700 bg-black/50">
          <AuthenticatedImage url={proof.photoUrl} alt={PROOF_KIND_LABEL[proof.kind]} />
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-white/15 p-3 text-center text-xs text-stone-400">
          Photo non conservée: le serveur a refusé cet envoi.
        </p>
      )}

      {proof.reasonLabels.length > 0 && (
        <ul
          className={clsx(
            "space-y-1 rounded-lg border p-3 text-sm",
            proof.status === "REJECTED" ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-amber-400/30 bg-amber-500/10 text-amber-200",
          )}
        >
          {proof.reasonLabels.map((label, index) => (
            <li key={`${proof.id}-${index}`} className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="flex items-center gap-1 text-xs uppercase tracking-wider text-stone-400">
            <Calendar className="h-3 w-3" /> Heure du serveur
          </dt>
          <dd className="font-mono text-emerald-300">{formatDateTime(proof.receivedAt)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs uppercase tracking-wider text-stone-400">
            <MapPin className="h-3 w-3" /> Position
          </dt>
          <dd className="font-mono text-blue-300">
            {proof.latitude !== null && proof.longitude !== null ? (
              <>
                {Number(proof.latitude).toFixed(5)}, {Number(proof.longitude).toFixed(5)}{" "}
                <a href={mapsLink(proof.latitude, proof.longitude)} target="_blank" rel="noreferrer" className="font-sans text-xs text-[#D4AF37] hover:underline">
                  Carte ↗
                </a>
              </>
            ) : (
              "Non transmise"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-stone-400">Écart avec le lieu</dt>
          <dd className="font-mono text-stone-200">{formatDistance(proof.distanceM)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-stone-400">Précision du GPS</dt>
          <dd className="font-mono text-stone-200">
            {proof.accuracyM !== null ? `± ${Math.round(proof.accuracyM)} m` : "Inconnue"}
            {proof.mocked === true && <span className="ml-2 font-sans text-xs font-bold text-rose-300">position simulée</span>}
          </dd>
        </div>
      </dl>

      {proof.reviewedAt && (
        <p className="text-xs text-stone-400">
          Vérifiée le {formatDateTime(proof.reviewedAt)}
          {proof.reviewNote ? ` — « ${proof.reviewNote} »` : ""}
        </p>
      )}

      {proof.status === "NEEDS_REVIEW" && (
        <div className="space-y-2 border-t border-white/10 pt-3">
          <label className="block text-xs uppercase tracking-wider text-stone-400" htmlFor={`proof-note-${proof.id}`}>
            Note (facultative)
          </label>
          <textarea
            id={`proof-note-${proof.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Ce que vous avez constaté…"
            className="w-full rounded-lg border border-white/20 bg-white/10 p-2 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
          />
          {problem && <p className="text-sm text-rose-300">{problem}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => decide("APPROVE")}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy === "APPROVE" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Valider la preuve
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => decide("REJECT")}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {busy === "REJECT" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Refuser la preuve
            </button>
          </div>
          <p className="text-xs text-stone-500">
            Refuser retire la photo de l’intervention tant qu’elle est ouverte, et l’artisan est prévenu.
          </p>
        </div>
      )}
    </div>
  );
}

/** A photo of the job that has no capture row: taken before the checks existed. */
function EarlierPhoto({ url, at, latitude, longitude, kind }: { url: string; at: string | null; latitude: number | null; longitude: number | null; kind: ProofKind }) {
  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-stone-400">Photo envoyée avant les contrôles automatiques: aucune vérification n’a été faite.</p>
      <div className="relative aspect-video overflow-hidden rounded-lg border-2 border-stone-700 bg-black/50">
        <AuthenticatedImage url={url} alt={PROOF_KIND_LABEL[kind]} />
      </div>
      <p className="font-mono text-sm text-emerald-300">{formatDateTime(at)}</p>
      {latitude !== null && longitude !== null && (
        <p className="font-mono text-sm text-blue-300">
          {latitude}, {longitude}{" "}
          <a href={mapsLink(latitude, longitude)} target="_blank" rel="noreferrer" className="font-sans text-xs text-[#D4AF37] hover:underline">
            Carte ↗
          </a>
        </p>
      )}
    </div>
  );
}

/**
 * The proofs of an intervention: the before and the after photo that are on the job, what the
 * server checked about each, the earlier attempts, and the decision of the back office on the
 * ones the server could not settle.
 */
export function ProofsPanel({ ticket, onTicketChanged }: { ticket: any; onTicketChanged?: () => void }) {
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    try {
      setProofs(await fetchProofs(ticket.id));
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    } finally {
      setLoaded(true);
    }
  }, [ticket.id]);

  useEffect(() => {
    load();
  }, [load, ticket.beforePhotoUrl, ticket.afterPhotoUrl]);

  const decided = () => {
    load();
    onTicketChanged?.();
  };

  const onJob: Record<ProofKind, string | null> = {
    BEFORE: ticket.beforePhotoUrl ?? null,
    AFTER: ticket.afterPhotoUrl ?? null,
  };

  if (!loaded) return null;
  if (!proofs.length && !onJob.BEFORE && !onJob.AFTER) return null;

  const waiting = proofs.filter((proof) => proof.status === "NEEDS_REVIEW").length;

  return (
    <div className="relative overflow-hidden rounded-xl border border-blue-900 bg-[#0f172a] p-6 text-white shadow-lg">
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[#D4AF37] opacity-10 blur-[80px]" />

      <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#F3DFA2]">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          Preuves de Travail Sécurisées
        </h2>
        {waiting > 0 && (
          <span className="rounded-full border border-amber-400/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
            {waiting} à vérifier
          </span>
        )}
      </div>

      {unavailable && (
        <p className="relative z-10 mb-4 text-sm text-stone-400">
          Le détail des contrôles n’a pas pu être chargé: seules les photos de l’intervention sont affichées.
        </p>
      )}

      <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {KINDS.map((kind) => {
          const url = onJob[kind];
          const retained = retainedProof(proofs, kind, url);
          const others = proofs.filter((proof) => proof.kind === kind && proof !== retained).sort((a, b) => b.id - a.id);
          const at = kind === "BEFORE" ? ticket.beforePhotoAt : ticket.afterPhotoAt;
          const latitude = kind === "BEFORE" ? ticket.beforePhotoLat : ticket.afterPhotoLat;
          const longitude = kind === "BEFORE" ? ticket.beforePhotoLng : ticket.afterPhotoLng;

          return (
            <section key={kind} className="min-w-0 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-stone-300">{PROOF_KIND_LABEL[kind]}</h3>

              {retained ? (
                <ProofCard proof={retained} retained onDecided={decided} />
              ) : url ? (
                <EarlierPhoto url={url} at={at ?? null} latitude={latitude ?? null} longitude={longitude ?? null} kind={kind} />
              ) : (
                <p className="rounded-lg border border-dashed border-white/15 p-4 text-center text-sm text-stone-400">Aucune photo pour le moment.</p>
              )}

              {others.length > 0 && (
                <details className="rounded-lg border border-white/10 bg-white/5">
                  <summary className="cursor-pointer select-none p-3 text-sm text-stone-300">
                    Autres envois ({others.length})
                    {others.some((proof) => proof.status === "NEEDS_REVIEW") && <span className="ml-2 text-amber-300">dont à vérifier</span>}
                  </summary>
                  <div className="space-y-3 p-3 pt-0">
                    {others.map((proof) => (
                      <ProofCard key={proof.id} proof={proof} retained={false} onDecided={decided} />
                    ))}
                  </div>
                </details>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
