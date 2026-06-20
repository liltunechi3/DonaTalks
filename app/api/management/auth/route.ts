import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "mgmt_session";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const validUser = process.env.MANAGEMENT_USERNAME;
  const validPass = process.env.MANAGEMENT_PASSWORD;
  const secret = process.env.MANAGEMENT_SESSION_SECRET;

  if (!validUser || !validPass || !secret) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  if (username !== validUser || password !== validPass) {
    return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, secret, COOKIE_OPTS);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
  return res;
}
