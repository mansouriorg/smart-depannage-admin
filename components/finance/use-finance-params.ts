"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { businessToday, financeParams, lastDays, periodProblem } from "@/lib/shared";

/** The pause after the last key before a search is asked of the server. */
const SEARCH_DELAY_MS = 350;

/**
 * The state of a finance screen lives in the address (P2-08): the period, the tab, the filters, the page. A link from the summary
 * to "payments waiting" is an address; a page reloaded or sent to a colleague shows the same thing; the tabs of the console keep
 * the period of the one before them.
 */
export function useFinanceParams() {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const text = search.toString();

  // The address as the last change left it. Two changes made before the address has caught up (a search that fires as a filter is
  // picked) are built one on the other, not each on the address of the render that made it; a new address wins over it.
  const seen = useRef(text);
  const latest = useRef(text);

  if (seen.current !== text) {
    seen.current = text;
    latest.current = text;
  }

  const get = useCallback((key: string): string => search.get(key)?.trim() ?? "", [search]);

  /** Changes some parameters (an empty value removes one). Anything but a change of page goes back to page 1. */
  const update = useCallback(
    (patch: Record<string, string | number | undefined>) => {
      const next = new URLSearchParams(latest.current);

      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || String(value).trim() === "") next.delete(key);
        else next.set(key, String(value).trim());
      }

      if (!("page" in patch)) next.delete("page");

      const query = next.toString();

      latest.current = query;
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const from = get("from");
  const to = get("to");
  // Read at every render, not once: a page left open past midnight must not keep yesterday as today.
  const today = businessToday();
  const problem = periodProblem(from, to);

  /** An address inside the console: `withPeriod` keeps the period of the screen (what the summary's figures are about), `extra` is the rest. */
  const linkTo = useCallback(
    (path: string, extra: Record<string, string> = {}, withPeriod = true): string => {
      const query = new URLSearchParams({ ...(withPeriod && !periodProblem(from, to) ? (financeParams({ from, to }) as Record<string, string>) : {}), ...extra }).toString();

      return query ? `${path}?${query}` : path;
    },
    [from, to],
  );

  return {
    get,
    update,
    linkTo,
    from,
    to,
    today,
    /** Why the period in the address cannot be asked for, or null. */
    problem,
    /** The period as the routes take it: nothing when it is empty or wrong (the server would refuse it). */
    period: problem ? {} : financeParams({ from, to }),
    /**
     * The period a list is asked for: the one in the address, else the last seven days, written out. The lists are always about the
     * days the bar shows, never about all time (the server lists all time when it is given no period).
     */
    listPeriod: (problem ? {} : from || to ? financeParams({ from, to }) : financeParams(lastDays(today, 7))) as Record<string, string | number>,
    /** "?from=...&to=..." for the links to the other tabs, or "". */
    carry: problem || (!from && !to) ? "" : `?${new URLSearchParams(financeParams({ from, to }) as Record<string, string>).toString()}`,
  };
}

/**
 * The search box of a list: the text typed, and the address that follows it a moment after the last key. A change of the address
 * that this box did not make (a link, the back button) replaces the text; the echo of its own change does not, so that a letter
 * typed while the address catches up is not lost.
 */
export function useSearchBox(search: string, update: (patch: Record<string, string | number | undefined>) => void): [string, (text: string) => void] {
  const [typed, setTyped] = useState(search);
  const pushed = useRef(search);

  useEffect(() => {
    if (search === pushed.current) return;

    pushed.current = search;
    setTyped(search);
  }, [search]);

  useEffect(() => {
    if (typed.trim() === pushed.current) return;

    const timer = window.setTimeout(() => {
      pushed.current = typed.trim();
      update({ search: typed.trim() });
    }, SEARCH_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [typed, update]);

  return [typed, setTyped];
}
