import api from "@/lib/api";
import {
  COMPLAINT_NOTE_MAX,
  COMPLAINT_REASON_MAX,
  COMPLAINT_REPLY_MAX,
  MODERATION_REASON_MAX,
  REVIEW_ACTION_LABELS,
  STATUS_CHOICE_LABELS,
  callApi,
  moneyText,
  readAssignee,
  readJournalNote,
  readModeration,
  readRefundDecision,
  readReply,
  readResolution,
  readStatusChange,
  reviewCriteriaWords,
  routes,
  starsText,
  statusChoicesFor,
  type ComplaintCase,
  type ComplaintMoney,
  type ReviewAction,
  type ReviewRow,
  type ReviewStatus,
  type RouteSpec,
} from "@/lib/shared";
import type { ActionSpec } from "@/components/finance/action-dialog";

/** A call of the screens gives up after this long: a form that waits for ever would hide whether the call went through. */
const SEND_TIMEOUT_MS = 30_000;

const send = <Answer,>(spec: RouteSpec<Answer>) => callApi((config) => api.request({ ...config, timeout: SEND_TIMEOUT_MS }), spec);

/** What a button of a complaint needs to know about it. */
export type ComplaintSubject = Pick<ComplaintCase, "id" | "title" | "status" | "refundRequested" | "refundDecision" | "refundAmount" | "assignedToId"> & { user?: { role?: string | null } | null };

/** Who can read a complaint besides the team: the client and the technician of the job (the author is one of them, or told in the notification). */
const PARTIES = "le client et le technicien de la mission";

/** Who wrote the complaint, as the forms name them: a technician can open one too, and is the one told of the answers. */
export const complainantWord = (complaint: Pick<ComplaintSubject, "user">): "client" | "technicien" => (complaint.user?.role === "ARTISAN" ? "technicien" : "client");

export interface Agent {
  id: number;
  name: string;
  role: string;
}

const ROLE_WORDS: Record<string, string> = { ADMIN: "administrateur", SUPER_ADMIN: "super administrateur", SUPPORT: "support", DISPATCHER: "dispatcheur" };

export const agentLabel = (agent: Agent, meId: number | null) => `${agent.name || `Agent n° ${agent.id}`}${agent.id === meId ? " (moi)" : ""} · ${ROLE_WORDS[agent.role] ?? agent.role.toLowerCase()}`;

/**
 * The agent the form starts on: the one who handles the complaint, else the person signed in, when they are in the list. Somebody who
 * left the team is not in it, and a preset the list does not hold would show another name than the one that is sent.
 */
export function assigneeStart(complaint: Pick<ComplaintSubject, "assignedToId">, agents: readonly Agent[], meId: number | null): string {
  const listed = (id: number | null | undefined) => id !== null && id !== undefined && agents.some((agent) => agent.id === id);

  if (listed(complaint.assignedToId)) return String(complaint.assignedToId);

  return listed(meId) ? String(meId) : "";
}

/** Gives the complaint to somebody of the team (the customer's complaint passes to "en cours", and the agent is told). */
export function assignSpec(complaint: ComplaintSubject, agents: readonly Agent[], meId: number | null): ActionSpec<unknown> {
  return {
    key: `assign-${complaint.id}`,
    title: `Confier la réclamation n° ${complaint.id}`,
    // Not retrySafe: a second send tells the agent a second time.
    intro: <>La personne choisie est prévenue. La réclamation passe « en cours de traitement ».</>,
    fields: [
      {
        id: "agent",
        label: "Responsable",
        kind: "select",
        required: true,
        initial: assigneeStart(complaint, agents, meId),
        options: agents.map((agent) => ({ value: String(agent.id), label: agentLabel(agent, meId) })),
      },
    ],
    submitLabel: "Confier",
    check: (values) => {
      const read = readAssignee(values.agent);

      return read.ok ? { ok: true, value: read.body } : read;
    },
    run: async (body) => void (await send(routes.complaints.assign(complaint.id, body as { assignedToId: number }))),
  };
}

/** Writes in the thread: to the customer (they are told), or a message the team alone reads. */
export function replySpec(complaint: ComplaintSubject): ActionSpec<unknown> {
  return {
    key: `reply-${complaint.id}`,
    title: `Répondre · réclamation n° ${complaint.id}`,
    intro: (
      <>
        Ce message est lisible par {PARTIES} ; le {complainantWord(complaint)} en est prévenu et la réclamation passe « en cours de traitement ». Cochez « interne » pour un message que l’équipe seule lira : rien ne change alors.
      </>
    ),
    fields: [
      { id: "content", label: "Message", kind: "textarea", required: true, maxLength: COMPLAINT_REPLY_MAX },
      { id: "internal", label: "Message interne (ni le client ni le technicien ne le voient)", kind: "checkbox" },
    ],
    submitLabel: "Envoyer",
    check: (values) => {
      const read = readReply(values.content, values.internal === "true");

      return read.ok ? { ok: true, value: read.body } : read;
    },
    run: async (body) => void (await send(routes.complaints.reply(complaint.id, body as { content: string; isInternal: boolean }))),
  };
}

/** Moves the complaint to another stage. Rejecting says why; the customer is told of the new status. */
export function statusSpec(complaint: ComplaintSubject): ActionSpec<unknown> {
  const choices = statusChoicesFor(complaint);

  return {
    key: `status-${complaint.id}`,
    title: `Changer le statut · réclamation n° ${complaint.id}`,
    // Not retrySafe: a second send tells the customer a second time.
    intro: <>Le {complainantWord(complaint)} est prévenu du nouveau statut, pas de la note. Pour clore la réclamation comme résolue, utilisez « Résoudre ».</>,
    fields: [
      { id: "status", label: "Nouveau statut", kind: "select", required: true, initial: choices[0] ?? "", options: choices.map((choice) => ({ value: choice, label: STATUS_CHOICE_LABELS[choice] })) },
      { id: "note", label: "Note", kind: "textarea", maxLength: COMPLAINT_REASON_MAX, requirement: "obligatoire pour rejeter", help: "Gardée avec la réclamation, pour l’équipe : ni le client ni le technicien ne la lisent." },
    ],
    submitLabel: "Changer le statut",
    check: (values) => {
      const read = readStatusChange(values.status, values.note);

      return read.ok ? { ok: true, value: read.body } : read;
    },
    run: async (body) => void (await send(routes.complaints.setStatus(complaint.id, body as { status: string; note?: string }))),
  };
}

/** Closes the complaint as resolved, with the explanation the customer reads. */
export function resolveSpec(complaint: ComplaintSubject): ActionSpec<unknown> {
  return {
    key: `resolve-${complaint.id}`,
    title: `Résoudre · réclamation n° ${complaint.id}`,
    intro: (
      <>
        La réclamation est clôturée comme résolue et le {complainantWord(complaint)} en est prévenu. L’explication est lisible par {PARTIES}. Elle ne se rouvre pas depuis cet écran.
      </>
    ),
    fields: [{ id: "notes", label: "Explication (lue par le client et le technicien)", kind: "textarea", required: true, maxLength: COMPLAINT_REPLY_MAX }],
    submitLabel: "Résoudre",
    check: (values) => {
      const read = readResolution(values.notes);

      return read.ok ? { ok: true, value: read.body } : read;
    },
    run: async (body) => void (await send(routes.complaints.resolve(complaint.id, body as { resolutionNotes: string }))),
  };
}

/**
 * The decision on the refund the customer asked for. Accepting states the amount, at most what was paid on the job, and moves no
 * money: finance gives it back on the payment of the job (Finance, Remboursements).
 */
export function refundDecisionSpec(complaint: ComplaintSubject, money: ComplaintMoney): ActionSpec<unknown> {
  return {
    key: `refund-${complaint.id}`,
    title: `Décision sur le remboursement · réclamation n° ${complaint.id}`,
    intro: (
      <>
        <p>
          Le client a payé <strong>{moneyText(money.received, money.currency)}</strong> sur cette mission
          {money.refunded > 0 ? `, dont ${moneyText(money.refunded, money.currency)} déjà rendus` : ""}.
        </p>
        <p className="mt-2">Accepter ne verse pas l’argent : le remboursement accepté apparaît dans Finance, qui le rend sur le paiement. Une fois accepté, il ne se retire plus d’ici.</p>
        <p className="mt-2">La décision et le montant accepté sont visibles du client et du technicien de la mission.</p>
      </>
    ),
    fields: [
      {
        id: "decision",
        label: "Décision",
        kind: "select",
        required: true,
        initial: "accept",
        options: [
          { value: "accept", label: "Accepter le remboursement" },
          { value: "refuse", label: "Refuser le remboursement" },
        ],
      },
      { id: "amount", label: "Montant accepté (DT)", kind: "amount", requirement: "obligatoire pour accepter", help: "Au plus ce que le client a payé. Inutile pour un refus." },
      { id: "note", label: "Note", kind: "textarea", maxLength: COMPLAINT_REASON_MAX, help: `Gardée dans le journal de la réclamation, pour l’équipe. ${COMPLAINT_REASON_MAX} caractères au plus.` },
    ],
    submitLabel: "Enregistrer la décision",
    check: (values) => {
      const read = readRefundDecision(values.decision === "accept" ? true : values.decision === "refuse" ? false : undefined, values.amount, values.note, money.received);

      return read.ok ? { ok: true, value: read.body } : read;
    },
    run: async (body) => void (await send(routes.complaints.decideRefund(complaint.id, body as { approved: boolean; amount?: number; note?: string }))),
  };
}

/** A line of the journal: what the team did or knows. The customer never reads it. */
export function noteSpec(complaint: ComplaintSubject): ActionSpec<unknown> {
  return {
    key: `note-${complaint.id}`,
    title: `Ajouter une note · réclamation n° ${complaint.id}`,
    intro: <>Réservée à l’équipe : le client ne la lit pas.</>,
    fields: [{ id: "content", label: "Note", kind: "textarea", required: true, maxLength: COMPLAINT_NOTE_MAX }],
    submitLabel: "Ajouter la note",
    check: (values) => {
      const read = readJournalNote(values.content);

      return read.ok ? { ok: true, value: read.body } : read;
    },
    run: async (body) => void (await send(routes.complaints.note(complaint.id, body as { content: string }))),
  };
}

const excerpt = (text: string | null, max: number) => ((text ?? "").length > max ? `${(text ?? "").slice(0, max).trimEnd()}…` : (text ?? ""));

/** The decision on a review. Refusing or hiding gives the reason; the review is kept with it. */
export function moderationSpec(action: ReviewAction, review: Pick<ReviewRow, "id" | "rating" | "comment" | "status" | "client" | "artisan" | "isOnTime" | "isWorkClean" | "isPriceRespected" | "wouldRecommend">): ActionSpec<unknown> {
  const publishing = action === "approve";
  const criteria = reviewCriteriaWords(review);

  return {
    key: `moderate-${action}-${review.id}`,
    title: `${REVIEW_ACTION_LABELS[action]} · avis n° ${review.id}`,
    retrySafe: true,
    intro: (
      <>
        <p>
          <span aria-label={`${review.rating} sur 5`}>{starsText(review.rating)}</span> · {review.client?.name ?? "Client"} sur {review.artisan?.name ?? "le technicien"}
        </p>
        {review.comment && <p className="mt-1 italic">« {excerpt(review.comment, 240)} »</p>}
        {criteria && <p className="mt-1 text-xs text-stone-500">{criteria}</p>}
        <p className="mt-2">
          {publishing
            ? `L’avis devient visible et compte dans la note du technicien.${review.status === "REJECTED" || review.status === "HIDDEN" ? " La raison donnée plus tôt n’est plus gardée." : ""}`
            : action === "reject"
              ? "L’avis n’est pas affiché et ne compte pas dans la note du technicien ; son auteur le voit toujours, avec son statut mais sans la raison. Le client n’en est pas prévenu."
              : "L’avis est retiré de l’affichage et de la note du technicien ; son auteur le voit toujours, avec son statut mais sans la raison. Le client n’en est pas prévenu."}
        </p>
      </>
    ),
    fields: publishing ? [] : [{ id: "reason", label: "Raison", kind: "textarea", required: true, maxLength: MODERATION_REASON_MAX, help: "Gardée avec l’avis, pour l’équipe, tant qu’il n’est pas publié : elle explique la décision plus tard." }],
    submitLabel: REVIEW_ACTION_LABELS[action],
    danger: !publishing,
    check: (values) => {
      const read = readModeration(action, values.reason);

      return read.ok ? { ok: true, value: read.body } : read;
    },
    run: async (body) => void (await send(routes.reviews.moderate(review.id, body as { status: ReviewStatus; moderationReason?: string }))),
  };
}
