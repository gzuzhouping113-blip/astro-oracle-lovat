import { NextRequest } from "next/server";
import { generateImage } from "@/lib/ai-image";
import { generateText } from "@/lib/ai-text";

export const runtime = "nodejs";
export const maxDuration = 60;

type CardTheme = "amber" | "teal" | "indigo" | "violet";

interface CardText {
  title: string;
  short_reading: string;
  east_tip: string;
  west_tip: string;
  color_theme: CardTheme;
  symbol_emoji: string;
  image_prompt: string;
}

const CARD_THEMES: CardTheme[] = ["amber", "teal", "indigo", "violet"];

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 5);
}

function compact(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function normalizeTheme(value: unknown, fallback: CardTheme): CardTheme {
  return CARD_THEMES.includes(value as CardTheme) ? value as CardTheme : fallback;
}

function themeFromMood(mood?: string): CardTheme {
  if (mood === "peaceful" || mood === "nostalgic") return "teal";
  if (mood === "exciting") return "amber";
  if (mood === "sad" || mood === "anxious") return "indigo";
  return "violet";
}

function symbolFromKeywords(keywords: string[], mood?: string) {
  const firstKeyword = keywords.find(Boolean)?.replace(/[^\p{Script=Han}a-zA-Z0-9]/gu, "");
  if (firstKeyword) return firstKeyword.slice(0, 1);
  if (mood === "peaceful") return "水";
  if (mood === "sad") return "雨";
  if (mood === "anxious") return "雾";
  if (mood === "exciting") return "火";
  return "月";
}

function buildFallbackCardText({
  dreamText,
  keywords,
  mood,
  dreamSummary,
}: {
  dreamText: string;
  keywords: string[];
  mood?: string;
  dreamSummary?: string;
}): CardText {
  const theme = themeFromMood(mood);
  const coreSymbols = keywords.length ? keywords.join("、") : "潜意识、星空、梦境";
  const summary = asString(dreamSummary, "这个梦正在把内心深处的感受推到光里。");

  return {
    title: keywords[0] ? `${compact(keywords[0], 6)}之梦` : "梦境深处",
    short_reading: compact(summary, 40),
    east_tip: "静观其变",
    west_tip: "照见内心",
    color_theme: theme,
    symbol_emoji: symbolFromKeywords(keywords, mood),
    image_prompt: [
      `A surreal cinematic dream scene inspired by: ${compact(dreamText, 120)}`,
      `core symbols: ${coreSymbols}`,
      "deep starry atmosphere, dark fantasy, dramatic lighting, emotional tension",
      "immersive environment, soft mist, rich details, no text, no watermark",
    ].join(". "),
  };
}

function normalizeCardText(raw: unknown, fallback: CardText): CardText {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return fallback;
  const record = raw as Record<string, unknown>;

  return {
    title: compact(asString(record.title, fallback.title), 12),
    short_reading: compact(asString(record.short_reading, fallback.short_reading), 60),
    east_tip: compact(asString(record.east_tip, fallback.east_tip), 16),
    west_tip: compact(asString(record.west_tip, fallback.west_tip), 16),
    color_theme: normalizeTheme(record.color_theme, fallback.color_theme),
    symbol_emoji: compact(asString(record.symbol_emoji, fallback.symbol_emoji), 2),
    image_prompt: compact(asString(record.image_prompt, fallback.image_prompt), 260),
  };
}

export async function POST(request: NextRequest) {
  const { emotion, dreamText, keywords, mood, dream_summary } = await request.json();

  if (!dreamText?.trim()) {
    return Response.json({ error: "梦境描述不能为空" }, { status: 400 });
  }

  const normalizedKeywords = asStringArray(keywords);
  const fallbackCardText = buildFallbackCardText({
    dreamText,
    keywords: normalizedKeywords,
    mood,
    dreamSummary: dream_summary,
  });
  let cardText: CardText = fallbackCardText;

  // Step 1：生成文案 + 生图 prompt
  const textPrompt = `你是梦境解析卡片文案师。根据以下梦境信息生成卡片文案，严格输出 JSON，不要任何多余文字：

梦境情绪：${emotion}
梦境内容：${dreamText}
梦境摘要：${dream_summary ?? ""}
关键意象：${normalizedKeywords.join("、")}
情绪基调：${mood ?? ""}

输出格式：
{
  "title": "4-8字标题，有诗意",
  "short_reading": "40字以内核心解读，一句话点明深意",
  "east_tip": "10字以内东方视角提示",
  "west_tip": "10字以内心理视角洞察",
  "color_theme": "amber | teal | indigo | violet",
  "symbol_emoji": "一个代表此梦的单字，如：镜、水、火、月",
  "image_prompt": "用于AI生图的正向prompt，中英混合，150字以内。风格要求：超现实主义电影大片感，强调光影氛围和情绪张力，暗黑奇幻；画面重点放在环境、空间、氛围、梦境场景、潜意识意象"
}`;

  try {
    const raw = await generateText({ prompt: textPrompt });
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) cardText = normalizeCardText(JSON.parse(match[0]), fallbackCardText);
  } catch (err) {
    console.warn("Card text generation fallback:", err);
  }

  // Step 2：调用 OpenAI-compatible 生图模型
  try {
    const imageUrl = await generateImage(cardText.image_prompt);
    if (!imageUrl) {
      throw new Error("Image API returned an empty image URL");
    }

    return Response.json({
      title: cardText.title,
      short_reading: cardText.short_reading,
      east_tip: cardText.east_tip,
      west_tip: cardText.west_tip,
      color_theme: cardText.color_theme,
      symbol_emoji: cardText.symbol_emoji,
      image_prompt: cardText.image_prompt,
      imageUrl,
    });
  } catch (err) {
    console.error("Image generation error:", err);
    return Response.json(
      { error: "图片生成失败，生图服务暂时不可用，请稍后重试" },
      { status: 502 },
    );
  }
}
