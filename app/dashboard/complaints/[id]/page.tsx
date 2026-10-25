"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Lock, Phone } from "lucide-react";
import api from "@/lib/api";
import {
  callApi,
  canOpenDashboardPath,
  complaintActions,
  dayText,
  momentText,
  moneyText,
  paymentMethodLabel,
  paymentStatusLabel,
  invoiceStatusLabel,
  isOpenComplaint,
  isRefundWaiting,
  refundIsToPay,
  routes,
  serviceNameOf,
  statusLabel,
  type ComplaintAction,
  type ComplaintCase,
  type ComplaintContact,
} from "@/lib/shared";
import { useStaff } from "@/components/auth/staff-provider";
import { ComplaintStatusPill, RefundLine } from "@/components/complaints/complaint-bits";
import { ActionDialog, type ActionSpec } from "@/components/finance/action-dialog";
import { useFinanceData } from "@/components/finance/use-finance-data";
import { useRefocusAfterAction } from "@/components/finance/use-refocus";
import { MissionLink } from "@/components/finance/mission-link";
import { Empty, ErrorBox, Loading, Notice, Pill } from "@/components/finance/ui";
import { assignSpec, complainantWord, noteSpec, refundDecisionSpec, replySpec, resolveSpec, statusSpec, type Agent } from "@/lib/complaint-actions";
import { cn } from "@/lib/utils";

const ROLE_ORDER = ["SUPPORT", "ADMIN", "SUPER_ADMIN"] as const;

/** The agents a complaint can be given to: support, then the administrators, and the person at the keyboard whatever the lists say. */
async function loadAgents(me: { id: number; name?: string | null; role: string } | null): Promise<Agent[]> {
  const answers = await Promise.allSettled(ROLE_ORDER.map((role) => callApi((config) => api.request(config), routes.users.team<{ id: number; name: string | null; role: string; isActive?: boolean }>(role))));
  const found = new Map<number, Agent>();

  for (const answer of answers) {
    if (answer.status !== "fulfilled") continue;

    for (const row of answer.value.data ?? []) {
      if (row.isActive === false) continue;

      found.set(row.id, { id: row.id, name: row.name ?? "", role: row.role });
    }
  }

  if (me && !found.has(me.id)) found.set(me.id, { id: me.id, name: me.name ?? "", role: me.role });

  return [...found.values()];
}

export default function ComplaintCasePage() {
  const params = useParams<{ id: string }>();
  const id = Number.parseInt(String(params?.id ?? ""), 10);
  const { user, role, can } = useStaff();
  const valid = Number.isInteger(id) && id > 0;
  const { data, error, busy, reload } = useFinanceData<ComplaintCase | null>(() => (valid ? callApi((config) => api.request(config), routes.complaints.one(id)) : Promise.resolve(null)), `case-${id}`, "Impossible de charger la réclamation.");

  const refocus = useRefocusAfterAction(data, busy);
  const [spec, setSpec] = useState<ActionSpec<unknown> | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const open = useCallback(
    async (action: ComplaintAction, complaint: ComplaintCase) => {
      setDone(null);
      setProblem(null);

      if (action === "assign") {
        setPreparing(true);

        try {
          setSpec(assignSpec(complaint, await loadAgents(user ? { id: user.id, name: user.name, role: user.role } : null), user?.id ?? null));
        } finally {
          setPreparing(false);
        }

        return;
      }

      setSpec(
        action === "reply"
          ? replySpec(complaint)
          : action === "status"
            ? statusSpec(complaint)
            : action === "resolve"
              ? resolveSpec(complaint)
              : action === "note"
                ? noteSpec(complaint)
                : refundDecisionSpec(complaint, complaint.money),
      );
    },
    [user],
  );

  if (!valid) return <ErrorBox message="Cette réclamation n’existe pas." />;

  return (
    <div className="space-y-4">
      <Link href="/dashboard/complaints" className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-900 underline-offset-2 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Réclamations
      </Link>

      {done && <Notice>{done}</Notice>}
      {problem && <ErrorBox message={problem} />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {!data && !error ? (
        <Loading />
      ) : data ? (
        <div className={cn("space-y-4", busy && "opacity-70 transition-opacity")} aria-busy={busy}>
          <Header complaint={data} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
              <Actions complaint={data} canHandle={can("handleComplaint")} canDecide={can("decideComplaintRefund")} locked={busy || preparing} onAction={(action) => void open(action, data).catch(() => setProblem("Impossible de préparer ce formulaire."))} />
              <Description complaint={data} />
              <Thread complaint={data} />
              <Journal complaint={data} />
            </div>
            <div className="space-y-4">
              <People complaint={data} />
              <Money complaint={data} canFinance={canOpenDashboardPath(role, "/dashboard/finance")} />
            </div>
          </div>
        </div>
      ) : null}

      <ActionDialog
        spec={spec}
        onClose={() => setSpec(null)}
        onDone={() => {
          const title = spec?.title ?? "";

          setSpec(null);
          setDone(`${title} : c’est fait.`);
          refocus();
          reload();
        }}
        onRefused={reload}
      />
    </div>
  );
}

function Card({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-stone-200 bg-white p-4 shadow-sm", className)}>
      <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500">{title}</h2>
      <div className="mt-3 text-sm text-stone-700">{children}</div>
    </section>
  );
}

function Header({ complaint }: { complaint: ComplaintCase }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Réclamation n° {complaint.id}</p>
          <h1 data-dialog-fallback tabIndex={-1} className="mt-1 text-xl font-bold text-blue-950 outline-none">{complaint.title}</h1>
          <p className="mt-1 text-xs text-stone-500">
            Ouverte le {dayText(complaint.createdAt) ?? "—"}
            {complaint.closedAt ? ` · clôturée le ${dayText(complaint.closedAt)}` : isOpenComplaint(complaint.status) ? "" : refundIsToPay(complaint) ? " · en attente du remboursement" : " · clôturée"}
          </p>
        </div>
        <div className="text-right">
          <ComplaintStatusPill row={complaint} />
          <RefundLine row={complaint} currency={complaint.money.currency} />
          <p className="mt-1 text-xs text-stone-500">{complaint.assignedTo ? `Responsable : ${complaint.assignedTo.name ?? `agent n° ${complaint.assignedTo.id}`}` : "Personne ne s’en occupe"}</p>
        </div>
      </div>
    </div>
  );
}

const BUTTON_WORDS: Record<ComplaintAction, string> = {
  assign: "Confier à…",
  reply: "Répondre",
  status: "Changer le statut",
  resolve: "Résoudre",
  decideRefund: "Décider du remboursement",
  note: "Ajouter une note",
};

function Actions({ complaint, canHandle, canDecide, locked, onAction }: { complaint: ComplaintCase; canHandle: boolean; canDecide: boolean; locked: boolean; onAction: (action: ComplaintAction) => void }) {
  const wanted = complaintActions(complaint).filter((action) => (action === "decideRefund" ? canDecide : canHandle));
  const closed = !isOpenComplaint(complaint.status);

  return (
    <Card title="Actions">
      {wanted.length === 0 ? (
        <p className="flex items-center gap-2 text-stone-500">
          <Lock className="h-4 w-4" /> Votre rôle consulte cette réclamation ; il ne la traite pas.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {wanted.map((action) => (
            <button
              key={action}
              type="button"
              disabled={locked}
              onClick={() => onAction(action)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                action === "decideRefund" ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" : action === "resolve" ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-stone-200 text-stone-700 hover:bg-stone-50",
              )}
            >
              {BUTTON_WORDS[action]}
            </button>
          ))}
        </div>
      )}
      {closed && wanted.length > 0 && (
        <p className="mt-3 text-xs text-stone-500">
          {complaint.refundDecision === "APPROVED"
            ? "Le remboursement est accepté : la réclamation ne se rouvre pas depuis cet écran, et l’argent se rend sur le paiement de la mission, dans Finance. Vous pouvez encore y ajouter une note."
            : "Cette réclamation est close : elle ne se rouvre pas depuis cet écran. Vous pouvez encore y ajouter une note."}
        </p>
      )}
      {!closed && canHandle && complaint.refundDecision === "APPROVED" && (
        <p className="mt-3 text-xs text-stone-500">Le remboursement est accepté : l’argent se rend sur le paiement de la mission, dans Finance.</p>
      )}
      {!closed && isRefundWaiting(complaint) && (
        <p data-testid="refund-first" className="mt-3 text-xs text-amber-800">
          {canDecide
            ? "Le client a demandé un remboursement : sa décision est à prendre avant que la réclamation puisse être close."
            : "Le client a demandé un remboursement : la réclamation ne peut être close qu’après la décision des administrateurs ou du comptable."}
        </p>
      )}
      {!canDecide && complaint.refundRequested && complaint.refundDecision === "NOT_REQUESTED" && <p className="mt-3 text-xs text-stone-500">Le client demande un remboursement : la décision revient aux administrateurs et au comptable.</p>}
    </Card>
  );
}

function Description({ complaint }: { complaint: ComplaintCase }) {
  const photos = [...(complaint.photos ?? [])];

  return (
    <Card title={`Ce que le ${complainantWord(complaint)} a écrit`}>
      <p className="whitespace-pre-wrap">{complaint.description || "—"}</p>
      {photos.length > 0 && <p className="mt-2 text-xs text-stone-500">{photos.length} photo{photos.length === 1 ? "" : "s"} jointe{photos.length === 1 ? "" : "s"} : {photos.length === 1 ? "elle n’est" : "elles ne sont"} pas encore affichée{photos.length === 1 ? "" : "s"} dans ce tableau de bord.</p>}
      {complaint.resolutionNotes && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
          <p className="text-xs font-bold uppercase">Résolution</p>
          <p className="mt-1 whitespace-pre-wrap">{complaint.resolutionNotes}</p>
        </div>
      )}
    </Card>
  );
}

function Thread({ complaint }: { complaint: ComplaintCase }) {
  return (
    <Card title={`Échanges (${complaint.messages.length})`}>
      {complaint.messages.length === 0 ? (
        <Empty>Aucun message pour l’instant.</Empty>
      ) : (
        <ol className="space-y-3">
          {complaint.messages.map((message) => (
            <li key={message.id} className={cn("rounded-lg border p-3", message.isInternal ? "border-amber-200 bg-amber-50" : "border-stone-200 bg-stone-50")}>
              <p className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <strong className="text-stone-800">{message.sender?.name ?? "—"}</strong>
                <span>{roleWords(message.senderRole ?? message.sender?.role)}</span>
                <span>· {momentText(message.createdAt) ?? ""}</span>
                {message.isInternal && (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                    <Lock className="h-3 w-3" /> Interne
                  </span>
                )}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-stone-800">{message.content}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function Journal({ complaint }: { complaint: ComplaintCase }) {
  return (
    <Card title="Journal de l’équipe">
      {complaint.adminNotes && (
        <div className="mb-3 rounded-lg border border-stone-200 bg-stone-50 p-3" data-testid="status-note">
          <p className="text-xs font-bold uppercase text-stone-500">Note du statut (réservée à l’équipe)</p>
          <p className="mt-1 whitespace-pre-wrap">{complaint.adminNotes}</p>
        </div>
      )}
      {complaint.internalNotes.length === 0 ? (
        complaint.adminNotes ? null : <p className="text-stone-500">Rien n’a été noté.</p>
      ) : (
        <ol className="space-y-2">
          {complaint.internalNotes.map((note) => (
            <li key={note.id} className="border-l-2 border-stone-200 pl-3">
              <p className="text-xs text-stone-500">
                {note.author?.name ?? "Système"} · {momentText(note.createdAt) ?? ""}
              </p>
              <p className="whitespace-pre-wrap">{note.content}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

const ROLE_WORDS: Record<string, string> = { CLIENT: "client", ARTISAN: "technicien", SUPPORT: "support", ADMIN: "administrateur", SUPER_ADMIN: "super administrateur", DISPATCHER: "dispatcheur", ACCOUNTANT: "comptable" };
const roleWords = (role: string | null | undefined) => (role ? (ROLE_WORDS[role] ?? role.toLowerCase()) : "");

function Contact({ title, person }: { title: string; person: ComplaintContact | null }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-stone-400">{title}</p>
      {person ? (
        <>
          <p className="font-medium text-stone-800">{person.name ?? `n° ${person.id}`}</p>
          {person.phone && (
            <p className="flex items-center gap-1 text-xs text-stone-500">
              <Phone className="h-3 w-3" /> {person.phone}
            </p>
          )}
          {person.email && <p className="text-xs text-stone-500">{person.email}</p>}
        </>
      ) : (
        <p className="text-stone-400">—</p>
      )}
    </div>
  );
}

function People({ complaint }: { complaint: ComplaintCase }) {
  const job = complaint.intervention;

  return (
    <Card title="Mission et personnes">
      <div className="space-y-3">
        <div>
          <MissionLink id={job.id} className="font-semibold text-blue-900 underline-offset-2 hover:underline">
            Mission n° {job.id}
          </MissionLink>
          <p className="text-xs text-stone-500">
            {serviceNameOf(job.serviceType) || "—"} · <Pill tone="info">{statusLabel(job.status)}</Pill>
          </p>
          {job.address && <p className="mt-1 text-xs text-stone-500">{job.address}</p>}
          {job.contactName && (
            <p className="text-xs text-stone-500">
              Contact sur place : {job.contactName}
              {job.contactPhone ? ` · ${job.contactPhone}` : ""}
            </p>
          )}
        </div>
        <Contact title="Auteur de la réclamation" person={complaint.user} />
        <Contact title="Client de la mission" person={job.client} />
        <Contact title="Technicien" person={job.artisan} />
      </div>
    </Card>
  );
}

function Money({ complaint, canFinance }: { complaint: ComplaintCase; canFinance: boolean }) {
  const money = complaint.money;
  const rows = useMemo(
    () => [
      ["Payé par le client", moneyText(money.received, money.currency)],
      ["Déjà rendu", moneyText(money.refunded, money.currency)],
      ["Gardé", moneyText(money.kept, money.currency)],
    ],
    [money],
  );

  return (
    <Card title="Argent de la mission">
      <dl className="space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-stone-500">{label}</dt>
            <dd className="font-semibold tabular-nums text-blue-950">{value}</dd>
          </div>
        ))}
        {money.accepted !== null && (
          <>
            <div className="flex justify-between gap-3 border-t border-stone-100 pt-1">
              <dt className="text-stone-500">Remboursement accepté</dt>
              <dd className="font-semibold tabular-nums text-amber-800">{moneyText(money.accepted, money.currency)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">Reste à rendre</dt>
              <dd className="font-semibold tabular-nums text-amber-800">{moneyText(money.remaining ?? 0, money.currency)}</dd>
            </div>
          </>
        )}
      </dl>

      {money.invoice && (
        <p className="mt-3 text-xs text-stone-500">
          Facture {money.invoice.number} · {invoiceStatusLabel(money.invoice.status)} · {moneyText(money.invoice.toPay, money.currency)} demandés au client
        </p>
      )}

      {money.payments.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase text-stone-400">Paiements remboursables</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {money.payments.map((payment) => (
              <li key={payment.id}>
                n° {payment.id} · {paymentMethodLabel(payment.method)} · {paymentStatusLabel(payment.status)} · {moneyText(payment.refundable, money.currency)} à rendre au plus
                {payment.confirmedAt ? ` · reçu le ${dayText(payment.confirmedAt)}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canFinance && (
        <p className="mt-3 text-xs">
          <Link href={`/dashboard/finance/payments?view=all&job=${complaint.interventionId}`} className="font-medium text-blue-900 underline underline-offset-2">
            Voir les paiements de cette mission
          </Link>
          {complaint.refundDecision === "APPROVED" && (
            <>
              {" · "}
              <Link href="/dashboard/finance/refunds" className="font-medium text-blue-900 underline underline-offset-2">
                Remboursements à faire
              </Link>
            </>
          )}
        </p>
      )}
    </Card>
  );
}
