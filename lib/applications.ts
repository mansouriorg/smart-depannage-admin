import api, { unwrapList } from "@/lib/api";
import { fileIdOf } from "@/lib/proofs";
import type { Enums, Paginated } from "@/lib/shared";

type ArtisanDocumentStatus = Enums.ArtisanDocumentStatus;
type ArtisanDocumentType = Enums.ArtisanDocumentType;
type ArtisanVerificationStatus = Enums.ArtisanVerificationStatus;

/**
 * The verification queue (P1-11). An applicant is an artisan profile that waits for review
 * (PENDING_REVIEW); one that was refused (REJECTED) can be looked at again and approved.
 * The rows are what GET /admin/artisans answers.
 */
export interface ApplicantDocument {
  id: number;
  type: ArtisanDocumentType;
  /** "/files/12/download": private, read with the login (see DocumentViewer). */
  fileUrl: string;
  fileName: string | null;
  mimeType: string | null;
  status: ArtisanDocumentStatus;
  rejectionNote?: string | null;
}

export interface ApplicantZone {
  id: number;
  label: string | null;
  city: string | null;
  radiusKm: number;
  isActive: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface Applicant {
  /** The id of the artisan profile (not of the user). */
  id: number;
  userId: number;
  specialty: string | null;
  specialties: string[];
  yearsExperience: number | null;
  companyName: string | null;
  companyNumber: string | null;
  insuranceNumber: string | null;
  bio: string | null;
  verificationStatus: ArtisanVerificationStatus;
  rejectionReason: string | null;
  createdAt: string;
  user: { id: number; name: string; email: string; phone: string | null; isActive: boolean };
  documents: ApplicantDocument[];
  serviceZones: ApplicantZone[];
}

export type QueueTab = "PENDING_REVIEW" | "REJECTED";

export const DOCUMENT_LABEL: Record<ArtisanDocumentType, string> = {
  IDENTITY: "Pièce d’identité",
  COMPANY_LEGAL: "Document de l’entreprise",
  INSURANCE: "Attestation d’assurance",
  CERTIFICATE: "Certificat",
  PROFILE_PHOTO: "Photo de profil",
  OTHER: "Autre document",
};

export const DOCUMENT_STATUS_LABEL: Record<ArtisanDocumentStatus, string> = {
  PENDING: "À vérifier",
  APPROVED: "Validé",
  REJECTED: "Refusé",
};

/**
 * The same test as the server's approval: an identity document that has not been refused and is
 * a file of the platform (an address typed by the applicant in the older form proves nothing and
 * cannot be opened). Without one, approving needs the written exception (the server decides;
 * this only tells the screen to ask for it).
 */
export function hasValidIdentity(applicant: Pick<Applicant, "documents">): boolean {
  return (applicant.documents ?? []).some(
    (doc) => doc.type === "IDENTITY" && doc.status !== "REJECTED" && fileIdOf(doc.fileUrl) !== null,
  );
}

/** Why the identity check is not met, in a sentence for the review panel; null when it is. */
export function identityProblem(applicant: Pick<Applicant, "documents">): string | null {
  if (hasValidIdentity(applicant)) return null;

  const identity = (applicant.documents ?? []).filter((doc) => doc.type === "IDENTITY");

  if (!identity.length) {
    return "Aucune pièce d’identité : cette candidature ne peut être approuvée que par une exception écrite.";
  }

  if (identity.every((doc) => doc.status === "REJECTED")) return "La pièce d’identité a été refusée.";

  return "La pièce d’identité n’est pas un fichier envoyé sur la plateforme (une adresse saisie dans l’ancien formulaire) : elle ne peut pas être vérifiée.";
}

/** The trades to show: the list, or the main one for a profile that has only that. */
export function tradesOf(applicant: Pick<Applicant, "specialties" | "specialty">): string[] {
  if (applicant.specialties?.length) return applicant.specialties;

  return applicant.specialty ? [applicant.specialty] : [];
}

export async function fetchApplicants(tab: QueueTab): Promise<Applicant[]> {
  // One page of 100 (the server's maximum): a queue longer than that is a problem to see, not to page through.
  const response = await api.get<Paginated<Applicant> | Applicant[]>("/admin/artisans", {
    params: { status: tab, limit: 100 },
  });

  return unwrapList<Applicant>(response.data);
}

export interface ApproveInput {
  note?: string;
  waiveIdentityCheck?: boolean;
}

/** The answer carries `passwordSetupUrl` only while no mail server is configured. */
export type ApprovalResult = { passwordSetupUrl?: string };

export async function approveApplicant(profileId: number, input: ApproveInput): Promise<ApprovalResult> {
  const note = input.note?.trim();

  const response = await api.patch<ApprovalResult>(`/admin/artisans/${profileId}/approve`, {
    ...(note ? { note } : {}),
    ...(input.waiveIdentityCheck ? { waiveIdentityCheck: true } : {}),
  });

  return response.data ?? {};
}

export async function rejectApplicant(profileId: number, reason: string): Promise<void> {
  await api.patch(`/admin/artisans/${profileId}/reject`, { reason: reason.trim() });
}

export async function refuseDocument(documentId: number, note: string): Promise<void> {
  const text = note.trim();

  await api.patch(`/admin/artisans/documents/${documentId}/verify`, {
    status: "REJECTED",
    ...(text ? { rejectionNote: text } : {}),
  });
}

export async function acceptDocument(documentId: number): Promise<void> {
  await api.patch(`/admin/artisans/documents/${documentId}/verify`, { status: "APPROVED" });
}

/** What a refusal needs to be written (the server asks for the same minimum). */
export const MIN_REASON_LENGTH = 5;
