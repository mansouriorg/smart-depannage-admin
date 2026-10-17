import axios from "axios";
import { API_URL, TOKEN_STORAGE_KEY } from "@/lib/config";

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
 */
export function unwrapList<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];

  const inner = (payload as { data?: unknown } | null | undefined)?.data;

  return Array.isArray(inner) ? (inner as T[]) : [];
}

export default api;
