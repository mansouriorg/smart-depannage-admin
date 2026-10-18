"use client";

import * as React from "react";
import { stepIndex, type ChoiceMove } from "@/lib/dispatch";

const KEYS: Record<string, ChoiceMove> = {
  ArrowDown: "next",
  ArrowRight: "next",
  ArrowUp: "previous",
  ArrowLeft: "previous",
  Home: "first",
  End: "last",
};

interface ChoiceGroupProps {
  /** What is being chosen, read out by screen readers. */
  label: string;
  className?: string;
  /** Buttons with role="radio" (the ones that are disabled are skipped). */
  children: React.ReactNode;
}

/**
 * A list of choices (role="radiogroup") that the arrow keys walk through. Moving onto a choice
 * selects it, like a radio button; selecting never does anything else (nothing is sent until the
 * dialog's own confirm button is pressed).
 */
export function ChoiceGroup({ label, className, children }: ChoiceGroupProps) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const move = KEYS[event.key];

    if (!move) return;

    const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([disabled])'));

    if (radios.length === 0) return;

    const target = radios[stepIndex(radios.length, radios.indexOf(document.activeElement as HTMLButtonElement), move)];

    event.preventDefault();
    target.focus();
    target.click();
  };

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className={className}>
      {children}
    </div>
  );
}
