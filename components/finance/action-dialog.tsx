"use client";

import { useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { apiErrorMessage } from "@/lib/api";
import { outcomeIsUnknown } from "@/lib/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface ActionField {
  id: string;
  label: string;
  /** `select`: one of `options`. `checkbox`: the value is "true" when ticked, "" when not (P2-09). */
  kind: "text" | "textarea" | "amount" | "date" | "select" | "checkbox";
  options?: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  help?: string;
  initial?: string;
  maxLength?: number;
  /** Shown next to the label: "obligatoire" or "facultatif". */
  required?: boolean;
  /** Replaces those words when a field is needed only for one choice of the form ("obligatoire pour rejeter"). */
  requirement?: string;
}

/**
 * A failure whose sentence is already written for the person (a refund made in several steps that stopped half way, say).
 * `lock`: what was sent may have gone through, so the form is not offered again until the person has looked at the list.
 */
export class ActionFailure extends Error {
  constructor(
    message: string,
    readonly lock = false,
  ) {
    super(message);
  }
}

/** What the person reads when the answer to a call that cannot be repeated never came. */
/** The words of a lost answer on a call that can be sent again: the form stays open and the button works. */
export const ANSWER_LOST_SAFE = "La réponse du serveur n’est pas arrivée : l’opération a peut-être été faite. Vous pouvez la renvoyer sans risque, sans rien changer ; si elle est déjà faite, le serveur le dira. La liste est rechargée.";

export const ANSWER_LOST = "La réponse du serveur n’est pas arrivée : l’opération a peut-être été faite. La liste est rechargée : vérifiez-la avant de recommencer.";

/** What a button of the console does: the words, the fields, the check of what was typed and the call. */
export interface ActionSpec<Value> {
  /** A new key opens a new form (the fields start again). */
  key: string;
  title: string;
  /** What the person is about to change, in a sentence or two. */
  intro?: ReactNode;
  fields: ActionField[];
  submitLabel: string;
  danger?: boolean;
  /**
   * Whether sending it again after an answer that never came is harmless: the server answers a repeat as it answered the first
   * call, or refuses it with a sentence that says so (cancelling a payment that is already cancelled). A refund is harmless only
   * when it goes with a key (P2-10): without one the server takes the same amount twice. When it is not harmless, the form is locked
   * after such an answer.
   */
  retrySafe?: boolean;
  /** What was typed, checked: the value to send, or the sentence that says what is wrong. */
  check: (values: Record<string, string>) => { ok: true; value: Value } | { ok: false; message: string };
  /** The call. A refusal of the server is shown in the form and the form stays open. It may answer with a sentence that says what came of it (what the provider said). */
  run: (value: Value) => Promise<void | string>;
}

interface ActionDialogProps<Value> {
  spec: ActionSpec<Value> | null;
  onClose: () => void;
  /** The call went through; `outcome` is what it said came of it, when it said. */
  onDone: (outcome?: string) => void;
  /** The server refused: the lists are loaded again so that they tell the truth about what moved meanwhile. */
  onRefused?: () => void;
}

/**
 * One form for every button of the finance console (P2-08): confirm, fail, cancel, refund, credit note, remittance, payout paid.
 * Nothing is sent until the button is pressed; the same press cannot send twice; what the server says when it refuses is shown
 * in the form, and what was typed stays.
 */
export function ActionDialog<Value>({ spec, onClose, onDone, onRefused }: ActionDialogProps<Value>) {
  // While a call is on its way the dialog stays: Escape, the cross and a click beside it would otherwise hide a form whose
  // answer is still to come, and the same button could be pressed again for a second refund.
  const sending = useRef(false);

  return (
    <Dialog open={spec !== null} onOpenChange={(open) => !open && !sending.current && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white text-stone-800 sm:max-w-[480px]">
        {spec && <ActionForm key={spec.key} spec={spec} sending={sending} onClose={onClose} onDone={onDone} onRefused={onRefused} />}
      </DialogContent>
    </Dialog>
  );
}

function ActionForm<Value>({ spec, sending, onClose, onDone, onRefused }: { spec: ActionSpec<Value>; sending: MutableRefObject<boolean> } & Omit<ActionDialogProps<Value>, "spec">) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(spec.fields.map((field) => [field.id, field.initial ?? ""])));
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (sending.current || locked) return;

    const checked = spec.check(values);

    if (!checked.ok) {
      setError(checked.message);
      return;
    }

    sending.current = true;
    setSaving(true);
    setError(null);

    try {
      const outcome = await spec.run(checked.value);

      onDone(typeof outcome === "string" ? outcome : undefined);
    } catch (failure) {
      // An answer that never came, or a server that failed, on a call that cannot be repeated: it may have gone through.
      const lost = !(failure instanceof ActionFailure) && outcomeIsUnknown(failure) && spec.retrySafe !== true;
      const unknown = !(failure instanceof ActionFailure) && outcomeIsUnknown(failure);

      setError(failure instanceof ActionFailure ? failure.message : lost ? ANSWER_LOST : apiErrorMessage(failure, unknown ? ANSWER_LOST_SAFE : "L’opération a échoué."));
      if (lost || (failure instanceof ActionFailure && failure.lock)) setLocked(true);
      onRefused?.();
    } finally {
      sending.current = false;
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
    >
      <DialogHeader>
        <DialogTitle className="pr-6 text-blue-950">{spec.title}</DialogTitle>
      </DialogHeader>

      {spec.intro && <div className="mt-3 text-sm text-stone-600">{spec.intro}</div>}

      <div className="mt-4 space-y-4">
        {spec.fields.map((field) => {
          const id = `finance-action-${field.id}`;
          const common = {
            id,
            value: values[field.id] ?? "",
            disabled: saving || locked,
            maxLength: field.maxLength,
            placeholder: field.placeholder,
            "aria-describedby": field.help ? `${id}-help` : undefined,
            onChange: (event: { target: { value: string } }) => {
              setValues((current) => ({ ...current, [field.id]: event.target.value }));
              setError(null);
            },
            className: "w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/50 disabled:bg-stone-50",
          };

          if (field.kind === "checkbox") {
            return (
              <div key={field.id} className="space-y-1.5">
                <label htmlFor={id} className="flex items-start gap-2 text-sm text-stone-700">
                  <input
                    id={id}
                    type="checkbox"
                    checked={values[field.id] === "true"}
                    disabled={saving || locked}
                    aria-describedby={field.help ? `${id}-help` : undefined}
                    onChange={(event) => {
                      setValues((current) => ({ ...current, [field.id]: event.target.checked ? "true" : "" }));
                      setError(null);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-stone-300"
                  />
                  <span>{field.label}</span>
                </label>
                {field.help && (
                  <p id={`${id}-help`} className="pl-6 text-xs text-stone-500">
                    {field.help}
                  </p>
                )}
              </div>
            );
          }

          return (
            <div key={field.id} className="space-y-1.5">
              <label htmlFor={id} className="flex items-center justify-between text-xs font-bold uppercase text-stone-500">
                <span>{field.label}</span>
                <span className="font-medium normal-case text-stone-400">{field.requirement ?? (field.required ? "obligatoire" : "facultatif")}</span>
              </label>
              {field.kind === "textarea" ? (
                <textarea rows={3} {...common} className={cn(common.className, "resize-none")} />
              ) : field.kind === "select" ? (
                <select {...common} className={cn(common.className, "bg-white")}>
                  {!field.required && <option value="">—</option>}
                  {field.required && (values[field.id] ?? "") === "" && <option value="">Choisir…</option>}
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input type={field.kind === "date" ? "date" : "text"} inputMode={field.kind === "amount" ? "decimal" : undefined} autoComplete="off" {...common} />
              )}
              {field.help && (
                <p id={`${id}-help`} className="text-xs text-stone-500">
                  {field.help}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50">
          Fermer
        </button>
        <button
          type="submit"
          disabled={saving || locked}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50",
            spec.danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-950 hover:bg-blue-900",
          )}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {spec.submitLabel}
        </button>
      </div>
    </form>
  );
}
