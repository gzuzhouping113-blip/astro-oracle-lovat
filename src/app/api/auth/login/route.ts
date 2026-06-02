import { NextRequest } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { databaseConfigResponse, getSql, isDatabaseConfigError } from "@/lib/db";

export const runtime = "nodejs";

const LoginSchema = z.object({
  identifier: z.string().trim().min(1, "请输入账号或邮箱"),
  password: z.string().min(1, "请输入密码"),
});

interface LoginRow {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = LoginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "登录信息不正确" }, { status: 400 });
    }

    const identifier = parsed.data.identifier.toLowerCase();
    const sql = getSql();
    const rows = await sql`
      select id, username, email, password_hash
      from users
      where username = ${identifier} or email = ${identifier}
      limit 1
    ` as LoginRow[];

    const user = rows[0];
    if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
      return Response.json({ error: "账号或密码错误" }, { status: 401 });
    }

    await sql`update users set last_login_at = now(), updated_at = now() where id = ${user.id}`;
    await createSession(user.id, request);

    return Response.json({
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    if (isDatabaseConfigError(err)) return databaseConfigResponse();
    console.error("Login error:", err);
    return Response.json({ error: "登录失败，请稍后再试" }, { status: 500 });
  }
}
