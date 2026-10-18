import { canOpenDashboardPath, dashboardHomeFor, isDashboardPath, normalizeDashboardPath } from "@/lib/shared";
import { readMarker } from "@/lib/session";

/**
 * What `proxy.ts` does with a request (P1-12), as a function of the address and the marker cookie.
 * Kept apart from Next so that it can be tested without a server.
 */
export type GuardDecision = { kind: "pass" } | { kind: "redirect"; to: string };

const LOGIN = "/";

/** The sign-in page, with where to come back to and why the person is there. */
export function loginUrl(options: { next?: string | null; expired?: boolean; passwordChanged?: boolean } = {}): string {
  const query: string[] = [];

  if (options.expired) query.push("reason=expired");
  if (options.passwordChanged) query.push("reason=password");
  if (options.next) query.push(`next=${encodeURIComponent(options.next)}`);

  return query.length ? `${LOGIN}?${query.join("&")}` : LOGIN;
}

/** The query without the parameter Next adds to its own data requests (`_rsc`): it is not part of the address the person wanted. */
function ownQuery(search: string | undefined): string {
  if (!search || !/(^|[?&])_rsc=/.test(search)) return search ?? "";

  const params = new URLSearchParams(search);

  params.delete("_rsc");

  const text = params.toString();

  return text ? `?${text}` : "";
}

export function guardDecision(input: { pathname: string; search?: string; cookie?: string | null; nowSeconds: number }): GuardDecision {
  const marker = readMarker(input.cookie, input.nowSeconds);
  const onLoginPage = normalizeDashboardPath(input.pathname) === LOGIN;

  if (onLoginPage) {
    const query = new URLSearchParams(input.search ?? "");

    // The pages that tell a person the session ended (it expired, or the password was changed) always
    // open, whatever the cookie says: a cookie that could not be removed must not make the dashboard
    // and the sign-in page send each other around.
    if (query.get("reason") === "expired" || query.get("reason") === "password") return { kind: "pass" };

    // Somebody who is signed in does not need the sign-in page: where they were headed, or the first page of their menu.
    return marker.state === "ok" ? { kind: "redirect", to: landingPath(marker.role, query.get("next")) } : { kind: "pass" };
  }

  if (!isDashboardPath(input.pathname)) return { kind: "pass" };

  if (marker.state !== "ok") {
    return { kind: "redirect", to: loginUrl({ next: `${input.pathname}${ownQuery(input.search)}`, expired: marker.state === "expired" }) };
  }

  // A page of another role: back to the first page of the menu of this one (which it may always open).
  return canOpenDashboardPath(marker.role, input.pathname) ? { kind: "pass" } : { kind: "redirect", to: dashboardHomeFor(marker.role) };
}

/**
 * Where to go after signing in. Only a page of the dashboard that this role may open, written as a
 * path: an address with a host ("//evil.tn", "https://evil.tn") or a backslash is refused, so the
 * sign-in page cannot be used to send somebody elsewhere.
 */
export function safeNext(raw: string | null | undefined, role: string | null | undefined): string | null {
  if (!raw || raw.length > 300 || !raw.startsWith("/") || raw.startsWith("//") || /[\\\u0000-\u001f]/.test(raw)) return null;

  return isDashboardPath(raw) && canOpenDashboardPath(role, raw) ? raw : null;
}

/** Where a person who just signed in goes: where they were headed if they may open it, else their home page. */
export function landingPath(role: string | null | undefined, next: string | null | undefined): string {
  return safeNext(next, role) ?? dashboardHomeFor(role);
}
