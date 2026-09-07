import { NextResponse, type NextRequest } from "next/server";
import { resolveMiddlewareDecision } from "@/lib/auth/resolve-middleware-action";
import { AUTH_SESSION_COOKIE } from "@/lib/auth/session-constants";
import { verifySessionCookieEdge } from "@/lib/auth/verify-session-edge";

function loginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  const pathname = request.nextUrl.pathname;
  if (pathname !== "/") {
    loginUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
  }
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(AUTH_SESSION_COOKIE)?.value ?? "";
  const session = sessionCookie ? await verifySessionCookieEdge(sessionCookie) : null;

  const decision = resolveMiddlewareDecision({
    pathname,
    hasSessionCookie: Boolean(sessionCookie),
    session,
  });

  if (decision.action === "allow") {
    return NextResponse.next();
  }

  if (decision.action === "redirect") {
    return NextResponse.redirect(new URL(decision.pathname, request.url));
  }

  const response = loginRedirect(request);
  if (decision.clearSession) {
    response.cookies.set(AUTH_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  }
  return response;
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/bookings",
    "/bookings/:path*",
    "/aulas",
    "/aulas/:path*",
    "/mensagens",
    "/mensagens/:path*",
    "/configuracoes",
    "/configuracoes/:path*",
    "/facilitador",
    "/facilitador/:path*",
    "/account/setup",
    "/account/setup/:path*",
    "/tutor/dashboard",
    "/tutor/dashboard/:path*",
    "/tutor/settings",
    "/tutor/settings/:path*",
    "/tutor/onboarding",
    "/tutor/onboarding/:path*",
    "/verify-email",
    "/verify-email/:path*",
  ],
};
