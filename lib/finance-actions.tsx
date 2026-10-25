import api, { apiErrorMessage } from "@/lib/api";
import {
  CREDIT_REASON_MAX,
  NOTE_MAX,
  PAYMENT_ACTION_LABELS,
  PAYMENT_REASON_MAX,
  CONFIRM_REFERENCE_MAX,
  REMITTANCE_REFERENCE_MAX,
  callApi,
  keyFor,
  moneyText,
  newRequestKey,
  paymentMethodLabel,
  readConfirmation,
  readCreditNote,
  readPayoutPaid,
  readReason,
  readRefundAmount,
  outcomeIsUnknown,
  readRemittance,
  refundPlan,
  routes,
  type ArtisanBalance,
  type CollectAttempts,
  type InvoiceRow,
  type PaymentAction,
  type PaymentRow,
  type PayoutRow,
  type RefundDueRow,
  type RouteSpec,
} from "@/lib/shared";
import { ActionFailure, type ActionSpec } from "@/components/finance/action-dialog";

/** A call of the console gives up after this long: a form that waits for ever would hide whether the money moved. */
const SEND_TIMEOUT_MS = 30_000;

const send = <Answer,>(spec: RouteSpec<Answer>) => callApi((config) => api.request({ ...config, timeout: SEND_TIMEOUT_MS }), spec);

const who = (payment: Pick<PaymentRow, "client" | "interventionId">) => payment.client?.name ?? `la mission n° ${payment.interventionId}`;

/** The form behind each button of a payment row (P2-08). The call is the existing route of the payments; nothing is sent before the button of the form is pressed. */
export function paymentSpec(action: PaymentAction, payment: PaymentRow): ActionSpec<unknown> {
  const amount = moneyText(payment.amount, payment.currency);
  const title = `${PAYMENT_ACTION_LABELS[action]} · paiement n° ${payment.id}`;

  if (action === "confirm") {
    return {
      key: `confirm-${payment.id}`,
      title,
      retrySafe: true,
      intro: (
        <>
          Confirmer que <strong>{amount}</strong> ({paymentMethodLabel(payment.method).toLowerCase()}) de {who(payment)} est bien arrivé. Le paiement sera compté comme reçu.
          {payment.status === "FAILED" && " Il avait été marqué échoué : il sera de nouveau compté."}
          {payment.method === "CASH" && " Ces espèces entrent dans le compte de l’artisan (la commission est à reverser)."}
        </>
      ),
      fields: [
        { id: "reference", label: "Référence du virement ou du reçu", kind: "text", initial: payment.reference ?? "", maxLength: CONFIRM_REFERENCE_MAX },
        { id: "note", label: "Note pour l’équipe", kind: "textarea", maxLength: NOTE_MAX, help: "Visible par l’équipe seulement." },
      ],
      submitLabel: "Confirmer la réception",
      check: (values) => {
        const read = readConfirmation(values.reference, values.note);

        return read.ok ? { ok: true, value: read.body } : read;
      },
      run: async (body) => void (await send(routes.finance.confirmPayment(payment.id, body as { reference?: string; adminNote?: string }))),
    };
  }

  if (action === "refund") {
    return {
      key: `refund-${payment.id}`,
      title,
      intro: (
        <>
          Rendre de l’argent à {who(payment)} sur un paiement de <strong>{amount}</strong>. Il peut encore en revenir <strong>{moneyText(payment.refundable, payment.currency)}</strong>.
        </>
      ),
      fields: [
        { id: "amount", label: "Montant à rembourser (DT)", kind: "amount", initial: String(payment.refundable).replace(".", ","), required: true, help: "Laissez le montant proposé pour tout rembourser." },
        { id: "reason", label: "Motif", kind: "textarea", required: true, maxLength: PAYMENT_REASON_MAX, help: "Gardé sur le paiement." },
      ],
      submitLabel: "Rembourser",
      danger: true,
      check: (values) => {
        const money = readRefundAmount(values.amount, payment.refundable);
        const why = readReason(values.reason);

        if (!money.ok) return money;
        if (!why.ok) return why;

        return { ok: true, value: { amount: money.millimes / 1000, reason: why.reason } };
      },
      run: async (body) => void (await send(routes.finance.refundPayment(payment.id, body as { amount: number; reason: string }))),
    };
  }

  const failing = action === "fail";

  return {
    key: `${action}-${payment.id}`,
    title,
    retrySafe: true,
    intro: (
      <>
        {failing ? "Le paiement de" : "Annuler le paiement de"} <strong>{amount}</strong> {failing ? `de ${who(payment)} n’a pas abouti : il ne sera pas compté.` : `de ${who(payment)} : il ne sera pas compté.`}
        {payment.declared && ` L’artisan avait déclaré avoir encaissé ${moneyText(payment.declared.amount, payment.currency)} : cette déclaration sera retirée de son compte.`}
      </>
    ),
    fields: [{ id: "reason", label: "Motif", kind: "textarea", required: true, maxLength: PAYMENT_REASON_MAX, help: "Gardé sur le paiement." }],
    submitLabel: failing ? "Marquer échoué" : "Annuler le paiement",
    danger: true,
    check: (values) => {
      const why = readReason(values.reason);

      return why.ok ? { ok: true, value: { reason: why.reason } } : why;
    },
    run: async (body) => {
      const reason = body as { reason: string };

      await send(failing ? routes.finance.failPayment(payment.id, reason) : routes.finance.cancelPayment(payment.id, reason));
    },
  };
}

/** The credit note of an invoice: the reason the customer reads, and the amount with VAT (all that is left when none is typed). */
export function creditNoteSpec(invoice: InvoiceRow): ActionSpec<unknown> {
  return {
    key: `credit-${invoice.id}`,
    title: `Émettre un avoir · facture ${invoice.number}`,
    intro: (
      <>
        Facture de <strong>{moneyText(invoice.amountTTC, invoice.currency)}</strong>
        {invoice.credited > 0 ? `, déjà créditée de ${moneyText(invoice.credited, invoice.currency)}` : ""}. Le client verra l’avoir et son motif.
      </>
    ),
    fields: [
      { id: "reason", label: "Motif de l’avoir", kind: "textarea", required: true, maxLength: CREDIT_REASON_MAX, help: "Le client le lira." },
      { id: "amount", label: "Montant TTC de l’avoir (DT)", kind: "amount", help: "Laissez vide pour tout ce qui reste sur la facture." },
    ],
    submitLabel: "Émettre l’avoir",
    danger: true,
    check: (values) => {
      const read = readCreditNote(values.reason, values.amount);

      return read.ok ? { ok: true, value: read.body } : read;
    },
    run: async (body) => void (await send(routes.finance.creditNote(invoice.id, body as { reason: string; amountTTC?: number }))),
  };
}

/**
 * The keys of the remittances that were sent and not answered, by artisan, with the balance the artisan had then. They outlive the
 * form: a person who closes it after a lost answer and opens it again to type the same amount sends the same key, so the server
 * writes one line. If the first try had gone through, the balance on the row is lower, the keys do not apply, and the amount is a
 * new remittance.
 */
const remittanceTries = new Map<number, { balance: number; attempts: CollectAttempts }>();

/**
 * The commission an artisan hands over. One key goes with each amount that was sent: a try whose answer was lost and is sent
 * again writes one line, and another amount never reuses a key (the server refuses that).
 */
export function remittanceSpec(artisan: ArtisanBalance): ActionSpec<unknown> {
  return {
    key: `remit-${artisan.artisanId}`,
    retrySafe: true,
    title: `Enregistrer un versement · ${artisan.name ?? `artisan n° ${artisan.artisanId}`}`,
    intro: (
      <>
        L’artisan doit <strong>{moneyText(artisan.balance, artisan.currency)}</strong> à la plateforme. Le versement vient en déduction de ce solde.
      </>
    ),
    fields: [
      { id: "amount", label: "Montant remis (DT)", kind: "amount", required: true, initial: String(artisan.balance).replace(".", ",") },
      { id: "reference", label: "Numéro du virement ou du reçu", kind: "text", maxLength: REMITTANCE_REFERENCE_MAX },
      { id: "note", label: "Note", kind: "textarea", maxLength: NOTE_MAX },
    ],
    submitLabel: "Enregistrer le versement",
    check: (values) => {
      const read = readRemittance(values.amount, artisan.balance, values.reference, values.note);

      return read.ok ? { ok: true, value: read } : read;
    },
    run: async (value) => {
      const read = value as { millimes: number; body: { amount: number; reference?: string; note?: string } };
      const tried = remittanceTries.get(artisan.artisanId);
      const keyed = keyFor(tried && tried.balance === artisan.balance ? tried.attempts : null, artisan.artisanId, read.millimes, newRequestKey);

      remittanceTries.set(artisan.artisanId, { balance: artisan.balance, attempts: keyed.attempts });

      await send(routes.finance.remit(artisan.artisanId, { ...read.body, requestKey: keyed.key }));
      // Answered: the next remittance, of the same amount or not, is a new one.
      remittanceTries.delete(artisan.artisanId);
    },
  };
}

/** A payout as paid: the reference of the transfer, and the day when it was not today. */
export function payoutPaidSpec(payout: PayoutRow, today: string): ActionSpec<unknown> {
  return {
    key: `paid-${payout.id}`,
    retrySafe: true,
    title: `Marquer le reversement n° ${payout.id} comme payé`,
    intro: (
      <>
        <strong>{moneyText(payout.netAmount, payout.currency)}</strong> pour {payout.artisan?.name ?? `l’artisan n° ${payout.artisanId}`}. Ne le marquez payé qu’une fois le virement fait : cela ne se défait pas.
      </>
    ),
    fields: [
      { id: "reference", label: "Référence du virement", kind: "text", maxLength: CONFIRM_REFERENCE_MAX },
      { id: "day", label: "Jour du paiement", kind: "date", help: "Laissez vide pour aujourd’hui." },
    ],
    submitLabel: "Marquer payé",
    check: (values) => {
      const read = readPayoutPaid(values.reference, values.day, today);

      return read.ok ? { ok: true, value: read.body } : read;
    },
    run: async (body) => void (await send(routes.finance.markPayoutPaid(payout.id, body as { paymentReference?: string; paidAt?: string }))),
  };
}

/**
 * The money a credit note leaves with the customer, given back over the payments of the job: the latest payment first, each as far
 * as it can go (refundPlan). Each step is a refund of its own payment; if one is refused, the ones before it went through, and the
 * sentence says which: the list is loaded again and offers only what is left.
 */
export function refundDueSpec(row: RefundDueRow): ActionSpec<unknown> {
  const steps = refundPlan(row.due, row.payments);
  const numbers = row.creditNotes.map((note) => note.number).join(", ");

  return {
    key: `due-${row.interventionId}`,
    title: `Rembourser · mission n° ${row.interventionId}`,
    intro: (
      <>
        <p>
          {row.client?.name ?? "Le client"} a payé <strong>{moneyText(row.due)}</strong> de plus que ce qui est dû après {numbers ? `l’avoir ${numbers}` : "l’avoir"}.
        </p>
        {steps.length === 0 ? (
          <p className="mt-2 font-medium text-red-700">Aucun paiement de cette mission ne peut plus être remboursé.</p>
        ) : (
          <ul className="mt-2 list-disc pl-5">
            {steps.map((step) => (
              <li key={step.paymentId}>
                Paiement n° {step.paymentId} : {moneyText(step.millimes / 1000)}
              </li>
            ))}
          </ul>
        )}
      </>
    ),
    fields: [{ id: "reason", label: "Motif", kind: "textarea", required: true, maxLength: PAYMENT_REASON_MAX, initial: numbers ? `Avoir ${numbers}` : "", help: "Gardé sur chaque paiement remboursé." }],
    submitLabel: steps.length > 1 ? `Rembourser en ${steps.length} fois` : "Rembourser",
    danger: true,
    check: (values) => {
      const why = readReason(values.reason);

      if (!why.ok) return why;
      if (steps.length === 0) return { ok: false, message: "Aucun paiement de cette mission ne peut plus être remboursé." };

      return { ok: true, value: why.reason };
    },
    run: async (reason) => {
      const made: string[] = [];

      for (const step of steps) {
        try {
          await send(routes.finance.refundPayment(step.paymentId, { amount: step.millimes / 1000, reason: reason as string }));
          made.push(`paiement n° ${step.paymentId} (${moneyText(step.millimes / 1000)})`);
        } catch (failure) {
          const before = made.length > 0 ? `Déjà remboursé : ${made.join(", ")}. ` : "";

          // An answer that never came: the payment may have been refunded. The form is locked until the list has been looked at.
          if (outcomeIsUnknown(failure)) throw new ActionFailure(`${before}Pour le paiement n° ${step.paymentId}, la réponse du serveur n’est pas arrivée : il a peut-être été remboursé. La liste est rechargée : vérifiez-la avant de recommencer.`, true);

          const why = apiErrorMessage(failure, "L’opération a échoué.");

          throw new ActionFailure(made.length > 0 ? `${before}Le paiement n° ${step.paymentId} a été refusé : ${why} La liste est rechargée : elle ne propose plus que le reste.` : why);
        }
      }
    },
  };
}

/** Withdraws a payout that was made by mistake: it is no more to pay, and its jobs can go into another one. A payout that was paid cannot be cancelled. */
export function payoutCancelSpec(payout: PayoutRow): ActionSpec<unknown> {
  return {
    key: `cancel-payout-${payout.id}`,
    retrySafe: true,
    title: `Annuler le reversement n° ${payout.id}`,
    intro: (
      <>
        Le reversement de <strong>{moneyText(payout.netAmount, payout.currency)}</strong> pour {payout.artisan?.name ?? `l’artisan n° ${payout.artisanId}`} ne sera plus à payer. Ses missions pourront entrer dans un autre reversement.
      </>
    ),
    fields: [],
    submitLabel: "Annuler le reversement",
    danger: true,
    check: () => ({ ok: true, value: null }),
    run: async () => void (await send(routes.finance.cancelPayout(payout.id))),
  };
}
