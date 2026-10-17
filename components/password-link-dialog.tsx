"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, X } from "lucide-react";

interface PasswordLinkDialogProps {
  /** One-time "choose your password" link returned by the API. */
  url: string;
  title?: string;
  onClose: () => void;
}

/**
 * E-mail delivery is not connected yet, so the API hands the one-time link to
 * the administrator, who passes it to the person (message, in person).
 * The link works once and expires after 24 hours: it is a password, do not
 * paste it anywhere public.
 */
export function PasswordLinkDialog({
  url,
  title = "Lien de création du mot de passe",
  onClose,
}: PasswordLinkDialogProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the field below can still be selected by hand.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#D4AF37]/15 p-2 text-[#B69121]">
              <KeyRound className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-blue-950">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-sm text-stone-600">
          L&apos;envoi d&apos;e-mails n&apos;est pas encore actif. Transmettez ce lien à la
          personne : il est valable 24 heures et ne fonctionne qu&apos;une seule fois.
        </p>

        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700"
          />
          <button
            onClick={copy}
            className="flex items-center gap-1 rounded-lg bg-[#D4AF37] px-3 py-2 text-sm font-bold text-white hover:bg-[#B69121]"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copié" : "Copier"}
          </button>
        </div>

        <div className="mt-5 text-right">
          <button
            onClick={onClose}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
