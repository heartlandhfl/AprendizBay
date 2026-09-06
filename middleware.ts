import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth/session-constants";
import { verifySessionCookieEdge } from "@/lib/auth/verify-session-edge";

const ADMIN_PREFIX = "/admin";

function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith(ADMIN_PREFIX)) {
    return true;
  }
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/bookings" ||
    pathname.startsWith("/bookings/") ||
    pathname === "/aulas" ||
    pathname.startsWith("/aulas/") ||
    pathname === "/mensagens" ||
    pathname.startsWith("/mensagens/") ||
    pathname === "/configuracoes" ||
    pathname.startsWith("/configuracoes/") ||
    pathname === "/facilitador" ||
    pathname.startsWith("/facilitador/") ||
    pathname === "/account/setup" ||
    pathname.startsWith("/account/setup/") ||
    pathname === "/tutor/dashboard" ||
    pathname.startsWith("/tutor/dashboard/") ||
    pathname === "/tutor/settings" ||
    pathname.startsWith("/tutor/settings/") ||
    pathname === "/tutor/onboarding" ||
    pathname.startsWith("/tutor/onboarding/") ||
    pathname === "/verify-email" ||
    pathname.startsWith("/verify-email/")
  ) {
    return true;
  }
  return false;
}

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
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  if (!sessionCookie) {
    return loginRedirect(request);
  }

  const session = await verifySessionCookieEdge(sessionCookie);
  if (!session) {
    const response = loginRedirect(request);
    response.cookies.set(AUTH_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  if (pathname.startsWith(ADMIN_PREFIX) && session.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (
    pathname !== "/verify-email" &&
    !pathname.startsWith("/verify-email/") &&
    pathname !== "/account/setup" &&
    !pathname.startsWith("/account/setup/") &&
    session.emailVerified === false &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  return NextResponse.next();
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
