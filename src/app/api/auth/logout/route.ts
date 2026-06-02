import { deleteCurrentSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  try {
    await deleteCurrentSession();
  } catch (err) {
    console.error("Logout error:", err);
  }
  return Response.json({ ok: true });
}
