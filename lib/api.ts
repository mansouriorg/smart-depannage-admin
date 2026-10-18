import axios from "axios";
import { API_URL, TOKEN_STORAGE_KEY } from "@/lib/config";
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
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 🔒 The access token lives 15 minutes. When the server answers 401 on
// anything but the login call, the session is over: clear it and go back to
// the login page instead of leaving screens that silently stay empty.
// (A silent refresh with the refresh token is planned in P1-12.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const isLoginCall = error?.config?.url?.includes("/auth/login");

    if (status === 401 && !isLoginCall && typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_STORAGE_KEY);

      if (window.location.pathname !== "/") {
        window.location.assign("/");
      }
    }

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
