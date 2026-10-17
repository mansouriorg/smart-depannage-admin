"use client";

import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { fileIdOf, plainPhotoSrc } from "@/lib/proofs";

interface AuthenticatedImageProps {
  /** The address stored on the job or on the capture. */
  url: string | null | undefined;
  alt: string;
  className?: string;
}

/**
 * A proof photo is private since P1-07: the server only gives it to a logged-in person, so an
 * <img src> (which cannot send the token) would show a broken picture. The photo is fetched
 * with the token, shown from a local object address, and clicking it opens it full size.
 * An address that is not behind the login (another site, the old public folder) is shown as is.
 */
export function AuthenticatedImage({ url, alt, className }: AuthenticatedImageProps) {
  const fileId = fileIdOf(url);
  const plain = fileId === null ? plainPhotoSrc(url) : null;

  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (fileId === null) return;

    let cancelled = false;
    let created: string | null = null;

    setBlobSrc(null);
    setFailed(false);

    api
      .get(`/files/${fileId}/download`, { responseType: "blob" })
      .then((response) => {
        if (cancelled) return;

        created = URL.createObjectURL(response.data as Blob);
        setBlobSrc(created);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [fileId]);

  const src = fileId === null ? plain : blobSrc;

  if (failed || (fileId === null && !plain)) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-stone-400">
        <ImageOff className="h-6 w-6" />
        <span className="text-xs">Photo indisponible</span>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center text-stone-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <a href={src} target="_blank" rel="noreferrer" title="Ouvrir en grand" className="block h-full w-full">
      <img src={src} alt={alt} className={className ?? "h-full w-full object-contain"} />
    </a>
  );
}
