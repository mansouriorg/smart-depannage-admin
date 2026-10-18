"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileWarning, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { fileIdOf } from "@/lib/proofs";
import type { ApplicantDocument } from "@/lib/applications";

interface DocumentViewerProps {
  doc: ApplicantDocument;
}

/**
 * Shows a document of an applicant (P1-11): a picture or a PDF. The file is private, so it is
 * fetched with the login and shown from a local object address; an <img src> or an <iframe src>
 * cannot send the token. The type shown is the one the server stored for the file.
 */
export function DocumentViewer({ doc }: DocumentViewerProps) {
  const fileId = fileIdOf(doc.fileUrl);
  const isPdf = (doc.mimeType ?? "").toLowerCase().includes("pdf");

  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (fileId === null) {
      setFailed(true);

      return;
    }

    let cancelled = false;
    let created: string | null = null;

    setSrc(null);
    setFailed(false);

    api
      .get(`/files/${fileId}/download`, { responseType: "blob" })
      .then((response) => {
        if (cancelled) return;

        const data = response.data as Blob;

        created = URL.createObjectURL(new Blob([data], { type: doc.mimeType || data.type }));
        setSrc(created);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [fileId, doc.mimeType]);

  if (failed) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-4 text-center text-stone-500">
        <FileWarning className="h-6 w-6" />
        <span className="text-sm">Document indisponible.</span>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="h-[55vh] min-h-72 overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
        {isPdf ? (
          <iframe src={src} title={doc.fileName ?? "Document"} className="h-full w-full" />
        ) : (
          <img src={src} alt={doc.fileName ?? "Document"} className="h-full w-full object-contain" />
        )}
      </div>

      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-900 hover:underline"
      >
        <ExternalLink className="h-3 w-3" /> Ouvrir dans un nouvel onglet
      </a>
    </div>
  );
}
