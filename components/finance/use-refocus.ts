"use client";

import { useCallback, useEffect, useRef } from "react";

const inForm = (target: EventTarget | null): boolean => target instanceof Element && target.closest('[role="dialog"]') !== null;

/**
 * After an action, the keyboard focus must not be lost. The form gives it back to the button that opened it when it closes, but the
 * page is loaded again meanwhile (its buttons are switched off while it loads, which takes the focus away), and the button may be
 * gone: the complaint is closed and "Résoudre" with it, the review left its tab.
 *
 * Once the page has loaded again, if the focus is nowhere it goes back to the button that opened the form when that button is still
 * there, and otherwise to the title of the page (the element marked `data-dialog-fallback`), so that a keyboard user does not start
 * again from the top.
 *
 * The wish is dropped as soon as the person touches the page themselves (a click, a key): the focus is theirs then.
 *
 * Returns what to call when an action went through.
 */
export function useRefocusAfterAction(loaded: unknown, busy: boolean): () => void {
  const wanted = useRef(false);
  const opener = useRef<HTMLElement | null>(null);

  // The last thing that had the focus, or was pressed, outside a form: the button that opens the next one.
  useEffect(() => {
    const remember = (target: EventTarget | null) => {
      if (target instanceof HTMLElement && !inForm(target)) opener.current = target;
    };
    const onFocus = (event: FocusEvent) => remember(event.target);
    const onClick = (event: MouseEvent) => remember(event.target instanceof Element ? event.target.closest("button") : null);

    document.addEventListener("focusin", onFocus);
    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (!wanted.current || busy) return;

    const active = document.activeElement;

    // Something has the focus: nothing to do. If it is a button of the page, the wish is over (it would otherwise wait for a later
    // load); if it is still inside the form that is closing, the focus is about to be given back, so the wish waits.
    if (active && active !== document.body && active.isConnected) {
      if (!inForm(active)) wanted.current = false;
      return;
    }

    wanted.current = false;

    const back = opener.current;
    const target = back && back.isConnected && !(back instanceof HTMLButtonElement && back.disabled) ? back : document.querySelector<HTMLElement>("[data-dialog-fallback]");

    target?.focus();
  }, [loaded, busy]);

  return useCallback(() => {
    wanted.current = true;

    const release = () => {
      wanted.current = false;
      document.removeEventListener("pointerdown", release, true);
      document.removeEventListener("keydown", release, true);
    };

    document.addEventListener("pointerdown", release, true);
    document.addEventListener("keydown", release, true);
  }, []);
}
