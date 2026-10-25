"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import {
  COMPANY_ADDRESS_MAX,
  COMPANY_NAME_MAX,
  COMPANY_PHONE_MAX,
  CONFIRMED_BY_MAX,
  LEGAL_MENTIONS_MAX,
  PAYMENT_METHOD_CHOICES,
  PAYMENT_METHOD_CHOICE_LABELS,
  PAYMENT_TERMS_MAX,
  REGISTRE_COMMERCE_MAX,
  TAX_RATES_MAX,
  callApi,
  companyFormOf,
  confirmationWords,
  dayText,
  invoiceHeaderLines,
  invoicePaymentLine,
  outcomeIsUnknown,
  readCompanyForm,
  routes,
  type CompanyField,
  type CompanyForm,
  type CompanySettings,
} from "@/lib/shared";
import { useStaff } from "@/components/auth/staff-provider";
import { useFinanceData } from "@/components/finance/use-finance-data";
import { ErrorBox, Loading, Notice } from "@/components/finance/ui";
import { cn } from "@/lib/utils";

const INPUT = "w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/50 disabled:bg-stone-50 disabled:text-stone-500";

/** The identity of the company and the rules its invoices follow (P2-09): what the administrators set here is what the invoices print. */
export default function CompanyPage() {
  const { can, user } = useStaff();
  const { data, error, reload } = useFinanceData<CompanySettings>(() => callApi((config) => api.request(config), routes.company.get()), "company", "Impossible de charger les réglages de l’entreprise.");
  // Kept here and not in the form: the form is rebuilt from the settings the server answers after a save, and the word "saved" must outlive that.
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h1 data-dialog-fallback tabIndex={-1} className="text-xl font-bold text-blue-950 outline-none">Entreprise</h1>
        <p className="mt-1 text-sm text-stone-500">Le nom, l’adresse et les numéros fiscaux que les factures impriment, les taux de TVA, les moyens de paiement.</p>
      </div>

      {error && <ErrorBox message={error} onRetry={reload} />}
      {!data && !error ? <Loading /> : data ? <Editor key={`${data.id}-${data.updatedAt ?? ""}`} settings={data} canEdit={can("editCompany")} signedInName={user?.name ?? ""} saved={saved} onSaved={() => {
        setSaved(true);
        reload();
      }} onEdited={() => setSaved(false)} /> : null}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wide text-blue-950">{title}</h2>
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ id, label, error, hint, wide, children }: { id: string; label: string; error?: string; hint?: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn("space-y-1.5", wide && "md:col-span-2")}>
      <label htmlFor={id} className="block text-xs font-bold uppercase text-stone-500">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-stone-500">{hint}</p>}
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function Editor({ settings, canEdit, signedInName, saved, onSaved, onEdited }: { settings: CompanySettings; canEdit: boolean; signedInName: string; saved: boolean; onSaved: () => void; onEdited: () => void }) {
  const [form, setForm] = useState<CompanyForm>(() => companyFormOf(settings, signedInName));
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const read = useMemo(() => readCompanyForm(form, settings), [form, settings]);
  const problems = !read.ok ? read.problems : {};
  const shown = (field: CompanyField) => (attempted ? problems[field] : undefined);
  const changed = read.ok && read.changed;

  const set = <Key extends keyof CompanyForm>(key: Key, value: CompanyForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    onEdited();
    setFailure(null);
  };

  const submit = async () => {
    if (saving || !canEdit) return;

    setAttempted(true);

    if (!read.ok || !read.changed) return;

    setSaving(true);
    setFailure(null);

    try {
      await callApi((config) => api.request({ ...config, timeout: 30_000 }), routes.company.save(read.body));
      onSaved();
    } catch (problem) {
      setFailure(apiErrorMessage(problem, outcomeIsUnknown(problem) ? "La réponse du serveur n’est pas arrivée : les réglages ont peut-être été enregistrés. Rechargez la page pour le vérifier." : "Les réglages n’ont pas pu être enregistrés."));
    } finally {
      setSaving(false);
    }
  };

  const text = (field: keyof CompanyForm & ("companyName" | "companyPhone" | "companyEmail" | "companyAddress" | "matriculeFiscal" | "registreCommerce" | "rib" | "paymentTerms" | "stampDuty" | "defaultEmergencyFee" | "confirmedBy"), max?: number, extra: { inputMode?: "decimal" } = {}) => (
    <input id={`company-${field}`} value={form[field]} maxLength={max} disabled={!canEdit || saving} inputMode={extra.inputMode} autoComplete="off" onChange={(event) => set(field, event.target.value)} className={INPUT} aria-invalid={shown(field) ? true : undefined} />
  );

  const preview = invoiceHeaderLines({
    companyName: form.companyName,
    companyAddress: form.companyAddress,
    matriculeFiscal: form.matriculeFiscal,
    registreCommerce: form.registreCommerce,
    companyPhone: form.companyPhone,
    companyEmail: form.companyEmail,
  });
  const paymentLine = invoicePaymentLine({ rib: form.rib, companyName: form.companyName });

  const rateChoices = form.taxRates.map((rate) => rate.rate).filter((rate, index, all) => rate.trim() !== "" && all.indexOf(rate) === index);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
      className="space-y-4"
    >
      {!canEdit && <Notice>Vous pouvez consulter ces réglages. Seuls les administrateurs les modifient.</Notice>}

      <Section title="Identité" hint="Le nom et les coordonnées de l’entreprise, en tête de chaque facture.">
        <Field id="company-companyName" label="Nom de l’entreprise" error={shown("companyName")}>
          {text("companyName", COMPANY_NAME_MAX)}
        </Field>
        <Field id="company-companyPhone" label="Téléphone" error={shown("companyPhone")}>
          {text("companyPhone", COMPANY_PHONE_MAX)}
        </Field>
        <Field id="company-companyEmail" label="E-mail" error={shown("companyEmail")}>
          {text("companyEmail")}
        </Field>
        <Field id="company-companyAddress" label="Adresse" error={shown("companyAddress")} hint={`${form.companyAddress.trim().length}/${COMPANY_ADDRESS_MAX} caractères`}>
          {text("companyAddress", COMPANY_ADDRESS_MAX)}
        </Field>
      </Section>

      <Section title="Numéros fiscaux et banque" hint="Le matricule fiscal et le registre de commerce sont imprimés en tête des factures et des avoirs ; le RIB, sur les factures qui demandent encore un paiement. Laissez un champ vide pour l’effacer.">
        <Field id="company-matriculeFiscal" label="Matricule fiscal" error={shown("matriculeFiscal")} hint="Exemple : 1234567A/M/000">
          {text("matriculeFiscal", 40)}
        </Field>
        <Field id="company-registreCommerce" label="Registre de commerce" error={shown("registreCommerce")}>
          {text("registreCommerce", REGISTRE_COMMERCE_MAX)}
        </Field>
        <Field id="company-rib" label="RIB" error={shown("rib")} hint="20 chiffres ; les espaces sont acceptés.">
          {text("rib", 40)}
        </Field>
      </Section>

      <Section title="Factures" hint="Les règles que suivent les factures et les avoirs.">
        <Field id="company-stampDuty" label="Timbre fiscal (DT)" error={shown("stampDuty")} hint="Ajouté au total à payer ; 0 s’il n’y en a pas.">
          {text("stampDuty", 12, { inputMode: "decimal" })}
        </Field>
        <Field id="company-paymentTerms" label="Conditions de paiement" error={shown("paymentTerms")} hint="Imprimées sur chaque facture émise ensuite, même une fois payée.">
          {text("paymentTerms", PAYMENT_TERMS_MAX)}
        </Field>
        <Field id="company-invoiceLegalMentions" label="Mentions légales" error={shown("invoiceLegalMentions")} wide hint={`En pied de chaque page. ${form.invoiceLegalMentions.trim().length}/${LEGAL_MENTIONS_MAX} caractères`}>
          <textarea id="company-invoiceLegalMentions" rows={3} value={form.invoiceLegalMentions} maxLength={LEGAL_MENTIONS_MAX} disabled={!canEdit || saving} onChange={(event) => set("invoiceLegalMentions", event.target.value)} className={cn(INPUT, "resize-y")} />
        </Field>
      </Section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-blue-950">Taux de TVA</h2>
        <p className="mt-1 text-xs text-stone-500">Une facture ne prend que l’un de ces taux. Le taux par défaut est celui qui est proposé d’abord.</p>
        {/* `relative`: the hidden label of the last column is positioned, and without a positioned scroll box it would widen the page itself */}
        <div className="relative mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              <tr>
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Nom</th>
                <th className="py-2 pr-3">Taux (%)</th>
                <th className="py-2 text-right">
                  <span className="sr-only">Retirer</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {form.taxRates.map((rate, index) => (
                <tr key={index}>
                  {(["code", "label", "rate"] as const).map((part) => (
                    <td key={part} className="py-1 pr-3">
                      <input
                        aria-label={`${part === "code" ? "Code" : part === "label" ? "Nom" : "Taux"} du taux ${index + 1}`}
                        value={rate[part]}
                        disabled={!canEdit || saving}
                        maxLength={part === "code" ? 32 : part === "label" ? 80 : 6}
                        inputMode={part === "rate" ? "decimal" : undefined}
                        autoComplete="off"
                        onChange={(event) => set("taxRates", form.taxRates.map((entry, at) => (at === index ? { ...entry, [part]: event.target.value } : entry)))}
                        className={INPUT}
                      />
                    </td>
                  ))}
                  <td className="py-1 text-right">
                    <button type="button" disabled={!canEdit || saving || form.taxRates.length <= 1} aria-label={`Retirer le taux ${index + 1}`} onClick={() => set("taxRates", form.taxRates.filter((_, at) => at !== index))} className="rounded-md border border-stone-200 p-2 text-stone-500 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown("taxRates") && (
          <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {shown("taxRates")}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <button type="button" disabled={!canEdit || saving || form.taxRates.length >= TAX_RATES_MAX} onClick={() => set("taxRates", [...form.taxRates, { code: "", label: "", rate: "" }])} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50">
            <Plus className="h-4 w-4" /> Ajouter un taux
          </button>
          <div className="space-y-1.5">
            <label htmlFor="company-defaultTaxRate" className="block text-xs font-bold uppercase text-stone-500">
              Taux par défaut
            </label>
            <select id="company-defaultTaxRate" value={form.defaultTaxRate} disabled={!canEdit || saving} onChange={(event) => set("defaultTaxRate", event.target.value)} className={cn(INPUT, "w-40 bg-white")}>
              {!rateChoices.includes(form.defaultTaxRate) && <option value="">Choisir…</option>}
              {rateChoices.map((rate) => (
                <option key={rate} value={rate}>
                  {rate} %
                </option>
              ))}
            </select>
            {shown("defaultTaxRate") && <p role="alert" className="text-xs text-red-700">{shown("defaultTaxRate")}</p>}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-blue-950">Paiements</h2>
        <fieldset className="mt-3" disabled={!canEdit || saving}>
          <legend className="text-xs font-bold uppercase text-stone-500">Moyens de paiement proposés</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {PAYMENT_METHOD_CHOICES.map((method) => (
              <label key={method} className="inline-flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={form.paymentMethods.includes(method)}
                  onChange={(event) => set("paymentMethods", event.target.checked ? [...form.paymentMethods, method] : form.paymentMethods.filter((entry) => entry !== method))}
                  className="h-4 w-4 rounded border-stone-300"
                />
                {PAYMENT_METHOD_CHOICE_LABELS[method]}
              </label>
            ))}
          </div>
          {shown("paymentMethods") && <p role="alert" className="mt-2 text-xs text-red-700">{shown("paymentMethods")}</p>}
        </fieldset>
        <div className="mt-4 max-w-xs">
          <Field id="company-defaultEmergencyFee" label="Supplément d’urgence par défaut (DT)" error={shown("defaultEmergencyFee")}>
            {text("defaultEmergencyFee", 12, { inputMode: "decimal" })}
          </Field>
        </div>
        <p className="mt-4 text-xs text-stone-500">
          Devise : <strong>{settings.currency}</strong> · Fuseau horaire : <strong>{settings.timezone}</strong> (ces deux réglages ne se changent pas ici : ils fixent la façon dont tous les montants et toutes les dates sont lus).
        </p>
      </section>

      <Section title="Textes" hint="Conditions générales et politique de confidentialité montrées aux clients.">
        <Field id="company-termsAndConditions" label="Conditions générales" error={shown("termsAndConditions")} wide>
          <textarea id="company-termsAndConditions" rows={4} value={form.termsAndConditions} disabled={!canEdit || saving} onChange={(event) => set("termsAndConditions", event.target.value)} className={cn(INPUT, "resize-y")} />
        </Field>
        <Field id="company-privacyPolicy" label="Politique de confidentialité" error={shown("privacyPolicy")} wide>
          <textarea id="company-privacyPolicy" rows={4} value={form.privacyPolicy} disabled={!canEdit || saving} onChange={(event) => set("privacyPolicy", event.target.value)} className={cn(INPUT, "resize-y")} />
        </Field>
      </Section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm" aria-labelledby="company-confirmation">
        <h2 id="company-confirmation" className="text-sm font-bold uppercase tracking-wide text-blue-950">
          Confirmation des mentions
        </h2>
        <p className="mt-1 text-sm text-stone-600">{confirmationWords(settings, dayText)}</p>
        <p className="mt-1 text-xs text-stone-500">Quand le comptable a relu le nom, l’adresse, les numéros fiscaux, les mentions, les taux de TVA et le timbre, un administrateur le confirme ici. Changer l’un de ces éléments retire la confirmation tant qu’elle n’est pas donnée de nouveau.</p>
        {canEdit && (
          <div className="mt-3 space-y-3">
            <label className="flex items-start gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={form.confirm} disabled={saving} onChange={(event) => set("confirm", event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-stone-300" />
              <span>Je confirme que ce qui figure ci-dessus est ce que les factures doivent imprimer.</span>
            </label>
            {form.confirm && (
              <div className="max-w-sm">
                <Field id="company-confirmedBy" label="Confirmé par" error={shown("confirmedBy")}>
                  {text("confirmedBy", CONFIRMED_BY_MAX)}
                </Field>
              </div>
            )}
            {shown("confirm") && <p role="alert" className="text-xs text-red-700">{shown("confirm")}</p>}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5" aria-labelledby="company-preview">
        <h2 id="company-preview" className="text-sm font-bold uppercase tracking-wide text-blue-950">
          Ce que les factures impriment en tête
        </h2>
        {preview.length === 0 ? (
          <p className="mt-2 text-sm text-amber-800">Rien : renseignez au moins le nom et l’adresse de l’entreprise.</p>
        ) : (
          <div className="mt-2 text-sm text-stone-800" data-testid="invoice-preview">
            {preview.map((line, index) => (
              <p key={index} className={index === 0 ? "font-bold" : undefined}>
                {line}
              </p>
            ))}
          </div>
        )}
        {paymentLine && (
          <div className="mt-3 text-sm text-stone-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Sur une facture qui demande encore un paiement</p>
            <p className="mt-1" data-testid="invoice-payment-line">
              {paymentLine}
            </p>
          </div>
        )}
        {changed && <p className="mt-2 text-xs text-stone-500">Aperçu de ce qui est tapé ; les factures ne changent qu’une fois les réglages enregistrés.</p>}
        <p className="mt-2 text-xs text-stone-500" data-testid="issued-keep">Une facture déjà émise garde le nom et l’adresse qu’elle porte : les réglages enregistrés ne servent qu’aux factures suivantes.</p>
      </section>

      {failure && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {failure}
        </div>
      )}
      {attempted && !read.ok && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {read.message}
        </div>
      )}
      {saved && (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> Les réglages sont enregistrés.
        </p>
      )}
      {read.ok && read.unconfirms && <Notice tone="warning">Ce changement retire la confirmation des mentions : les factures émises d’ici là sont repérées « mentions non confirmées » dans Finance, tant que le comptable ne l’a pas donnée de nouveau (cochez la confirmation ci-dessus pour la renouveler).</Notice>}

      {canEdit && (
        <div className="flex justify-end">
          <button type="submit" disabled={saving || (read.ok && !read.changed)} className="inline-flex items-center gap-2 rounded-lg bg-blue-950 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </div>
      )}
    </form>
  );
}
