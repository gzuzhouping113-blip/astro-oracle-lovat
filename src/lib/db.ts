import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | null = null;

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  client ??= neon(databaseUrl);
  return client;
}

export function isDatabaseConfigError(error: unknown) {
  return error instanceof Error && error.message === "DATABASE_URL is not configured";
}

export function databaseConfigResponse() {
  return Response.json(
    { error: "数据库还没有配置，请先设置 DATABASE_URL 并初始化数据库表。" },
    { status: 503 },
  );
}
