"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { filenameFromDisposition, type RouteSpec } from "@/lib/shared";

/** The file the server builds for the same filters as the table; the person gets it as a download with the name the server gave it. */
export function DownloadButton({ route, fallbackName, children, compact = false, label }: { route: RouteSpec<string>; fallbackName: string; children: React.ReactNode; compact?: boolean; /** What a screen reader says: several buttons that read "PDF" are told apart by it. */ label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const response = await api.get(route.url, { params: route.params, responseType: "blob" });
      const name = filenameFromDisposition(response.headers["content-disposition"], fallbackName);
      const href = URL.createObjectURL(response.data as Blob);
      const link = document.createElement("a");

      link.href = href;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch (failure) {
      setError(await fileErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={compact ? "inline-flex flex-col items-start gap-0.5" : "flex flex-col items-end gap-1"}>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        aria-label={label}
        className={
          compact
            ? "inline-flex items-center gap-1 text-xs font-medium text-blue-900 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            : "inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:border-[#D4AF37]/60 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />}
        {children}
      </button>
      {error && (
        <p role="alert" className={compact ? "max-w-[200px] text-xs text-red-700" : "max-w-xs text-right text-xs text-red-700"}>
          {error}
        </p>
      )}
    </div>
  );
}

/** A refused download answers a blob, not JSON: the sentence of the server is read out of it. */
async function fileErrorMessage(failure: unknown): Promise<string> {
  const data = (failure as { response?: { data?: unknown } })?.response?.data;

  if (data instanceof Blob) {
    try {
      const body = JSON.parse(await data.text()) as { message?: unknown };
      const message = Array.isArray(body.message) ? body.message.join(" ") : body.message;

      if (typeof message === "string" && message.trim() !== "") return message;
    } catch {
      // not JSON: the generic sentence below
    }

    return "Le téléchargement a échoué.";
  }

  return apiErrorMessage(failure, "Le téléchargement a échoué.");
}
