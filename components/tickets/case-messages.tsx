"use client";

import { Lock, Paperclip } from "lucide-react";
import { formatDateTime } from "@/lib/proofs";
import { attachmentsOf, chatLabel, chatTone, messageText, personLabel, type CaseMessage, type ChatTone } from "@/lib/casefile";
import { AuthenticatedImage } from "@/components/tickets/authenticated-image";
import { cn } from "@/lib/utils";

interface CaseMessagesProps {
  messages: readonly CaseMessage[];
}

const TONE_CLASS: Record<ChatTone, string> = {
  parties: "bg-sky-50 text-sky-700 border-sky-200",
  support: "bg-violet-50 text-violet-700 border-violet-200",
  team: "bg-amber-50 text-amber-800 border-amber-200",
};

/**
 * Every chat of the job, in the order the messages were written (P1-14): the one between the
 * customer and the technician, the two with the support, and the team's own. Each message says which
 * chat it belongs to, so that nobody reads a private line as something the customer saw. A message that
 * was deleted is still listed, without its words. A picture sent in a chat is fetched with the staff
 * session like the other private photos.
 */
export function CaseMessages({ messages }: CaseMessagesProps) {
  if (messages.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-4 text-center text-sm text-stone-500">
        Aucun message n'a été échangé pour cette demande.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {messages.map((message) => {
        const tone = chatTone(String(message.audience));
        const text = messageText(message);
        const { images, others } = attachmentsOf(message);

        return (
          <li key={message.id} className={cn("rounded-lg border p-3 text-sm", message.deleted ? "border-stone-200 bg-stone-100/70" : "border-stone-100 bg-stone-50")}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="font-semibold text-blue-950">{personLabel(message.sender)}</p>
              <time dateTime={message.createdAt} className="text-xs text-stone-500">
                {formatDateTime(message.createdAt)}
              </time>
            </div>

            <p className="mt-1">
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", TONE_CLASS[tone])}>
                {tone === "team" ? <Lock className="h-3 w-3" aria-hidden="true" /> : null}
                {chatLabel(String(message.audience))}
              </span>
            </p>

            {text ? (
              <p className={cn("mt-2 whitespace-pre-wrap break-words", message.deleted ? "italic text-stone-400" : "text-stone-700")}>{text}</p>
            ) : null}

            {images.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((url, index) => (
                  <div key={`${url}-${index}`} className="h-24 w-24 overflow-hidden rounded-md border border-stone-200 bg-white">
                    <AuthenticatedImage url={url} alt={`Pièce jointe ${index + 1} du message ${message.id}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}

            {others > 0 ? (
              <p className="mt-2 flex items-center gap-1 text-xs text-stone-500">
                <Paperclip className="h-3 w-3" aria-hidden="true" />
                {others === 1 ? "1 pièce jointe qui ne peut pas être affichée ici" : `${others} pièces jointes qui ne peuvent pas être affichées ici`}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
