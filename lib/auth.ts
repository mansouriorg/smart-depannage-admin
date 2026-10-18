import axios from "axios";
import { API_URL } from "@/lib/config";
import { loginUrl } from "@/lib/route-guard";
import { clearSession, getAccessToken, getRefreshToken, loadSession, saveTokens } from "@/lib/session";

/**
 * The session's calls to the server (P1-12): the silent refresh and the sign-out.
 *
 * They use an axios of their own, not the one of lib/api.ts, because that one refreshes on a 401: a
 * refresh that failed with a 401 must not try to refresh itself.
 */
const bare = axios.create({ baseURL: API_URL, headers: { "Content-Type": "application/json" } });

export type RefreshOutcome =
  /** New tokens are stored (by this call, or by another tab a moment ago): the request may be sent again. */
  | "refreshed"
  /** The server refused the refresh token, or there is none: the session is over. */
  | "expired"
  /** The server could not be asked (offline, 5xx): the session may still be good, do not sign out. */
  | "unreachable";

/** How long a refused renewal waits for another tab's answer when the browser has no lock between tabs. */
const OTHER_TAB_GRACE_MS = 300;

type Locks = { request<T>(name: string, callback: () => Promise<T>): Promise<T> };

function locks(): Locks | null {
  const found = typeof navigator !== "undefined" ? (navigator as unknown as { locks?: Locks }).locks : undefined;

  return found && typeof found.request === "function" ? found : null;
}

async function exchange(staleAccessToken: string | null): Promise<RefreshOutcome> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) return "expired";

  // The server gives a refresh token once: it is replaced by the new one. When two tabs fail on the same
  // token, the second must not send the used one; the first has already stored the new tokens.
  const current = getAccessToken();

  if (staleAccessToken && current && current !== staleAccessToken) return "refreshed";

  try {
    const answer = await bare.post("/auth/refresh", { refreshToken }, { timeout: 10000 });
    const tokens = answer.data as { accessToken?: unknown; refreshToken?: unknown } | null;

    if (typeof tokens?.accessToken !== "string" || typeof tokens?.refreshToken !== "string") return "unreachable";

    // The session changed while the server was answering: the person signed out, or another tab got
    // there first. The new tokens must not come back to life in the storage (a signed-out browser
    // would hold a session for seven days); whatever the storage holds now is the truth.
    const stored = getRefreshToken();

    if (stored !== refreshToken) return stored ? "refreshed" : "expired";

    saveTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });

    return "refreshed";
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;

    // 400 (not a token), 401 (used, revoked, expired, account disabled), 403: the refresh token is refused. Anything else is not the token's fault.
    const refused = status === 400 || status === 401 || status === 403;

    // Another tab renewed the session while this one was asking (a browser without the lock between
    // tabs, such as a page served over plain http): the token this call sent is the used one and is
    // refused, the one in the storage is good. The other tab's answer may still be on its way.
    if (refused && !locks()) await new Promise((resolve) => setTimeout(resolve, OTHER_TAB_GRACE_MS));

    const stored = getRefreshToken();

    if (stored !== refreshToken) return stored ? "refreshed" : "expired";

    return refused ? "expired" : "unreachable";
  }
}

let inFlight: Promise<RefreshOutcome> | null = null;

/**
 * Asks for new tokens. Calls that fail together share one refresh (the server rotates the refresh
 * token: a second call with the same token would be refused and would end the session), and the
 * tabs of the browser go one at a time. `staleAccessToken` is the token the failed request was sent with.
 */
export function refreshSession(staleAccessToken: string | null): Promise<RefreshOutcome> {
  if (!inFlight) {
    const run = () => exchange(staleAccessToken);
    const lock = locks();

    inFlight = (lock ? lock.request("sd-refresh", run) : run()).finally(() => {
      inFlight = null;
    });
  }

  return inFlight;
}

let ending = false;

/**
 * The session is over: forget it and go to the sign-in page, with the page the person was on so that
 * they come back to it. The sign-in page tells the person only when there was a session (a screen
 * that was opened signed out has nothing to be told).
 */
export function endSession(options: { expired?: boolean } = {}): void {
  // Several calls fail together: the first one decides where the page goes, the others must not change it.
  if (ending) return;

  const hadSession = options.expired ?? (loadSession() !== null || getAccessToken() !== null);

  clearSession();

  if (typeof window === "undefined" || window.location.pathname === "/") return;

  ending = true;

  window.location.assign(
    loginUrl({ expired: hadSession, next: `${window.location.pathname}${window.location.search}` }),
  );
}

/**
 * Signs out: forgets the session here first (so a server that does not answer cannot leave the person
 * signed in), then asks the server to cancel the refresh token, and goes to the sign-in page.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();

  // The person leaves on purpose: a call that fails a moment later (one that was already on its way)
  // must not send them to the sign-in page with the address of the page they just left.
  ending = true;

  clearSession();

  if (refreshToken) {
    try {
      await bare.post("/auth/logout", { refreshToken }, { timeout: 4000 });
    } catch {
      // The token ends by itself in a few days; the person is signed out here either way.
    }
  }

  if (typeof window !== "undefined") window.location.assign("/");
}

/** Cancels the refresh token of an account the dashboard does not accept (a customer or an artisan who typed their password here). */
export async function cancelLogin(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;

  try {
    await bare.post("/auth/logout", { refreshToken }, { timeout: 4000 });
  } catch {
    // nothing else to do
  }
}

/**
 * The password was changed: the server cancelled every refresh token of the account, this browser's
 * too. Forget the session and go to the sign-in page, which says why.
 */
export function leaveAfterPasswordChange(): void {
  ending = true;

  clearSession();

  if (typeof window !== "undefined") window.location.assign(loginUrl({ passwordChanged: true }));
}
