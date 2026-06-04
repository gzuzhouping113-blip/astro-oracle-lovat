import { NextRequest } from "next/server";
import { generateImage } from "@/lib/ai-image";
import { generateText } from "@/lib/ai-text";

export async function POST(request: NextRequest) {
  const { emotion, dreamText, keywords, mood, dream_summary } = await request.json();

  if (!dreamText?.trim()) {
    return Response.json({ error: "梦境描述不能为空" }, { status: 400 });
  }

  // Step 1：生成文案 + 生图 prompt
  const textPrompt = `你是梦境解析卡片文案师。根据以下梦境信息生成卡片文案，严格输出 JSON，不要任何多余文字：

梦境情绪：${emotion}
梦境内容：${dreamText}
梦境摘要：${dream_summary ?? ""}
关键意象：${(keywords ?? []).join("、")}
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

  let cardText: {
    title: string;
    short_reading: string;
    east_tip: string;
    west_tip: string;
    color_theme: string;
    symbol_emoji: string;
    image_prompt: string;
  } | null = null;

  try {
    const raw = await generateText({ prompt: textPrompt });
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) cardText = JSON.parse(match[0]);
  } catch (err) {
    console.error("Text generation error:", err);
  }

  // 兜底文案
  if (!cardText) {
    cardText = {
      title: "梦境深处",
      short_reading: "梦境映照内心，每一个意象都是自我的倒影。",
      east_tip: "宜静思，忌妄动",
      west_tip: "潜意识正在整合",
      color_theme: "violet",
      symbol_emoji: "月",
      image_prompt: `梦境幻象，${dreamText.substring(0, 40)}，超现实主义，暗黑奇幻，电影大片感，光影戏剧，深邃星空，神秘氛围，surrealism, cinematic, dark fantasy, dramatic lighting`,
    };
  }

  // Step 2：调用 OpenAI-compatible 生图模型
  let imageUrl = "";
  try {
    imageUrl = await generateImage(cardText.image_prompt);
  } catch (err) {
    console.error("Image generation error:", err);
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
}
