import api from "@/lib/api";
import { SERVER_URL } from "@/lib/config";
import { callApi, pageItems, routes } from "@/lib/shared";

/**
 * Proofs of work (P1-07). The server judges every before/after photo (position, accuracy,
 * simulated-location flag, reused photo...) and keeps one "capture" row per attempt. A photo
 * that passed is ACCEPTED, one that needs a person's look is NEEDS_REVIEW, one the server
 * refused (or a person refused afterwards) is REJECTED.
 */
export type ProofStatus = "ACCEPTED" | "NEEDS_REVIEW" | "REJECTED";
export type ProofKind = "BEFORE" | "AFTER";

export interface ProofRecord {
  id: number;
  interventionId: number;
  kind: ProofKind;
  source: "ARTISAN" | "STAFF";
  status: ProofStatus;
  reasons: string[];
  /** One sentence per reason, written for the back office. */
  reasonLabels: string[];
  /** Null for an attempt the server refused: the picture was never kept. */
  photoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
  mocked: boolean | null;
  distanceM: number | null;
  clientCapturedAt: string | null;
  clockOffsetSeconds: number | null;
  /** The time of the proof: the server's clock, not the phone's. */
  receivedAt: string;
  submittedById: number | null;
  reviewedById: number | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export const PROOF_STATUS_LABEL: Record<ProofStatus, string> = {
  ACCEPTED: "Acceptée",
  NEEDS_REVIEW: "À vérifier",
  REJECTED: "Refusée",
};

export const PROOF_KIND_LABEL: Record<ProofKind, string> = {
  BEFORE: "Photo avant",
  AFTER: "Photo après",
};

/**
 * The id of a photo kept by the files module, from the address stored on the job:
 * "/api/files/12/download" (today) or "/files/12/download" (older jobs). Such a photo is
 * private: it is read with the login, never with a plain <img src>.
 */
export function fileIdOf(url: string | null | undefined): number | null {
  const found = /^(?:\/api)?\/files\/(\d{1,10})\/download$/.exec(url ?? "");

  return found ? Number(found[1]) : null;
}

/**
 * Where a photo that is NOT behind the login can be read: an address on another site, or a
 * file of the old public folder. Null when there is nothing to show.
 */
export function plainPhotoSrc(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${SERVER_URL}${url}`;

  return null;
}

/** "320 m", "1,2 km" */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;

  return `${(meters / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * The capture that is the photo on the job: the one whose address is stored on it. Newest wins
 * when two rows carry the same address.
 */
export function retainedProof(proofs: ProofRecord[], kind: ProofKind, photoUrl: string | null | undefined): ProofRecord | null {
  if (!photoUrl) return null;

  return (
    proofs
      .filter((proof) => proof.kind === kind && proof.photoUrl === photoUrl && proof.status !== "REJECTED")
      .sort((a, b) => b.id - a.id)[0] ?? null
  );
}

export async function fetchProofs(interventionId: number | string): Promise<ProofRecord[]> {
  // The answer is a page ({ data, meta }, paged by take and skip): a screen that reads another shape does not compile.
  const page = await callApi((config) => api.request(config), routes.proofs.list<ProofRecord>({ interventionId, take: 100 }));

  return pageItems(page);
}

export async function reviewProof(proofId: number, decision: "APPROVE" | "REJECT", note: string): Promise<void> {
  const text = note.trim();

  await api.patch(`/proofs/${proofId}/review`, text ? { decision, note: text } : { decision });
}
