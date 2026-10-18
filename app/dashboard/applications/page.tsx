"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, Briefcase, CheckCircle2, Clock, FileText, Loader2, MapPin, Phone, ShieldAlert, X, XCircle } from "lucide-react";
import { apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PasswordLinkDialog } from "@/components/password-link-dialog";
import { ReviewPanel } from "@/components/applications/review-panel";
import {
  type Applicant,
  type ApprovalResult,
  type QueueTab,
  fetchApplicants,
  hasValidIdentity,
  tradesOf,
} from "@/lib/applications";

type ToastState = {
  show: boolean;
  message: string;
  type: "success" | "error";
};

const TABS: Array<{ id: QueueTab; label: string }> = [
  { id: "PENDING_REVIEW", label: "En attente" },
  { id: "REJECTED", label: "Refusées" },
];

/**
 * The verification queue (P1-11): the applicants who sent the /rejoindre form (or whom the
 * older form left pending), with their documents. The decision is made in the review panel.
 */
export default function ApplicationsPage() {
  const [tab, setTab] = useState<QueueTab>("PENDING_REVIEW");
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: "", type: "success" });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  // Only the answer to the latest request is kept: a slow answer for the tab that was left must
  // not replace the list of the tab that is open.
  const latest = useRef(0);

  const load = useCallback(async (which: QueueTab) => {
    const mine = ++latest.current;

    setLoading(true);
    setLoadError(null);

    try {
      const rows = await fetchApplicants(which);

      if (mine === latest.current) setApplicants(rows);
    } catch (err) {
      if (mine === latest.current) {
        setApplicants([]);
        setLoadError(apiErrorMessage(err, "Impossible de charger les candidatures."));
      }
    } finally {
      if (mine === latest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const open = applicants.find((applicant) => applicant.id === openId) ?? null;

  const decided = (decision: "approved" | "rejected", profileId: number, result: ApprovalResult) => {
    setApplicants((prev) => prev.filter((applicant) => applicant.id !== profileId));
    setOpenId(null);

    if (decision === "approved") {
      // Mails are not sent while no mail server is configured: the answer carries the one-time link.
      if (result.passwordSetupUrl) setSetupUrl(result.passwordSetupUrl);

      showToast("Candidature approuvée : l’invitation est envoyée.", "success");
    } else {
      showToast("Candidature refusée : le motif est envoyé au candidat.", "success");
    }
  };

  return (
    <div className="relative mx-auto max-w-7xl space-y-6 p-6">
      {setupUrl && (
        <PasswordLinkDialog url={setupUrl} title="Candidature acceptée : lien pour l'artisan" onClose={() => setSetupUrl(null)} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-blue-950">Candidatures Techniciens</h1>
          <p className="text-sm text-stone-500">Vérifiez les documents, puis approuvez ou refusez avec un motif.</p>
        </div>

        <div className="flex rounded-lg border border-stone-200 bg-white p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setOpenId(null);
                setTab(item.id);
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === item.id ? "bg-blue-950 text-white" : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4" /> {loadError}
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => load(tab)}>Réessayer</Button>
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
        </div>
      ) : applicants.length === 0 && !loadError ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-12 text-center text-stone-500">
          {tab === "PENDING_REVIEW" ? "Aucune candidature en attente." : "Aucune candidature refusée."}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {applicants.map((applicant) => {
            const trades = tradesOf(applicant);
            const identityOk = hasValidIdentity(applicant);

            return (
              <div key={applicant.id} className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold text-blue-950">{applicant.user.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
                      <Phone className="h-3 w-3 text-[#D4AF37]" /> {applicant.user.phone ?? "—"}
                    </div>
                  </div>

                  {applicant.verificationStatus === "REJECTED" ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                      <XCircle className="h-3 w-3" /> Refusée
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-yellow-200 bg-yellow-100 px-2.5 py-1 text-xs font-bold text-yellow-700">
                      <Clock className="h-3 w-3" /> En attente
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {trades.map((trade) => (
                    <span key={trade} className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                      {trade}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {applicant.yearsExperience ?? 0} an(s)</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {applicant.serviceZones.length} zone(s)</span>
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {applicant.documents.length} document(s)</span>
                </div>

                {!identityOk && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                    <ShieldAlert className="h-3.5 w-3.5" /> Pas de pièce d’identité valable
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between pt-1">
                  <span className="text-xs text-stone-400">{format(new Date(applicant.createdAt), "d MMM yyyy", { locale: fr })}</span>
                  <Button size="sm" onClick={() => setOpenId(applicant.id)}>Examiner</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <ReviewPanel
          key={open.id}
          applicant={open}
          onClose={() => setOpenId(null)}
          onDecided={decided}
          onChanged={(changed) => setApplicants((prev) => prev.map((applicant) => (applicant.id === changed.id ? changed : applicant)))}
        />
      )}

      {/* Toast */}
      <div
        className={`fixed bottom-6 right-6 z-[60] transform transition-all duration-500 ${
          toast.show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-12 opacity-0"
        }`}
      >
        <div
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg ${
            toast.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast((prev) => ({ ...prev, show: false }))} className="ml-2 hover:opacity-70" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
