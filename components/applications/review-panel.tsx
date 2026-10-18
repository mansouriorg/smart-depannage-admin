"use client";

import { useState } from "react";
import { AlertTriangle, Briefcase, CheckCircle2, FileText, Loader2, Mail, MapPin, Phone, ShieldAlert, X, XCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { DocumentViewer } from "@/components/applications/document-viewer";
import { useStaff } from "@/components/auth/staff-provider";
import {
  type Applicant,
  type ApprovalResult,
  DOCUMENT_LABEL,
  DOCUMENT_STATUS_LABEL,
  MIN_REASON_LENGTH,
  acceptDocument,
  approveApplicant,
  hasValidIdentity,
  identityProblem,
  refuseDocument,
  rejectApplicant,
  tradesOf,
} from "@/lib/applications";

interface ReviewPanelProps {
  applicant: Applicant;
  onClose: () => void;
  /** The applicant was approved or refused: the queue drops the row. */
  onDecided: (decision: "approved" | "rejected", profileId: number, result: ApprovalResult) => void;
  /** A document was accepted or refused: the queue keeps the new state. */
  onChanged: (applicant: Applicant) => void;
}

type Mode = "review" | "approve" | "reject";

const REASON_MAX = 500;
const NOTE_MAX = 1000;

const STATUS_CLASS = {
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
} as const;

/**
 * Looks at one applicant (P1-11): who they are, what they chose (trades, zones), their documents
 * in a viewer, and the decision. Approving sends the invitation; refusing needs a written reason,
 * which the applicant is told. An applicant with no valid identity document can only be approved
 * with the written exception, like the server asks.
 */
export function ReviewPanel({ applicant, onClose, onDecided, onChanged }: ReviewPanelProps) {
  // Support checks the papers; accepting or refusing the application is for the administrators (P1-12: the API refuses the others).
  const { can } = useStaff();
  const canDecide = can("decideApplication");
  const [mode, setMode] = useState<Mode>("review");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [waive, setWaive] = useState(false);
  const [reason, setReason] = useState("");

  const [selectedId, setSelectedId] = useState<number | null>(applicant.documents[0]?.id ?? null);
  const [docNote, setDocNote] = useState("");
  const [docBusy, setDocBusy] = useState(false);

  const identityOk = hasValidIdentity(applicant);
  const trades = tradesOf(applicant);
  const selected = applicant.documents.find((doc) => doc.id === selectedId) ?? null;

  // The note typed for one document is not the reason for another one.
  const selectDocument = (docId: number) => {
    setSelectedId(docId);
    setDocNote("");
    setError(null);
  };

  const goTo = (next: Mode) => {
    setError(null);
    setMode(next);
  };

  const approve = async () => {
    setBusy(true);
    setError(null);

    try {
      const result = await approveApplicant(applicant.id, { note, waiveIdentityCheck: !identityOk && waive });

      onDecided("approved", applicant.id, result);
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible d’approuver cette candidature."));
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    setError(null);

    try {
      await rejectApplicant(applicant.id, reason);

      onDecided("rejected", applicant.id, {});
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible de refuser cette candidature."));
    } finally {
      setBusy(false);
    }
  };

  const changeDocument = async (docId: number, decision: "accept" | "refuse") => {
    setDocBusy(true);
    setError(null);

    try {
      if (decision === "accept") await acceptDocument(docId);
      else await refuseDocument(docId, docNote);

      setDocNote("");

      onChanged({
        ...applicant,
        documents: applicant.documents.map((doc) =>
          doc.id === docId
            ? {
                ...doc,
                status: decision === "accept" ? "APPROVED" : "REJECTED",
                rejectionNote: decision === "refuse" ? docNote.trim() || null : null,
              }
            : doc,
        ),
      });
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible de modifier ce document."));
    } finally {
      setDocBusy(false);
    }
  };

  const approveBlocked = !identityOk && (!waive || !note.trim());
  const rejectBlocked = reason.trim().length < MIN_REASON_LENGTH;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="my-6 w-full max-w-5xl rounded-2xl border border-stone-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-blue-950">{applicant.user.name}</h2>
            <p className="text-xs text-stone-500">
              Candidature du {format(new Date(applicant.createdAt), "d MMMM yyyy", { locale: fr })}
              {applicant.verificationStatus === "REJECTED" ? " · refusée" : ""}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* Who */}
          <div className="min-w-0 space-y-5 text-sm">
            <div className="space-y-1.5 text-stone-600">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#D4AF37]" /> {applicant.user.email}</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#D4AF37]" /> {applicant.user.phone ?? "—"}</div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#D4AF37]" /> {applicant.yearsExperience ?? 0} an(s) d’expérience
              </div>
            </div>

            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase text-stone-500">Métiers</h3>
              <div className="flex flex-wrap gap-1.5">
                {trades.length ? (
                  trades.map((trade) => (
                    <span key={trade} className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                      {trade}
                    </span>
                  ))
                ) : (
                  <span className="text-stone-400">Aucun métier indiqué.</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase text-stone-500">Zones d’intervention</h3>
              {applicant.serviceZones.length ? (
                <ul className="space-y-1">
                  {applicant.serviceZones.map((zone) => (
                    <li key={zone.id} className="flex items-center gap-2 text-stone-600">
                      <MapPin className="h-3.5 w-3.5 text-[#D4AF37]" />
                      {zone.label || zone.city || "Zone sans nom"}
                      {typeof zone.latitude === "number" ? <span className="text-xs text-stone-400">· {zone.radiusKm} km</span> : <span className="text-xs text-amber-600">· sans centre</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-stone-500">Aucune zone choisie : l’artisan ne serait limité à aucun lieu.</p>
              )}
            </div>

            {(applicant.companyName || applicant.companyNumber || applicant.insuranceNumber) && (
              <div>
                <h3 className="mb-1.5 text-xs font-semibold uppercase text-stone-500">Entreprise</h3>
                <dl className="space-y-0.5 text-stone-600">
                  {applicant.companyName && <div>{applicant.companyName}</div>}
                  {applicant.companyNumber && <div className="text-xs text-stone-500">N° {applicant.companyNumber}</div>}
                  {applicant.insuranceNumber && <div className="text-xs text-stone-500">Assurance {applicant.insuranceNumber}</div>}
                </dl>
              </div>
            )}

            {applicant.bio && (
              <div>
                <h3 className="mb-1.5 text-xs font-semibold uppercase text-stone-500">Présentation</h3>
                <p className="whitespace-pre-line rounded border border-stone-100 bg-stone-50 p-3 text-stone-600">{applicant.bio}</p>
              </div>
            )}

            {applicant.verificationStatus === "REJECTED" && applicant.rejectionReason && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-red-700">
                <div className="mb-0.5 text-xs font-semibold uppercase">Motif du refus</div>
                {applicant.rejectionReason}
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="min-w-0 space-y-3">
            <h3 className="text-xs font-semibold uppercase text-stone-500">Documents ({applicant.documents.length})</h3>

            {!identityOk && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {identityProblem(applicant)}
              </div>
            )}

            {applicant.documents.length === 0 ? (
              <p className="rounded-lg border border-dashed border-stone-200 p-6 text-center text-sm text-stone-500">Aucun document.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {applicant.documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => selectDocument(doc.id)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        doc.id === selectedId ? "border-blue-950 bg-blue-950 text-white" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {DOCUMENT_LABEL[doc.type]}
                      <span
                        className={`rounded-full border px-1.5 text-[10px] ${doc.id === selectedId ? "border-white/30 text-white" : STATUS_CLASS[doc.status]}`}
                      >
                        {DOCUMENT_STATUS_LABEL[doc.status]}
                      </span>
                    </button>
                  ))}
                </div>

                {selected && (
                  <div className="space-y-3">
                    <DocumentViewer key={selected.id} doc={selected} />

                    {selected.status === "REJECTED" && selected.rejectionNote && (
                      <p className="text-xs text-red-600">Document refusé : {selected.rejectionNote}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {selected.status !== "APPROVED" && (
                        <Button size="sm" variant="outline" disabled={docBusy} onClick={() => changeDocument(selected.id, "accept")}>
                          Valider ce document
                        </Button>
                      )}
                      {selected.status !== "REJECTED" && (
                        <>
                          <input
                            value={docNote}
                            onChange={(e) => setDocNote(e.target.value)}
                            maxLength={200}
                            placeholder="Pourquoi ? (illisible, périmé…)"
                            className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                          />
                          <Button size="sm" variant="outline" disabled={docBusy} onClick={() => changeDocument(selected.id, "refuse")} className="text-red-600">
                            Refuser ce document
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Decision */}
        <div className="space-y-4 border-t border-stone-100 bg-stone-50/60 px-6 py-4">
          {error && (
            <div className="flex items-start gap-2 whitespace-pre-line rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {mode === "review" && (
            <div className="flex flex-wrap justify-end gap-3">
              {!canDecide && (
                <p className="mr-auto self-center text-xs text-stone-500">
                  Vous pouvez vérifier les documents. La décision (accepter ou refuser la candidature) revient à un administrateur.
                </p>
              )}
              <Button variant="outline" onClick={onClose}>Fermer</Button>
              {canDecide && applicant.verificationStatus === "PENDING_REVIEW" && (
                <Button onClick={() => goTo("reject")} className="bg-red-600 hover:bg-red-700">
                  <XCircle className="mr-2 h-4 w-4" /> Refuser
                </Button>
              )}
              {canDecide && (
                <Button onClick={() => goTo("approve")} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approuver
                </Button>
              )}
            </div>
          )}

          {mode === "approve" && (
            <div className="space-y-3">
              <p className="text-sm text-stone-600">
                L’artisan recevra un lien à usage unique (24 h) pour choisir son mot de passe, puis verra les missions de ses métiers dans ses zones.
              </p>

              {!identityOk && (
                <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <input type="checkbox" checked={waive} onChange={(e) => setWaive(e.target.checked)} className="mt-0.5" />
                  <span>J’approuve cette candidature sans pièce d’identité valable, pour le motif écrit ci-dessous (gardé dans les notes du profil).</span>
                </label>
              )}

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={NOTE_MAX}
                rows={2}
                placeholder={identityOk ? "Note interne (facultative)" : "Motif de l’exception (obligatoire)"}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
              />

              <div className="flex justify-end gap-3">
                <Button variant="outline" disabled={busy} onClick={() => goTo("review")}>Retour</Button>
                <Button disabled={busy || approveBlocked} onClick={approve} className="bg-green-600 hover:bg-green-700">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Confirmer l’approbation
                </Button>
              </div>
            </div>
          )}

          {mode === "reject" && (
            <div className="space-y-3">
              <p className="text-sm text-stone-600">Le motif est envoyé au candidat et gardé sur son profil.</p>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={REASON_MAX}
                rows={3}
                placeholder="Motif du refus (obligatoire)"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
              />
              <div className="text-right text-xs text-stone-400">{reason.trim().length}/{REASON_MAX}</div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" disabled={busy} onClick={() => goTo("review")}>Retour</Button>
                <Button disabled={busy || rejectBlocked} onClick={reject} className="bg-red-600 hover:bg-red-700">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                  Confirmer le refus
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
