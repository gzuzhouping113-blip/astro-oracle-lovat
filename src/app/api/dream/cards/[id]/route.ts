import { getSql } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const sql = getSql();

    await sql`
      update dream_cards
      set deleted_at = now(), updated_at = now()
      where id = ${id} and user_id = ${user.id}
    `;

    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Delete card error:", err);
    return Response.json({ error: "删除梦境卡片失败" }, { status: 500 });
  }
}
