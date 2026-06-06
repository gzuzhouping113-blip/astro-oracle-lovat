import { generateText } from "@/lib/ai-text";
import { requireUser } from "@/lib/auth/session";
import { getSql } from "@/lib/db";
import { mapDreamRecord, type DreamRecordRow } from "@/lib/dream-db";

export const runtime = "nodejs";

interface WeeklyAnalysis {
  periodLabel: string;
  dreamCount: number;
  current_state: string;
  self_awareness: string;
  recurring_symbols: string[];
  emotion_pattern: string;
  reality_reflection: string;
  suggestions: string[];
  gentle_warning: string;
  disclaimer: string;
}

function parseJsonObject(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]) as unknown;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 6);
  return items.length ? items : fallback;
}

function fallbackAnalysis(dreamCount: number): WeeklyAnalysis {
  return {
    periodLabel: "近 7 天",
    dreamCount,
    current_state: "这周的梦境资料还不足以形成很明确的趋势，但已经可以作为观察近期心理节奏的线索。",
    self_awareness: "可以先留意梦里反复出现的情绪、人物和场景，它们往往比单个象征更能反映当下关注点。",
    recurring_symbols: ["情绪强度", "重复场景", "醒来后的第一感受"],
    emotion_pattern: "情绪模式暂时不明显，建议继续记录几天后再观察变化。",
    reality_reflection: "梦境可能正在把现实中的压力、期待或未完成事项转化为画面。",
    suggestions: ["记录醒来后的第一感受", "标记反复出现的人物或地点", "睡前减少强刺激信息输入"],
    gentle_warning: "如果噩梦频繁、影响睡眠或带来明显痛苦，建议寻求专业心理或医疗支持。",
    disclaimer: "本周梦境分析仅供自我观察和娱乐参考，不构成心理诊断、医疗建议或确定性预测。",
  };
}

function normalizeAnalysis(raw: unknown, dreamCount: number): WeeklyAnalysis {
  const data = asRecord(raw);
  const fallback = fallbackAnalysis(dreamCount);

  return {
    periodLabel: asString(data.periodLabel, fallback.periodLabel),
    dreamCount,
    current_state: asString(data.current_state, fallback.current_state),
    self_awareness: asString(data.self_awareness, fallback.self_awareness),
    recurring_symbols: asStringArray(data.recurring_symbols, fallback.recurring_symbols),
    emotion_pattern: asString(data.emotion_pattern, fallback.emotion_pattern),
    reality_reflection: asString(data.reality_reflection, fallback.reality_reflection),
    suggestions: asStringArray(data.suggestions, fallback.suggestions).slice(0, 4),
    gentle_warning: asString(data.gentle_warning, fallback.gentle_warning),
    disclaimer: asString(data.disclaimer, fallback.disclaimer),
  };
}

export async function POST() {
  try {
    const user = await requireUser();
    const sql = getSql();
    const rows = (await sql`
      select id, emotion, dream_text, excerpt, symbols, coordinate_x, coordinate_y, interpretation_json, created_at
      from dream_records
      where user_id = ${user.id}
        and deleted_at is null
        and created_at >= now() - interval '7 days'
      order by created_at desc
      limit 20
    `) as DreamRecordRow[];

    const records = rows.map(mapDreamRecord);
    if (records.length === 0) {
      return Response.json({ analysis: null, dreamCount: 0 });
    }

    const dreamDigest = records.map((record, index) => ({
      index: index + 1,
      date: record.date,
      emotion: record.emotion,
      dream: record.fullText ?? record.excerpt,
      symbols: record.symbols,
      summary: record.interpretation?.dream_summary ?? "",
      mood: record.interpretation?.mood ?? "",
      traditional: record.interpretation?.interpretations?.traditional?.content ?? "",
      psychological: record.interpretation?.interpretations?.psychological?.content ?? "",
      cognitive: record.interpretation?.interpretations?.cognitive?.content ?? "",
      imagery: record.interpretation?.imagery ?? [],
    }));

    const system = `你是一个温和、谨慎的梦境周报分析助手。你帮助用户从近一周梦境中观察情绪趋势、重复意象、现实关切和自我意识线索。
你不是心理医生，不做诊断，不做确定性预言。使用“可能、也许、像是、可以观察”等非绝对表达。
如果资料很少，要承认样本有限，但仍给出可执行的观察建议。
输出必须是 JSON，不要 Markdown，不要代码块，不要额外解释。`;

    const prompt = `请分析以下近 7 天梦境资料。思路可参考梦境日记产品常见的“情绪趋势、重复标签/意象、现实关联、反思提示”，重点不是单次解梦，而是本周模式。

梦境资料：
${JSON.stringify(dreamDigest, null, 2)}

请严格输出 JSON：
{
  "periodLabel": "近 7 天",
  "current_state": "用 2-3 句话概括用户目前可能的心理/生活状态，谨慎表达",
  "self_awareness": "指出梦境中体现出的自我意识线索，例如边界、选择、控制感、亲密关系、压力调节等",
  "recurring_symbols": ["重复意象或主题1", "重复意象或主题2", "重复意象或主题3"],
  "emotion_pattern": "概括本周情绪模式和变化",
  "reality_reflection": "梦境可能和现实生活的什么压力、期待、关系或未完成事项有关",
  "suggestions": ["具体建议1", "具体建议2", "具体建议3"],
  "gentle_warning": "如有必要，给出温和风险提醒；没有明显风险则提醒继续观察",
  "disclaimer": "本周梦境分析仅供自我观察和娱乐参考，不构成心理诊断、医疗建议或确定性预测。"
}`;

    const raw = await generateText({ system, prompt });
    const analysis = normalizeAnalysis(parseJsonObject(raw), records.length);

    return Response.json({ analysis, dreamCount: records.length });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Weekly dream analysis error:", err);
    return Response.json({ error: "生成近一周梦境分析失败" }, { status: 500 });
  }
}
