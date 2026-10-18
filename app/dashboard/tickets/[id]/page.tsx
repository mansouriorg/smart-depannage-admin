"use client";

import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Camera,
  Clock,
  History,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  StickyNote,
  User,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { callApi } from "@/lib/shared";
import { useStaff } from "@/components/auth/staff-provider";
import { connectLiveSocket } from "@/lib/socket";
import { formatDateTime } from "@/lib/proofs";
import {
  accessRows,
  cancellationOf,
  caseFileRequest,
  concernsJob,
  customerPhotos,
  diagnosticOf,
  jobIdFrom,
  loadFailureText,
  normalizeCaseFile,
  preferredSlot,
  problemReport,
  serviceLine,
  splitShowable,
  withNote,
  type CaseContact,
  type CaseFile,
  type CaseNote,
} from "@/lib/casefile";
import { ProofsPanel } from "@/components/tickets/proofs-panel";
import { AuthenticatedImage } from "@/components/tickets/authenticated-image";
import { TicketStatusBadge } from "@/components/tickets/ticket-status-badge";
import { UrgencyBadge } from "@/components/tickets/urgency-badge";
import { CaseTimeline } from "@/components/tickets/case-timeline";
import { CaseMessages } from "@/components/tickets/case-messages";
import { CaseNotes } from "@/components/tickets/case-notes";

/** A live event refreshes the page this long after the last one (several arrive together). */
const LIVE_REFRESH_DELAY_MS = 800;

function Section({ title, icon, children, tone = "plain" }: { title: string; icon: ReactNode; children: ReactNode; tone?: "plain" | "alert" }) {
  return (
    <section className={tone === "alert" ? "rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm" : "rounded-xl border border-stone-200 bg-white p-6 shadow-sm"}>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-blue-950">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-stone-500">{label}</p>
      <div className="break-words font-medium text-blue-950">{children}</div>
    </div>
  );
}

function PersonCard({ person, empty }: { person: CaseContact | null | undefined; empty: string }) {
  if (!person) {
    return <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-4 text-center text-sm text-stone-500">{empty}</p>;
  }

  const name = person.name?.trim() || `Compte n° ${person.id}`;

  return (
    <div className="flex items-start gap-4 rounded-lg border border-stone-100 bg-stone-50 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/20 text-lg font-bold text-[#B69121]" aria-hidden="true">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 space-y-1">
        <p className="break-words font-bold text-blue-950">{name}</p>
        {person.phone ? (
          <p className="flex items-center gap-1 text-sm text-stone-600">
            <Phone className="h-3 w-3 text-stone-400" aria-hidden="true" />
            <a href={`tel:${person.phone}`} className="hover:underline">
              {person.phone}
            </a>
          </p>
        ) : null}
        {person.email ? <p className="break-all text-sm text-stone-500">{person.email}</p> : null}
      </div>
    </div>
  );
}

/**
 * The case file of a job (P1-14): everything the team needs to follow it from the request to its end,
 * without leaving the page: what was asked and where, how to get in, who is on it, what has happened
 * (the lines the customer reads and the ones that are for the team, marked), what was said in every
 * chat, the photos (the customer's and the technician's proofs, fetched with the staff session), and the
 * notes of the team.
 */
function CaseFilePage({ jobId }: { jobId: number | null }) {
  const router = useRouter();
  const { can } = useStaff();

  const [file, setFile] = useState<CaseFile | null>(null);
  const [isLoading, setIsLoading] = useState(jobId !== null);
  const [error, setError] = useState<string | null>(jobId === null ? "Cette demande n'existe pas." : null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Only the newest request may change the screen: a slow answer for the previous job, or an older answer
  // for this one, is dropped.
  const latest = useRef(0);
  // The file on screen, for the code that must know whether there is one (a refresh that fails is not a failed load).
  const fileRef = useRef<CaseFile | null>(null);
  // Whether the page is still there: a note sent from a page that was left changes nothing.
  const alive = useRef(true);

  const load = useCallback(
    async (quiet: boolean) => {
      if (jobId === null) return;

      const mine = ++latest.current;

      if (quiet) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      try {
        const data = normalizeCaseFile(await callApi((config) => api.request(config), caseFileRequest(jobId)));

        if (mine !== latest.current) return;

        if (!data || data.id !== jobId) throw new Error("The answer is not the case file of this job");

        fileRef.current = data;
        setFile(data);
        setError(null);
        setRefreshError(null);
      } catch (failure) {
        if (mine !== latest.current) return;

        console.error("Error fetching the case file:", failure);

        // A refresh that fails keeps what is on screen; a load that fails with nothing on screen (the first
        // load, or one that a refresh replaced) has nothing to show but the failure.
        if (quiet && fileRef.current !== null) {
          setRefreshError(loadFailureText(failure));
        } else {
          fileRef.current = null;
          setFile(null);
          setError(loadFailureText(failure));
        }
      } finally {
        if (mine === latest.current) {
          setIsLoading(false);
          setRefreshing(false);
        }
      }
    },
    [jobId],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  const reloadRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    reloadRef.current = () => void load(true);
  }, [load]);

  // A change of status made by somebody else shows up here without a click.
  useEffect(() => {
    if (jobId === null) return;

    const socket = connectLiveSocket();

    if (!socket) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = (payload: unknown) => {
      if (!concernsJob(payload, jobId)) return;

      clearTimeout(timer);
      timer = setTimeout(() => reloadRef.current(), LIVE_REFRESH_DELAY_MS);
    };

    socket.on("admin.intervention.status.changed", onChange);

    return () => {
      clearTimeout(timer);
      socket.disconnect();
    };
  }, [jobId]);

  const onNoteAdded = useCallback(
    (note: CaseNote, forJob: number) => {
      // The person left this job while the note was being sent: it is stored on the first, and not listed here.
      if (!alive.current || forJob !== jobId) return;

      // The note shows at once. The case file is then read again: a refresh asked for before the note was stored
      // would bring the list back without it, and the new request makes the answer of the earlier one worthless.
      setFile((current) => (current ? withNote(current, note, forJob) : current));
      reloadRef.current();
    },
    [jobId],
  );

  // Never the file of another job under this address while the right one loads.
  const shown = file && file.id === jobId ? file : null;

  if (!shown && jobId !== null && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-32">
        <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
        <p className="font-medium text-stone-500">Chargement du dossier...</p>
      </div>
    );
  }

  if (error || !shown) {
    return (
      <div className="mx-auto mt-20 max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700" role="alert">
        <AlertCircle className="mx-auto mb-2 h-10 w-10 text-red-500" />
        <h2 className="mb-1 text-lg font-bold">Erreur</h2>
        <p className="whitespace-pre-line">{error || "Demande introuvable."}</p>
        <div className="mt-4 flex items-center justify-center gap-4">
          {jobId !== null ? (
            <button onClick={() => void load(false)} className="font-medium underline">
              Réessayer
            </button>
          ) : null}
          <button onClick={() => router.push("/dashboard/tickets")} className="font-medium underline">
            Retour aux interventions
          </button>
        </div>
      </div>
    );
  }

  const photos = customerPhotos(shown);
  const { images: photoImages, others: photosNotShown } = splitShowable(photos);
  const access = accessRows(shown);
  const slot = preferredSlot(shown);
  const problem = problemReport(shown);
  const cancelled = cancellationOf(shown);
  const diagnostic = diagnosticOf(shown);
  const hasClientReport = Boolean(shown.hasIssue && shown.feedbackNotes);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10 animate-in fade-in duration-500">
      {/* --- EN-TÊTE --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/dashboard/tickets" aria-label="Retour aux interventions" className="rounded-lg bg-stone-50 p-2 text-stone-500 transition-colors hover:bg-stone-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-blue-950">Demande n° {shown.id}</h1>
              <TicketStatusBadge status={shown.status} />
              <UrgencyBadge urgency={shown.urgency} />
            </div>
            <p className="mt-1 text-sm text-stone-500">
              {serviceLine(shown)} · reçue le {formatDateTime(shown.createdAt)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-60"
        >
          <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
          Actualiser
        </button>
      </div>

      {refreshError ? (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Le dossier n'a pas pu être actualisé ({refreshError}). Ce que vous voyez peut ne plus être à jour.
        </p>
      ) : null}

      {cancelled ? (
        <Section title="Demande annulée" icon={<AlertCircle className="h-5 w-5 text-red-600" />} tone="alert">
          <p className="whitespace-pre-wrap font-medium text-red-900">{cancelled.reason}</p>
          <p className="mt-2 text-xs text-red-700">
            {[cancelled.at ? formatDateTime(cancelled.at) : null, cancelled.by ? `par ${cancelled.by}` : null].filter(Boolean).join(" · ") || "Date et auteur non notés"}
          </p>
        </Section>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* --- COLONNE GAUCHE --- */}
        <div className="space-y-6 lg:col-span-2">
          <Section title="Description du problème" icon={<AlertCircle className="h-5 w-5 text-rose-500" />}>
            <div className="whitespace-pre-wrap break-words rounded-lg border border-stone-100 bg-stone-50 p-4 text-stone-700">{shown.description || "Aucune description."}</div>
            {slot ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-stone-600">
                <Calendar className="h-4 w-4 text-stone-400" aria-hidden="true" />
                Créneau souhaité : <span className="font-medium text-blue-950">{slot}</span>
              </p>
            ) : null}
          </Section>

          <Section title="Adresse et accès" icon={<Building2 className="h-5 w-5 text-[#D4AF37]" />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Adresse d'intervention">
                  <span className="flex items-start gap-1">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                    {shown.address || "Non renseignée"}
                  </span>
                </Field>
              </div>
              {access.map((row) => (
                <Fragment key={row.label}>
                  <Field label={row.label}>
                    <span className="whitespace-pre-wrap">{row.value}</span>
                  </Field>
                </Fragment>
              ))}
            </div>
            {access.length === 0 ? <p className="mt-3 text-sm text-stone-500">Le client n'a donné ni bâtiment, ni étage, ni instruction d'accès.</p> : null}
          </Section>

          {photos.length > 0 ? (
            <Section title={`Photos du client (${photos.length})`} icon={<Camera className="h-5 w-5 text-[#D4AF37]" />}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photoImages.map((url, index) => (
                  <div key={url} className="aspect-square overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
                    <AuthenticatedImage url={url} alt={`Photo ${index + 1} envoyée par le client`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
              {photosNotShown > 0 ? (
                <p className="mt-3 text-xs text-stone-500">
                  {photosNotShown === 1
                    ? "1 photo est une adresse hors du serveur : elle n'est pas chargée ici."
                    : `${photosNotShown} photos sont des adresses hors du serveur : elles ne sont pas chargées ici.`}
                </p>
              ) : null}
            </Section>
          ) : null}

          {hasClientReport ? (
            <Section title="Signalement actif du client" icon={<AlertTriangle className="h-5 w-5 text-red-600" />} tone="alert">
              <div className="whitespace-pre-wrap break-words rounded-lg border border-red-100 bg-white p-4 font-medium text-red-900">{shown.feedbackNotes}</div>
            </Section>
          ) : null}

          {problem || shown.extraQuoteRequested || diagnostic ? (
            <Section title="Signalé par le technicien" icon={<Wrench className="h-5 w-5 text-orange-500" />}>
              {problem ? (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <p className="font-semibold text-orange-900">{problem.title}</p>
                  {problem.notes ? <p className="mt-1 whitespace-pre-wrap break-words text-orange-900">{problem.notes}</p> : null}
                </div>
              ) : null}
              {diagnostic ? (
                <div className="mt-3">
                  <p className="text-sm text-stone-500">Diagnostic</p>
                  <p className="whitespace-pre-wrap break-words font-medium text-blue-950">{diagnostic}</p>
                </div>
              ) : null}
              {shown.extraQuoteRequested ? (
                <p className="mt-3 text-sm text-stone-700">
                  Devis complémentaire demandé{shown.extraQuoteReason ? ` : ${shown.extraQuoteReason}` : "."}
                </p>
              ) : null}
            </Section>
          ) : null}

          <Section title="Historique" icon={<History className="h-5 w-5 text-[#D4AF37]" />}>
            <CaseTimeline lines={shown.timeline} />
          </Section>

          <Section title="Messages" icon={<MessageSquare className="h-5 w-5 text-[#D4AF37]" />}>
            <CaseMessages messages={shown.messages} />
          </Section>

          {/* Preuves de travail (P1-07): photos privées, contrôles du serveur, décision du back-office. */}
          <ProofsPanel ticket={shown} onTicketChanged={() => void load(true)} />
        </div>

        {/* --- COLONNE DROITE --- */}
        <div className="space-y-6">
          <Section title="Client" icon={<User className="h-5 w-5 text-[#D4AF37]" />}>
            <PersonCard person={shown.client} empty="Aucun compte client n'est rattaché à cette demande." />
          </Section>

          <Section title="Technicien" icon={<Wrench className="h-5 w-5 text-[#D4AF37]" />}>
            <PersonCard person={shown.artisan} empty="Aucun technicien n'est encore affecté à cette demande." />
          </Section>

          <Section title="Notes internes" icon={<StickyNote className="h-5 w-5 text-[#D4AF37]" />}>
            <CaseNotes jobId={shown.id} notes={shown.notes} canWrite={can("addNote")} onAdded={onNoteAdded} />
          </Section>

          <Section title="Dates" icon={<Clock className="h-5 w-5 text-[#D4AF37]" />}>
            <div className="space-y-3 text-sm text-stone-600">
              <div className="flex justify-between gap-3 border-b border-stone-100 pb-2">
                <span>Reçue le</span>
                <span className="text-right font-medium">{formatDateTime(shown.createdAt)}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-stone-100 pb-2">
                <span>Dernière mise à jour</span>
                <span className="text-right font-medium">{formatDateTime(shown.updatedAt)}</span>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

/** One case file per job: another address is a new page, with nothing left over from the previous one. */
export default function TicketDetailsPage() {
  const params = useParams();
  const jobId = jobIdFrom(params?.id as string | string[] | undefined);

  return (
    <Fragment key={jobId ?? "invalid"}>
      <CaseFilePage jobId={jobId} />
    </Fragment>
  );
}
