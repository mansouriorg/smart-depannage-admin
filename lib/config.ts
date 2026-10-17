/**
 * Single source of truth for where the backend lives (P0-05).
 *
 * NEXT_PUBLIC_API_URL is the REST base URL INCLUDING the "/api" prefix,
 * e.g. https://api.example.tn/api. The WebSocket server lives at the same host
 * WITHOUT that prefix: socket.io treats a path in the URL as a namespace, so
 * passing ".../api" would connect to a namespace that does not exist.
 *
 * Before, the REST client defaulted to :3000/api but the dashboard socket
 * defaulted to :3001, which is this dashboard's own port.
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:3000/api";

/** Host of the backend without the "/api" prefix: sockets and uploaded files. */
export const SERVER_URL = API_URL.replace(/\/api$/, "");

export const SOCKET_URL = SERVER_URL;

export const TOKEN_STORAGE_KEY = "adminToken";
