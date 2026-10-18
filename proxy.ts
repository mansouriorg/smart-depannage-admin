import { NextResponse, type NextRequest } from "next/server";
import { guardDecision } from "@/lib/route-guard";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * The route guard of the dashboard (P1-12). The ticket calls it middleware.ts: Next 16 renamed
 * that file to proxy.ts, and this is the same thing.
 *
 * It only reads the marker cookie that the sign-in page writes (see lib/session.ts), so it sends a
 * signed-out person to the sign-in page, and a person to a page of their own role, before any screen
 * is built. It is not what keeps data safe: the API checks the token and the role of every call.
 */
export function proxy(request: NextRequest) {
  const decision = guardDecision({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    cookie: request.cookies.get(SESSION_COOKIE)?.value,
    nowSeconds: Math.floor(Date.now() / 1000),
  });

  if (decision.kind === "redirect") {
    return NextResponse.redirect(new URL(decision.to, request.url));
  }

  return NextResponse.next();
}

// The sign-in page and the dashboard; not the assets of Next, nor the files of the public folder.
export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
