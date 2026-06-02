import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { databaseConfigResponse, getSql, isDatabaseConfigError } from "@/lib/db";

export const runtime = "nodejs";

const RegisterSchema = z.object({
  username: z.string().trim().min(3, "账号至少 3 个字符").max(24, "账号最多 24 个字符")
    .regex(/^[a-zA-Z0-9_]+$/, "账号只能包含字母、数字和下划线"),
  email: z.string().trim().email("邮箱格式不正确").optional().or(z.literal("")),
  password: z.string().min(8, "密码至少 8 位"),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = RegisterSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? "注册信息不正确" }, { status: 400 });
    }

    const username = parsed.data.username.toLowerCase();
    const email = parsed.data.email ? parsed.data.email.toLowerCase() : null;
    const passwordHash = await hashPassword(parsed.data.password);
    const sql = getSql();

    const existing = (await sql`
      select id from users
      where username = ${username}
        or (${email}::text is not null and email = ${email})
      limit 1
    `) as Array<{ id: string }>;

    if (existing.length > 0) {
      return Response.json({ error: "账号或邮箱已被注册" }, { status: 409 });
    }

    const userId = randomUUID();
    await sql`
      insert into users (id, username, email, password_hash, last_login_at)
      values (${userId}, ${username}, ${email}, ${passwordHash}, now())
    `;

    await createSession(userId, request);

    return Response.json({
      user: { id: userId, username, email },
    });
  } catch (err) {
    if (isDatabaseConfigError(err)) return databaseConfigResponse();
    console.error("Register error:", err);
    return Response.json({ error: "注册失败，请稍后再试" }, { status: 500 });
  }
}
