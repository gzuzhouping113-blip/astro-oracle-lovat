import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { mapDreamRecord, type DreamRecordRow } from "@/lib/dream-db";
import { requireUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const RecordSchema = z.object({
  emotion: z.string().min(1),
  dreamText: z.string().trim().min(1),
  realityTrigger: z.string().optional().default(""),
  interpretation: z.any().optional(),
});

function createRecordId() {
  return `DRM-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
}

export async function GET() {
  try {
    const user = await requireUser();
    const sql = getSql();
    const rows = (await sql`
      select id, emotion, dream_text, excerpt, symbols, coordinate_x, coordinate_y, interpretation_json, created_at
      from dream_records
      where user_id = ${user.id} and deleted_at is null
      order by created_at desc
    `) as DreamRecordRow[];

    return Response.json({ records: rows.map(mapDreamRecord) });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Load records error:", err);
    return Response.json({ error: "读取梦境档案失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = RecordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "梦境内容不能为空" }, { status: 400 });
    }

    const { emotion, dreamText, realityTrigger, interpretation } = parsed.data;
    const keywords = Array.isArray(interpretation?.keywords) ? interpretation.keywords : [];
    const symbols = keywords.slice(0, 3);
    const coordinate = interpretation?.coordinate ?? { x: 50, y: 50 };
    const excerpt = dreamText.length > 60 ? `${dreamText.substring(0, 60)}...` : dreamText;
    const id = createRecordId();
    const sql = getSql();

    const rows = (await sql`
      insert into dream_records (
        id, user_id, emotion, dream_text, reality_trigger, excerpt,
        dream_summary, keywords, symbols, mood, coordinate_x, coordinate_y,
        interpretation_json, imagery_json
      )
      values (
        ${id}, ${user.id}, ${emotion}, ${dreamText}, ${realityTrigger || null}, ${excerpt},
        ${interpretation?.dream_summary ?? null},
        cast(${JSON.stringify(keywords)} as jsonb),
        cast(${JSON.stringify(symbols)} as jsonb),
        ${interpretation?.mood ?? null},
        ${Number(coordinate.x ?? 50)},
        ${Number(coordinate.y ?? 50)},
        cast(${JSON.stringify(interpretation ?? null)} as jsonb),
        cast(${JSON.stringify(interpretation?.imagery ?? null)} as jsonb)
      )
      returning id, emotion, dream_text, excerpt, symbols, coordinate_x, coordinate_y, interpretation_json, created_at
    `) as DreamRecordRow[];

    return Response.json({ record: mapDreamRecord(rows[0]) });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Save record error:", err);
    return Response.json({ error: "保存梦境档案失败" }, { status: 500 });
  }
}
