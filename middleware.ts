import { NextRequest, NextResponse } from "next/server";

const LOGIN_PATH = "/management/login";
const SESSION_COOKIE = "mgmt_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login page and auth API through
  if (pathname === LOGIN_PATH || pathname.startsWith("/api/management/auth")) {
    return NextResponse.next();
  }

  const session = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.MANAGEMENT_SESSION_SECRET;

  if (!secret || !session || session !== secret) {
    const loginUrl = new URL(LOGIN_PATH, req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/management/:path*"],
};
