import { getCurrentUser } from "@/lib/auth/session";
import { isDatabaseConfigError } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return Response.json({ user });
  } catch (err) {
    if (isDatabaseConfigError(err)) {
      return Response.json({ user: null });
    }
    console.error("Read current user error:", err);
    return Response.json({ user: null });
  }
}
