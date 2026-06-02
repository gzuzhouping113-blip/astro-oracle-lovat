import { createHash, randomBytes, randomUUID } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getSql } from "@/lib/db";

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
}

const SESSION_COOKIE = "astro_oracle_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getRequestIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? null;
}

export async function createSession(userId: string, request: NextRequest) {
  const sql = getSql();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const sessionId = randomUUID();
  const userAgent = request.headers.get("user-agent");
  const ipAddress = getRequestIp(request);

  await sql`
    insert into sessions (id, user_id, token_hash, expires_at, user_agent, ip_address)
    values (
      ${sessionId},
      ${userId},
      ${tokenHash},
      now() + interval '30 days',
      ${userAgent},
      ${ipAddress}
    )
  `;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sql = getSql();
  const rows = await sql`
    select users.id, users.username, users.email
    from sessions
    inner join users on users.id = sessions.user_id
    where sessions.token_hash = ${hashToken(token)}
      and sessions.expires_at > now()
    limit 1
  ` as AuthUser[];

  return rows[0] ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "请先登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
  return user;
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const sql = getSql();
    await sql`delete from sessions where token_hash = ${hashToken(token)}`;
  }

  cookieStore.delete(SESSION_COOKIE);
}

