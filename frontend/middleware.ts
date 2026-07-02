import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(
  request: NextRequest
) {
  const token = request.cookies.get("access_token");
  
  const protectedPaths = ["/dashboard", "/profile", "/documents"];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!token && isProtectedPath) {
    console.log("[Middleware] Redirecting to login - no token");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("expired", "true");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/documents/:path*"],
};