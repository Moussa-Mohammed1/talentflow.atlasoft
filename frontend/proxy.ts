import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPublicPath } from "@/lib/auth-routes";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static asset files safely
  if (pathname.includes(".")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("access_token")?.value;

  if (pathname === "/") {
    const target = token ? "/dashboard" : "/login";
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (!token && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|static/|fonts/).*)",
  ],
};
