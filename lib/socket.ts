import { io, type Socket } from "socket.io-client";
import { SOCKET_URL, TOKEN_STORAGE_KEY } from "@/lib/config";

/**
 * Opens the authenticated live connection (P0-05).
 * The server refuses sockets without a valid access token, so there is
 * nothing to connect to before login: returns null in that case.
 */
export function connectLiveSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (!token) return null;

  return io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
  });
}
