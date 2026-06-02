import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

async function loadLocalEnv() {
  if (process.env.DATABASE_URL) return;

  try {
    const envFile = await readFile(new URL("../.env", import.meta.url), "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (match?.[1]) {
        process.env.DATABASE_URL = match[1].replace(/^["']|["']$/g, "");
        return;
      }
    }
  } catch {
    // The script can still run in Vercel or CI when DATABASE_URL is already set.
  }
}

await loadLocalEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const sql = neon(databaseUrl);
const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");

for (const statement of schema.split(";").map((item) => item.trim()).filter(Boolean)) {
  await sql.query(statement);
}

console.log("Database schema initialized.");
