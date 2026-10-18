import { staffRoleOf, type StaffRole } from "@/lib/shared";
import { REFRESH_STORAGE_KEY, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from "@/lib/config";

/**
 * The session of the person at the keyboard (P1-12): the two tokens and the account in the
 * browser's storage, and a marker cookie.
 *
 * The cookie exists for one reader: `proxy.ts`, which runs on the server before a page is sent and
 * cannot see the browser's storage. It holds the role and the time the session ends, nothing secret,
 * and it is only used to send a signed-out person to the sign-in page and a person to a page of their
 * own role, before any screen is built. It is written by this page, so anybody can write
 * whatever they like in it: the API checks the token of every call, and refuses what the role may not do.
 */

export const SESSION_COOKIE = "sd_session";

/** What a session lasts when the refresh token does not say (the server gives 7 days). */
export const DEFAULT_SESSION_SECONDS = 7 * 24 * 60 * 60;

/** The account as the server describes it (the part the dashboard uses). */
export interface StaffUser {
  id: number;
  email: string;
  name?: string | null;
  role: string;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  website?: string | null;
  passwordChangedAt?: string | null;
}

/** The part of an account the dashboard keeps (never more than the server's safe profile gives); null for anything that is not an account. */
export function toStaffUser(raw: unknown): StaffUser | null {
  const row = raw as Partial<StaffUser> | null;

  if (!row || typeof row.id !== "number" || typeof row.email !== "string" || typeof row.role !== "string") return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name ?? null,
    role: row.role,
    phone: row.phone ?? null,
    address: row.address ?? null,
    taxId: row.taxId ?? null,
    website: row.website ?? null,
    passwordChangedAt: row.passwordChangedAt ?? null,
  };
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/** The time a JWT ends, in seconds since 1970, or null when it cannot be read. The signature is not checked: the server does that. */
export function jwtExpiry(token: string | null | undefined): number | null {
  if (!token) return null;

  const part = token.split(".")[1];

  if (!part) return null;

  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;

    return typeof exp === "number" && Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
}

/** The marker: `DISPATCHER.1792300000`, the role and the second the session ends. */
export function encodeMarker(role: StaffRole, expiresAtSeconds: number): string {
  return `${role}.${Math.floor(expiresAtSeconds)}`;
}

export type Marker =
  | { state: "none" }
  | { state: "expired" }
  | { state: "ok"; role: StaffRole; expiresAt: number };

/** What the cookie says. Anything that is not a staff role and a time is "none". */
export function readMarker(value: string | null | undefined, nowSeconds: number): Marker {
  const match = /^([A-Z_]{1,20})\.(\d{1,12})$/.exec(value ?? "");
  const role = staffRoleOf(match?.[1]);

  if (!match || !role) return { state: "none" };

  const expiresAt = Number(match[2]);

  return expiresAt > nowSeconds ? { state: "ok", role, expiresAt } : { state: "expired" };
}

/** The text to assign to `document.cookie` to write the marker. */
export function markerCookie(role: StaffRole, expiresAtSeconds: number, secure: boolean): string {
  const until = new Date(expiresAtSeconds * 1000).toUTCString();

  return `${SESSION_COOKIE}=${encodeMarker(role, expiresAtSeconds)}; Path=/; Expires=${until}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

/** The text to assign to `document.cookie` to remove it. */
export function clearedMarkerCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function secureContext(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

function writeMarker(role: StaffRole | null, refreshToken: string | null): void {
  if (typeof document === "undefined") return;

  if (!role) {
    document.cookie = clearedMarkerCookie(secureContext());
    return;
  }

  const ends = jwtExpiry(refreshToken) ?? Math.floor(Date.now() / 1000) + DEFAULT_SESSION_SECONDS;

  document.cookie = markerCookie(role, ends, secureContext());
}

export function getAccessToken(): string | null {
  try {
    return store()?.getItem(TOKEN_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return store()?.getItem(REFRESH_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

/** The account kept at sign-in, or null when there is none or it is not readable. */
export function getStoredUser(): StaffUser | null {
  try {
    const raw = store()?.getItem(USER_STORAGE_KEY);

    return raw ? toStaffUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** The stored session, or null when a token or the account is missing. */
export function loadSession(): (Tokens & { user: StaffUser }) | null {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  const user = getStoredUser();

  return accessToken && refreshToken && user ? { accessToken, refreshToken, user } : null;
}

/**
 * Keeps what the sign-in answered, and writes the marker. Returns the role, or null when the account
 * is not a staff account (nothing is kept then).
 */
export function saveSession(login: Tokens & { user: StaffUser }): StaffRole | null {
  const role = staffRoleOf(login.user.role);

  if (!role) {
    clearSession();
    return null;
  }

  try {
    const storage = store();

    storage?.setItem(TOKEN_STORAGE_KEY, login.accessToken);
    storage?.setItem(REFRESH_STORAGE_KEY, login.refreshToken);
    storage?.setItem(USER_STORAGE_KEY, JSON.stringify(login.user));
  } catch {
    // Storage refused (private mode, quota): there is no session. sessionWasKept() says so to the sign-in page, which tells the person.
  }

  writeMarker(role, login.refreshToken);

  return role;
}

/**
 * True when the browser kept what saveSession wrote: the two tokens and the marker cookie. It is
 * false when storage or cookies are blocked (a private window, a strict setting): the person would
 * be sent to the dashboard and straight back to the sign-in page, so the sign-in page checks it and says why.
 */
export function sessionWasKept(): boolean {
  try {
    const marker = typeof document === "undefined" ? "" : document.cookie;

    return getAccessToken() !== null && getRefreshToken() !== null && marker.split(";").some((part) => part.trim().startsWith(`${SESSION_COOKIE}=`));
  } catch {
    return false;
  }
}

/** The two new tokens after a refresh: the session is extended, the account stays. Nothing is kept when there is no session (it was ended while the call was on its way). */
export function saveTokens(tokens: Tokens): void {
  const user = getStoredUser();

  if (!user) return;

  try {
    const storage = store();

    storage?.setItem(TOKEN_STORAGE_KEY, tokens.accessToken);
    storage?.setItem(REFRESH_STORAGE_KEY, tokens.refreshToken);
  } catch {
    // see saveSession
  }

  writeMarker(staffRoleOf(user.role), tokens.refreshToken);
}

/** The account as the server describes it now (a new name, a new role): the header and the menu follow. */
export function saveUser(user: StaffUser): StaffRole | null {
  const role = staffRoleOf(user.role);

  if (!role) {
    clearSession();
    return null;
  }

  try {
    store()?.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // see saveSession
  }

  writeMarker(role, getRefreshToken());

  return role;
}

/** Forgets everything: the tokens, the account, the marker. */
export function clearSession(): void {
  try {
    const storage = store();

    storage?.removeItem(TOKEN_STORAGE_KEY);
    storage?.removeItem(REFRESH_STORAGE_KEY);
    storage?.removeItem(USER_STORAGE_KEY);
  } catch {
    // nothing to forget
  }

  writeMarker(null, null);
}
