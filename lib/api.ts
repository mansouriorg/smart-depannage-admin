import axios, { type InternalAxiosRequestConfig } from "axios";
import { API_URL } from "@/lib/config";
import { endSession, refreshSession } from "@/lib/auth";
import { getAccessToken } from "@/lib/session";
import { pageItems, type Paginated } from "@/lib/shared";

// One sentence for a refused request: written once, in the shared package (P1-09).
export { apiErrorMessage } from "@/lib/shared";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔒 Add the token to every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/** The calls that answer 401 for a reason of their own (a wrong password), and must not refresh anything. */
const AUTH_CALL = /\/auth\/(login|refresh|logout)(\?|$)/;

type Retryable = InternalAxiosRequestConfig & { _afterRefresh?: boolean };

function tokenOf(config: InternalAxiosRequestConfig): string | null {
  const header = String(config.headers?.Authorization ?? "");

  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
}

// 🔒 The access token lives 15 minutes (P1-12). When the server answers 401, the refresh token (7 days)
// is exchanged for a new pair, once for all the calls that failed together, and the call is sent again.
// The session is over, and the person goes back to the sign-in page, only when the server itself
// refuses the refresh token; a server that cannot be reached leaves the person where they are.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as Retryable | undefined;

    if (error?.response?.status !== 401 || !config || typeof window === "undefined") return Promise.reject(error);
    if (AUTH_CALL.test(config.url ?? "") || config._afterRefresh) return Promise.reject(error);

    const outcome = await refreshSession(tokenOf(config));

    if (outcome === "refreshed") {
      config._afterRefresh = true;
      config.headers.Authorization = `Bearer ${getAccessToken()}`;

      return api.request(config);
    }

    if (outcome === "expired") endSession();

    return Promise.reject(error);
  },
);

/**
 * List endpoints of the new modules answer { data: [...], meta: {...} } while
 * the legacy ones answer a bare array. Accept both, always return an array.
 * (The page type and the rows come from the shared package, P1-09: a screen that
 * knows what it fetches writes `pageItems(response.data)` after `api.get<Paginated<Row>>`.)
 */
export function unwrapList<T = unknown>(payload: Paginated<T> | readonly T[] | null | undefined): T[] {
  return pageItems<T>(payload);
}

export default api;
