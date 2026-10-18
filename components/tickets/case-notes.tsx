"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import api from "@/lib/api";
import { apiErrorMessage, callApi, routes } from "@/lib/shared";
import { formatDateTime } from "@/lib/proofs";
import { NOTE_MAX, noteDraft, personLabel, type CaseNote } from "@/lib/casefile";

interface CaseNotesProps {
  jobId: number;
  notes: readonly CaseNote[];
  /** Whether this person may write one (the server decides again). */
  canWrite: boolean;
  /** The server stored the note for this job: the page puts it at the top of the list if it still shows that job. */
  onAdded: (note: CaseNote, jobId: number) => void;
}

/**
 * The notes of the team on this job (P1-14): written here, read by the back office only. Nothing is sent
 * until the button is pressed; a blank note is refused on the screen (and by the server), the text
 * stays in the box when the server refuses so that nothing is lost, and a second press while the first
 * is being sent does nothing.
 */
export function CaseNotes({ jobId, notes, canWrite, onAdded }: CaseNotesProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const jobShown = useRef(jobId);

  // Another job: what was typed for the first is not a note for the second.
  useEffect(() => {
    jobShown.current = jobId;
    setText("");
    setError(null);
    setSending(false);
  }, [jobId]);

  // The count is the one the server applies: the note without the spaces around it. Nothing is cut when
  // text is pasted; a note that is too long says so, and is not sent.
  const length = text.trim().length;
  const over = length > NOTE_MAX;

  const submit = async () => {
    if (sending) return;

    const draft = noteDraft(text);

    if (!draft.ok) {
      setError(draft.message);
      return;
    }

    const forJob = jobId;

    setSending(true);
    setError(null);

    try {
      const note = await callApi((config) => api.request(config), routes.admin.addNote<CaseNote>(forJob, draft.body));

      // The person went to another job while the note was being sent: it was stored on the first.
      if (jobShown.current !== forJob) return;

      setText("");
      onAdded(note, forJob);
    } catch (failure) {
      if (jobShown.current !== forJob) return;

      setError(apiErrorMessage(failure, "La note n'a pas pu être enregistrée. Réessayez."));
    } finally {
      if (jobShown.current === forJob) setSending(false);
    }
  };

  return (
    <div>
      <p className="mb-3 flex items-center gap-1 text-xs text-stone-500">
        <Lock className="h-3 w-3" aria-hidden="true" /> Visibles par l'équipe seulement.
      </p>

      {canWrite ? (
        <form
          className="mb-4 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label htmlFor="case-note" className="sr-only">
            Nouvelle note interne
          </label>
          <textarea
            id="case-note"
            value={text}
            rows={3}
            aria-describedby="case-note-count"
            onChange={(event) => {
              setText(event.target.value);
              if (error) setError(null);
            }}
            placeholder="Ex. : le client demande un appel avant 17 h."
            className="w-full resize-y rounded-lg border border-stone-200 bg-white p-3 text-sm text-stone-800 outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/30"
          />
          <div className="flex items-center justify-between gap-3">
            <span id="case-note-count" className={over ? "text-xs font-semibold text-red-600" : "text-xs text-stone-400"}>
              {length}/{NOTE_MAX}
              {over ? " : trop long" : ""}
            </span>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Ajouter la note
            </button>
          </div>
          {error ? (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-pre-line">{error}</span>
            </p>
          ) : null}
        </form>
      ) : null}

      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 p-4 text-center text-sm text-stone-500">Aucune note pour cette demande.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm">
              <p className="whitespace-pre-wrap break-words text-stone-800">{note.content}</p>
              <p className="mt-2 text-xs text-stone-500">
                {personLabel(note.author)} · <time dateTime={note.createdAt}>{formatDateTime(note.createdAt)}</time>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
