import { apiErrorMessage, apiErrorStatus, canonicalStatus, routes, staffRoleLabel } from "@/lib/shared";
import { fileIdOf, plainPhotoSrc } from "@/lib/proofs";

/**
 * The case-file page of a job (P1-14): the words and the small rules of the screen, in one place so
 * that they can be tested without a browser. What the server sends is the shape below
 * (GET /admin/interventions/:id); the server decides what is in it (an explicit list), this file
 * only decides how it is read.
 */

/** The longest note the server takes (it refuses a longer one with a 400). */
export const NOTE_MAX = 2000;

/** The biggest job number the server stores. */
const MAX_JOB_ID = 2_147_483_647;

/** A person as the case file names them: the account may be gone (no name, no role). */
export interface CasePerson {
  id: number;
  name: string | null;
  role: string | null;
}

/** A line of the timeline. `internal`: the customer and the technician do not read it. */
export interface CaseLine {
  id: number;
  type: string;
  title: string;
  message: string | null;
  createdAt: string;
  internal: boolean;
  author: CasePerson | null;
}

export type ChatAudience = "CLIENT_ARTISAN" | "CLIENT_SUPPORT" | "ARTISAN_SUPPORT" | "INTERNAL_ADMIN";

/** A message of any chat. A message that was deleted has no text and no attachment: it is told, not read. */
export interface CaseMessage {
  id: number;
  audience: ChatAudience | string;
  content: string | null;
  attachments: string[];
  createdAt: string;
  deleted: boolean;
  sender: CasePerson | null;
}

export interface CaseNote {
  id: number;
  content: string;
  createdAt: string;
  author: CasePerson | null;
}

export interface CaseContact {
  id: number;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface CaseFile {
  id: number;
  status: string;
  urgency: string;
  serviceType: string;
  description: string;
  address: string;
  preferredDate?: string | null;
  preferredStartTime?: string | null;
  preferredEndTime?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  accessInstructions?: string | null;
  apartmentCode?: string | null;
  buildingInfo?: string | null;
  floor?: string | null;
  photos?: string[] | null;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  hasIssue?: boolean | null;
  feedbackNotes?: string | null;
  rating?: number | null;
  problemReported?: boolean | null;
  problemType?: string | null;
  problemNotes?: string | null;
  diagnosticNotes?: string | null;
  extraQuoteRequested?: boolean | null;
  extraQuoteReason?: string | null;
  cancelledAt?: string | null;
  cancelledReason?: string | null;
  cancelledBy?: CasePerson | null;
  createdAt: string;
  updatedAt: string;
  client?: CaseContact | null;
  artisan?: CaseContact | null;
  subService?: { id: number; name?: string | null } | null;
  timeline: CaseLine[];
  messages: CaseMessage[];
  notes: CaseNote[];
}

// ==========================================================
// The page's address
// ==========================================================

/**
 * The job number in the address of the page. Only a whole number the server could hold is one: "12abc",
 * "0", "1e3" and "../users" are not, and the page does not send them to the server.
 */
export function jobIdFrom(param: string | string[] | undefined | null): number | null {
  const text = Array.isArray(param) ? param[0] : param;

  if (typeof text !== "string" || !/^\d{1,10}$/.test(text)) return null;

  const id = Number(text);

  return id >= 1 && id <= MAX_JOB_ID ? id : null;
}

/** The request for the case file: the shared route, for a number that was checked. */
export function caseFileRequest(id: number) {
  return routes.admin.intervention<CaseFile>(id);
}

/** What is said when the case file cannot be loaded: a job that is not there says so; otherwise the server's own sentence. */
export function loadFailureText(error: unknown): string {
  const status = apiErrorStatus(error);

  if (status === 404) return "Cette demande n'existe pas.";
  if (status === 403) return "Votre rôle n'a pas accès au dossier des demandes.";

  return apiErrorMessage(error, "Impossible de charger le dossier de la demande.");
}

/** True when a live event is about this job (an event that says nothing about which job it is concerns every open page). */
export function concernsJob(payload: unknown, id: number): boolean {
  if (payload === null || typeof payload !== "object") return true;

  const named = (payload as { interventionId?: unknown }).interventionId;

  return typeof named !== "number" ? true : named === id;
}

// ==========================================================
// The timeline
// ==========================================================

export type TimelineFilter = "all" | "public" | "internal";

export const TIMELINE_FILTERS: ReadonlyArray<{ value: TimelineFilter; label: string; hint: string }> = [
  { value: "all", label: "Tout", hint: "Toute l'histoire de la demande" },
  { value: "public", label: "Vu par le client", hint: "Les lignes que le client et le technicien lisent aussi" },
  { value: "internal", label: "Interne", hint: "Les lignes écrites pour l'équipe seulement" },
];

export function timelineView(lines: readonly CaseLine[] | null | undefined, filter: TimelineFilter): CaseLine[] {
  const all = Array.isArray(lines) ? lines : [];

  if (filter === "public") return all.filter((line) => !line.internal);
  if (filter === "internal") return all.filter((line) => line.internal);

  return [...all];
}

export function timelineCounts(lines: readonly CaseLine[] | null | undefined): Record<TimelineFilter, number> {
  const all = Array.isArray(lines) ? lines : [];
  const internal = all.filter((line) => line.internal).length;

  return { all: all.length, public: all.length - internal, internal };
}

// ==========================================================
// People
// ==========================================================

const ROLE_WORDS: Record<string, string> = { CLIENT: "Client", ARTISAN: "Technicien" };

export function roleWord(role: string | null | undefined): string {
  if (!role) return "";

  return ROLE_WORDS[role] ?? staffRoleLabel(role);
}

/** "Sonia (Support)"; the system for a line nobody wrote; an account that is gone says so. */
export function personLabel(person: CasePerson | null | undefined): string {
  if (!person) return "Système";

  const name = (person.name ?? "").trim();

  if (!name) return `Compte supprimé (n° ${person.id})`;

  const role = roleWord(person.role);

  return role ? `${name} (${role})` : name;
}

// ==========================================================
// Messages
// ==========================================================

export type ChatTone = "parties" | "support" | "team";

const CHATS: Record<string, { label: string; tone: ChatTone }> = {
  CLIENT_ARTISAN: { label: "Client ↔ Technicien", tone: "parties" },
  CLIENT_SUPPORT: { label: "Client ↔ Support", tone: "support" },
  ARTISAN_SUPPORT: { label: "Technicien ↔ Support", tone: "support" },
  INTERNAL_ADMIN: { label: "Équipe (interne)", tone: "team" },
};

export function chatLabel(audience: string): string {
  return CHATS[audience]?.label ?? audience;
}

/** `team`: the chat of the back office, which the customer and the technician never read. An unknown chat is treated as private. */
export function chatTone(audience: string): ChatTone {
  return CHATS[audience]?.tone ?? "team";
}

/** What a message says in the list: its text, or why there is none. */
export function messageText(message: Pick<CaseMessage, "deleted" | "content" | "attachments">): string {
  if (message.deleted) return "Message supprimé";

  const text = (message.content ?? "").trim();

  if (text) return text;

  const { images, others } = attachmentsOf(message);

  return images.length + others > 0 ? "" : "Message vide";
}

/**
 * Whether the page may load this address as a picture: a private file of the server (fetched with the staff
 * session) or a path on the server itself. An address on another site was typed by the customer or the
 * technician; loading it in a staff member's browser would tell whoever owns that site when, and from where,
 * the job was opened. Such an address is counted as "not shown" instead. A path that looks like a private file
 * but is not exactly its download address (`/api/files/3/download?x`) would be requested without the session,
 * so it is not shown either.
 */
export function isShowableAddress(url: string): boolean {
  if (fileIdOf(url) !== null) return true;

  // A file of the server's old public folder: plain names between slashes, nothing a browser would read as another
  // place (a backslash, a tab, `%`, `//`, `..`), and never the download route of a private file.
  return /^(?:\/[A-Za-z0-9._~-]+)+$/.test(url) && !/(?:^|\/)\.{1,2}(?:\/|$)/.test(url) && !/\/files(?:\/|$)/i.test(url) && plainPhotoSrc(url) !== null;
}

/** What the technician wrote as a diagnostic, trimmed; empty when there is none (or when the server sent something else). */
export function diagnosticOf(file: Pick<CaseFile, "diagnosticNotes">): string {
  return typeof file.diagnosticNotes === "string" ? file.diagnosticNotes.trim() : "";
}

/** The addresses the page can show as pictures, and how many it cannot. */
export function splitShowable(urls: readonly string[]): { images: string[]; others: number } {
  const images = urls.filter(isShowableAddress);

  return { images, others: urls.length - images.length };
}

/** The attachments the page can show as pictures, and how many it cannot (another site's address, a document). */
export function attachmentsOf(message: Pick<CaseMessage, "deleted" | "attachments">): { images: string[]; others: number } {
  if (message.deleted) return { images: [], others: 0 };

  const listed = (Array.isArray(message.attachments) ? message.attachments : [])
    .filter((item): item is string => typeof item === "string" && item.trim() !== "")
    .map((item) => item.trim());

  return splitShowable(listed);
}

// ==========================================================
// The job's details
// ==========================================================

export interface DetailRow {
  label: string;
  value: string;
}

const clean = (value: string | null | undefined): string => (typeof value === "string" ? value.trim() : "");

/** Where to go in the building, and who to ask: only what was given. */
export function accessRows(file: Pick<CaseFile, "buildingInfo" | "floor" | "apartmentCode" | "accessInstructions" | "contactName" | "contactPhone" | "contactEmail">): DetailRow[] {
  const rows: DetailRow[] = [
    { label: "Bâtiment", value: clean(file.buildingInfo) },
    { label: "Étage", value: clean(file.floor) },
    { label: "Code / appartement", value: clean(file.apartmentCode) },
    { label: "Instructions d'accès", value: clean(file.accessInstructions) },
    { label: "Contact sur place", value: clean(file.contactName) },
    { label: "Téléphone du contact", value: clean(file.contactPhone) },
    { label: "E-mail du contact", value: clean(file.contactEmail) },
  ];

  return rows.filter((row) => row.value !== "");
}

/** The day and the hours the customer asked for, or null when they gave none. */
export function preferredSlot(file: Pick<CaseFile, "preferredDate" | "preferredStartTime" | "preferredEndTime">): string | null {
  const date = file.preferredDate ? new Date(file.preferredDate) : null;
  const day = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("fr-FR", { timeZone: "UTC" }) : "";
  const from = clean(file.preferredStartTime);
  const to = clean(file.preferredEndTime);
  const hours = from && to ? `${from}–${to}` : from || to;
  const parts = [day, hours].filter((part) => part !== "");

  return parts.length > 0 ? parts.join(" · ") : null;
}

/** The pictures the customer sent with the request: no blank, no address twice. */
export function customerPhotos(file: Pick<CaseFile, "photos">): string[] {
  const seen = new Set<string>();

  for (const item of Array.isArray(file.photos) ? file.photos : []) {
    if (typeof item === "string" && item.trim() !== "") seen.add(item.trim());
  }

  return [...seen];
}

const PROBLEM_WORDS: Record<string, string> = {
  CLIENT_ABSENT: "Client absent",
  ACCESS_ISSUE: "Accès impossible",
  EXTRA_WORK_REQUIRED: "Travaux supplémentaires nécessaires",
  SAFETY_RISK: "Risque pour la sécurité",
  MATERIAL_MISSING: "Matériel manquant",
  CLIENT_DISPUTE: "Désaccord avec le client",
  OTHER: "Autre problème",
};

/** What the technician told the team about a problem on the job, or null when they told nothing. */
export function problemReport(file: Pick<CaseFile, "problemReported" | "problemType" | "problemNotes">): { title: string; notes: string } | null {
  const notes = clean(file.problemNotes);

  if (!file.problemReported && !notes) return null;

  return { title: (file.problemType && PROBLEM_WORDS[file.problemType]) || "Problème signalé par le technicien", notes };
}

/** Why and by whom the job was cancelled; null for a job that was not. */
export function cancellationOf(file: Pick<CaseFile, "status" | "cancelledAt" | "cancelledReason" | "cancelledBy">): { at: string | null; reason: string; by: string | null } | null {
  const cancelled = canonicalStatus(file.status) === "CANCELLED" || Boolean(file.cancelledAt) || clean(file.cancelledReason) !== "";

  if (!cancelled) return null;

  return {
    at: file.cancelledAt ?? null,
    reason: clean(file.cancelledReason) || "Aucun motif noté",
    by: file.cancelledBy ? personLabel(file.cancelledBy) : null,
  };
}

/** The lines of the timeline that say a technician set out: after one of these there may be positions to read. */
const ROUTE_LINE_TYPES = ["ARTISAN_ON_THE_WAY", "ARTISAN_ARRIVED", "WORK_STARTED", "WORK_COMPLETED"];

/**
 * Whether the route panel is offered (P3-05): a technician holds the job, or held it and set out (the timeline says so). A technician who
 * set out and then gave the job back leaves no technician on the case, and a dispute about it still needs the route.
 */
export function jobHadATechnician(file: Pick<CaseFile, "artisan" | "timeline">): boolean {
  return Boolean(file.artisan) || (file.timeline ?? []).some((line) => ROUTE_LINE_TYPES.includes(line.type));
}

/** The line under the title: the service, the trade. */
export function serviceLine(file: Pick<CaseFile, "serviceType" | "subService">): string {
  const sub = clean(file.subService?.name);
  const trade = clean(file.serviceType);

  return [trade, sub].filter((part) => part !== "").join(" · ");
}

// ==========================================================
// Notes
// ==========================================================

export type NoteDraft = { ok: true; body: { content: string } } | { ok: false; message: string };

/** The note as it is sent: without the spaces around it; never blank, never over the limit (the server checks again). */
export function noteDraft(text: string): NoteDraft {
  const content = typeof text === "string" ? text.trim() : "";

  if (content === "") return { ok: false, message: "Écrivez la note avant de l'ajouter." };

  if (content.length > NOTE_MAX) {
    return { ok: false, message: `La note est trop longue : ${content.length} caractères pour ${NOTE_MAX} au plus.` };
  }

  return { ok: true, body: { content } };
}

/**
 * The case file with a note added at the top of its notes (and once: the same note is not listed twice).
 * With `jobId`, a file of another job is returned as it is: a note stored for one job is never listed under
 * another.
 */
export function withNote(file: CaseFile, note: CaseNote, jobId?: number): CaseFile {
  if (jobId !== undefined && file.id !== jobId) return file;

  // An answer that is not a note (an empty body) is not listed; the page reads the case file again anyway.
  if (note === null || typeof note !== "object" || typeof note.id !== "number") return file;

  if (file.notes.some((existing) => existing.id === note.id)) return file;

  return { ...file, notes: [note, ...file.notes] };
}

/**
 * What the server sent, made safe to draw: the lists are lists (a missing one is empty) and a message
 * has a list of attachments. Null for an answer that is not a case file at all.
 */
export function normalizeCaseFile(raw: unknown): CaseFile | null {
  if (raw === null || typeof raw !== "object") return null;

  const file = raw as Partial<CaseFile>;

  if (typeof file.id !== "number") return null;

  const list = <T,>(value: readonly T[] | null | undefined): T[] => (Array.isArray(value) ? [...value] : []);
  const rows = <T extends object>(value: readonly T[] | null | undefined): T[] => list(value).filter((row) => row !== null && typeof row === "object");

  return {
    ...(file as CaseFile),
    photos: list(file.photos),
    timeline: rows(file.timeline),
    messages: rows(file.messages).map((message) => ({ ...message, attachments: list(message.attachments) })),
    notes: rows(file.notes),
  };
}
