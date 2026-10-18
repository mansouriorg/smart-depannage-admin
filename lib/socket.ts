import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/config";
import { endSession, refreshSession } from "@/lib/auth";
import { getAccessToken, jwtExpiry } from "@/lib/session";

/** A token that ends within this many seconds is renewed before it is sent. */
const RENEW_MARGIN_SECONDS = 30;

/** After the server drops the socket, how many times in a row it is opened again, and how long to wait (grows with each try). */
const MAX_REOPENS = 5;
const REOPEN_DELAY_MS = 2000;

/** How long a connection must hold before the count of reopenings starts again. */
const STABLE_AFTER_MS = 30000;

/**
 * The token to open a connection with: the current one, renewed first when it has ended or is about
 * to (a dashboard that was left open, a laptop that slept). The server checks the token once, when
 * the connection opens, and drops a connection whose token it refuses.
 */
export async function tokenForSocket(nowSeconds: number = Date.now() / 1000): Promise<string | null> {
  const token = getAccessToken();
  const ends = jwtExpiry(token);

  if (!token || ends === null || ends - RENEW_MARGIN_SECONDS > nowSeconds) return token;

  const outcome = await refreshSession(token);

  // The refresh token is refused too: the session is over, here as in the calls to the API.
  if (outcome === "expired") {
    endSession();
    return null;
  }

  return getAccessToken();
}

/**
 * Opens the authenticated live connection (P0-05).
 * The server refuses sockets without a valid access token, so there is
 * nothing to connect to before login: returns null in that case.
 *
 * The token is chosen each time the socket (re)connects (P1-12): the access token lives 15 minutes and
 * is replaced silently, so a connection that opens late, or comes back after a drop, renews it first.
 * socket.io does not come back by itself when the SERVER closes the connection (which is what the
 * server does with a token it refuses), so that case is handled here, a few times, with a growing wait.
 */
export function connectLiveSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  if (!getAccessToken()) return null;

  const socket = io(SOCKET_URL, {
    auth: (give) => {
      void tokenForSocket().then((token) => give({ token }));
    },
    transports: ["websocket", "polling"],
  });

  let reopens = 0;
  let closed = false;
  let reopening: ReturnType<typeof setTimeout> | undefined;
  let stable: ReturnType<typeof setTimeout> | undefined;

  socket.on("connect", () => {
    clearTimeout(stable);
    stable = setTimeout(() => {
      reopens = 0;
    }, STABLE_AFTER_MS);
  });

  socket.on("disconnect", (reason: string) => {
    clearTimeout(stable);

    if (closed || reason !== "io server disconnect" || reopens >= MAX_REOPENS) return;

    reopens += 1;
    reopening = setTimeout(() => {
      if (!closed) socket.connect();
    }, REOPEN_DELAY_MS * reopens);
  });

  // The page leaving (socket.disconnect()) stops any reopening that is waiting.
  const disconnect = socket.disconnect.bind(socket);

  socket.disconnect = () => {
    closed = true;
    clearTimeout(reopening);
    clearTimeout(stable);

    return disconnect();
  };

  return socket;
}
