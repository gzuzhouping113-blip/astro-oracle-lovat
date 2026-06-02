import type { DreamRecord } from "@/lib/dream-types";

export interface DreamRecordRow {
  id: string;
  emotion: string;
  dream_text: string;
  excerpt: string;
  symbols: string[] | null;
  coordinate_x: string | number | null;
  coordinate_y: string | number | null;
  interpretation_json: DreamRecord["interpretation"] | null;
  created_at: string | Date;
}

export interface DreamCardData {
  id?: string;
  dreamRecordId?: string | null;
  title: string;
  short_reading: string;
  east_tip: string;
  west_tip: string;
  color_theme: "amber" | "teal" | "indigo" | "violet";
  symbol_emoji: string;
  imageUrl: string;
  image_prompt?: string;
  createdAt: number;
  emotion: string;
  dreamExcerpt: string;
}

export interface DreamCardRow {
  id: string;
  dream_record_id: string | null;
  title: string;
  short_reading: string;
  east_tip: string | null;
  west_tip: string | null;
  color_theme: "amber" | "teal" | "indigo" | "violet" | null;
  symbol_emoji: string | null;
  image_url: string | null;
  image_prompt: string | null;
  emotion: string | null;
  dream_excerpt: string | null;
  created_at: string | Date;
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function mapDreamRecord(row: DreamRecordRow): DreamRecord {
  return {
    id: row.id,
    date: formatDate(row.created_at),
    emotion: row.emotion,
    excerpt: row.excerpt,
    symbols: row.symbols ?? [],
    coord: {
      x: Number(row.coordinate_x ?? 50),
      y: Number(row.coordinate_y ?? 50),
    },
    fullText: row.dream_text,
    interpretation: row.interpretation_json ?? undefined,
  };
}

export function mapDreamCard(row: DreamCardRow): DreamCardData {
  return {
    id: row.id,
    dreamRecordId: row.dream_record_id,
    title: row.title,
    short_reading: row.short_reading,
    east_tip: row.east_tip ?? "",
    west_tip: row.west_tip ?? "",
    color_theme: row.color_theme ?? "violet",
    symbol_emoji: row.symbol_emoji ?? "月",
    imageUrl: row.image_url ?? "",
    image_prompt: row.image_prompt ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    emotion: row.emotion ?? "",
    dreamExcerpt: row.dream_excerpt ?? "",
  };
}
