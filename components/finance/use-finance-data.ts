"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/lib/api";

/**
 * Loads something for a finance screen and loads it again when `key` changes or `reload` is called. A slow answer to an old
 * request never replaces the answer to the newer one, and the previous data stays on screen (dimmed by `busy`) while the next
 * arrives, so a table does not jump to a spinner at every click. A screen that is `busy` shows rows that may be out of date: it
 * does not let them be acted on. When a load fails the old data is dropped, so that an error is never shown above a table that
 * belongs to another filter.
 */
export function useFinanceData<T>(load: () => Promise<T>, key: string, fallback = "Impossible de charger les données.") {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);
  const loadRef = useRef(load);

  loadRef.current = load;

  useEffect(() => {
    const mine = ++latest.current;

    setBusy(true);

    loadRef
      .current()
      .then((answer) => {
        if (latest.current !== mine) return;

        setData(answer);
        setError(null);
      })
      .catch((failure) => {
        if (latest.current !== mine) return;

        setData(null);
        setError(apiErrorMessage(failure, fallback));
      })
      .finally(() => {
        if (latest.current === mine) setBusy(false);
      });
  }, [key, tick, fallback]);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  return { data, error, busy, reload };
}
