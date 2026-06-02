import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { mapDreamCard, type DreamCardRow } from "@/lib/dream-db";
import { requireUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const CardSchema = z.object({
  dreamRecordId: z.string().optional().nullable(),
  title: z.string().min(1),
  short_reading: z.string().min(1),
  east_tip: z.string().optional().default(""),
  west_tip: z.string().optional().default(""),
  color_theme: z.enum(["amber", "teal", "indigo", "violet"]).optional().default("violet"),
  symbol_emoji: z.string().optional().default("月"),
  imageUrl: z.string().optional().default(""),
  image_prompt: z.string().optional().default(""),
  emotion: z.string().optional().default(""),
  dreamExcerpt: z.string().optional().default(""),
});

export async function GET() {
  try {
    const user = await requireUser();
    const sql = getSql();
    const rows = (await sql`
      select id, dream_record_id, title, short_reading, east_tip, west_tip, color_theme,
        symbol_emoji, image_url, image_prompt, emotion, dream_excerpt, created_at
      from dream_cards
      where user_id = ${user.id} and deleted_at is null
      order by created_at desc
      limit 20
    `) as DreamCardRow[];

    return Response.json({ cards: rows.map(mapDreamCard) });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Load cards error:", err);
    return Response.json({ error: "读取卡片历史失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const parsed = CardSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "卡片内容不能为空" }, { status: 400 });
    }

    const card = parsed.data;
    const id = randomUUID();
    const sql = getSql();
    const rows = (await sql`
      insert into dream_cards (
        id, user_id, dream_record_id, title, short_reading, east_tip, west_tip,
        color_theme, symbol_emoji, image_url, image_prompt, emotion, dream_excerpt
      )
      values (
        ${id}, ${user.id}, ${card.dreamRecordId ?? null}, ${card.title}, ${card.short_reading},
        ${card.east_tip}, ${card.west_tip}, ${card.color_theme}, ${card.symbol_emoji},
        ${card.imageUrl}, ${card.image_prompt}, ${card.emotion}, ${card.dreamExcerpt}
      )
      returning id, dream_record_id, title, short_reading, east_tip, west_tip, color_theme,
        symbol_emoji, image_url, image_prompt, emotion, dream_excerpt, created_at
    `) as DreamCardRow[];

    return Response.json({ card: mapDreamCard(rows[0]) });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Save card error:", err);
    return Response.json({ error: "保存卡片历史失败" }, { status: 500 });
  }
}
