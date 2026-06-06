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

interface WeeklyReportRow {
  week_start: string | Date;
  week_end: string | Date;
  analysis_json: WeeklyAnalysis | null;
  dream_count: number;
  generated_at: string | Date;
}

interface DreamStatsRow {
  dream_count: number | string;
  latest_created_at: string | Date | null;
}

const SHANGHAI_TIME_ZONE = "Asia/Shanghai";

const shanghaiDateFormatter = new Intl.DateTimeFormat("en", {
  timeZone: SHANGHAI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toShanghaiDateOnly(date: Date) {
  const parts = shanghaiDateFormatter.formatToParts(date);
  const year = parts.find(part => part.type === "year")?.value ?? "1970";
  const month = parts.find(part => part.type === "month")?.value ?? "01";
  const day = parts.find(part => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function dateOnlyFromDb(value: string | Date) {
  return typeof value === "string" ? value.slice(0, 10) : toShanghaiDateOnly(value);
}

function dateOnlyToShanghaiStart(dateOnly: string) {
  return new Date(`${dateOnly}T00:00:00+08:00`);
}

function addDaysToDateOnly(dateOnly: string, days: number) {
  const date = new Date(`${dateOnly}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function startOfShanghaiWeek(date = new Date()) {
  const dateOnly = toShanghaiDateOnly(date);
  const noonUtc = new Date(`${dateOnly}T12:00:00Z`);
  const day = noonUtc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return dateOnlyToShanghaiStart(addDaysToDateOnly(dateOnly, diff));
}

function getCurrentWeekRange() {
  const now = new Date();
  return {
    start: startOfShanghaiWeek(now),
    end: now,
    endDateOnly: toShanghaiDateOnly(now),
  };
}

function formatPeriodLabel(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat("zh-CN", {
    timeZone: SHANGHAI_TIME_ZONE,
    month: "2-digit",
    day: "2-digit",
  });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
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

function asString(value: unknown, fallback: string, maxLength = 120) {
  const text = typeof value === "string" && value.trim() ? value.trim() : fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function asStringArray(value: unknown, fallback: string[], maxItems = 3, maxLength = 24) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => {
      const text = item.trim();
      return text.length > maxLength ? text.slice(0, maxLength) : text;
    })
    .slice(0, maxItems);
  return items.length ? items : fallback;
}

function fallbackAnalysis(dreamCount: number, periodLabel: string): WeeklyAnalysis {
  return {
    periodLabel,
    dreamCount,
    current_state: "本周梦境样本有限，但可以先把它当作近期情绪节奏的观察线索。",
    self_awareness: "留意反复出现的场景、人物和醒来后的第一感受，它们更容易呈现当下关注点。",
    recurring_symbols: ["情绪强度", "重复场景", "醒来感受"],
    emotion_pattern: "情绪趋势暂时不明显，适合继续记录几天再观察。",
    reality_reflection: "梦境可能在映照现实中的压力、期待或未完成事项。",
    suggestions: ["记录醒来后的第一感受", "标记重复出现的人物或地点"],
    gentle_warning: "若噩梦频繁或影响睡眠，建议寻求专业支持。",
    disclaimer: "本周梦境分析仅供自我观察和娱乐参考，不构成心理诊断、医疗建议或确定性预测。",
  };
}

function normalizeAnalysis(raw: unknown, dreamCount: number, periodLabel: string): WeeklyAnalysis {
  const data = asRecord(raw);
  const fallback = fallbackAnalysis(dreamCount, periodLabel);

  return {
    periodLabel: asString(data.periodLabel, fallback.periodLabel, 32),
    dreamCount,
    current_state: asString(data.current_state, fallback.current_state, 90),
    self_awareness: asString(data.self_awareness, fallback.self_awareness, 90),
    recurring_symbols: asStringArray(data.recurring_symbols, fallback.recurring_symbols),
    emotion_pattern: asString(data.emotion_pattern, fallback.emotion_pattern, 80),
    reality_reflection: asString(data.reality_reflection, fallback.reality_reflection, 80),
    suggestions: asStringArray(data.suggestions, fallback.suggestions, 2, 48),
    gentle_warning: asString(data.gentle_warning, fallback.gentle_warning, 70),
    disclaimer: fallback.disclaimer,
  };
}

function serializeReport(row: WeeklyReportRow, currentPeriodLabel?: string) {
  const analysis = row.analysis_json
    ? {
        ...row.analysis_json,
        periodLabel: currentPeriodLabel ?? row.analysis_json.periodLabel,
      }
    : null;

  return {
    analysis,
    dreamCount: row.dream_count,
    weekStart: dateOnlyFromDb(row.week_start),
    weekEnd: dateOnlyFromDb(row.week_end),
    generatedAt: new Date(row.generated_at).toISOString(),
  };
}

async function getDreamStats({
  userId,
  weekStart,
  weekEnd,
}: {
  userId: string;
  weekStart: Date;
  weekEnd: Date;
}) {
  const sql = getSql();
  const rows = (await sql`
    select count(*)::int as dream_count, max(created_at) as latest_created_at
    from dream_records
    where user_id = ${userId}
      and deleted_at is null
      and created_at >= ${weekStart.toISOString()}::timestamptz
      and created_at < ${weekEnd.toISOString()}::timestamptz
  `) as DreamStatsRow[];
  const row = rows[0];

  return {
    dreamCount: Number(row?.dream_count ?? 0),
    latestCreatedAt: row?.latest_created_at ? new Date(row.latest_created_at) : null,
  };
}

function hasNewDreamSinceReport(cached: WeeklyReportRow, stats: { dreamCount: number; latestCreatedAt: Date | null }) {
  if (stats.dreamCount > Number(cached.dream_count)) return true;
  if (!stats.latestCreatedAt) return false;
  return stats.latestCreatedAt.getTime() > new Date(cached.generated_at).getTime();
}

async function generateAndSaveReport({
  userId,
  weekStart,
  weekEnd,
}: {
  userId: string;
  weekStart: Date;
  weekEnd: Date;
}) {
  const sql = getSql();
  const stats = await getDreamStats({ userId, weekStart, weekEnd });
  const rows = (await sql`
    select id, emotion, dream_text, excerpt, symbols, coordinate_x, coordinate_y, interpretation_json, created_at
    from dream_records
    where user_id = ${userId}
      and deleted_at is null
      and created_at >= ${weekStart.toISOString()}::timestamptz
      and created_at < ${weekEnd.toISOString()}::timestamptz
    order by created_at desc
    limit 30
  `) as DreamRecordRow[];

  const records = rows.map(mapDreamRecord);
  const periodLabel = formatPeriodLabel(weekStart, weekEnd);
  let analysis: WeeklyAnalysis | null = null;

  if (records.length > 0) {
    const dreamDigest = records.map((record, index) => ({
      index: index + 1,
      date: record.date,
      emotion: record.emotion,
      dream: record.fullText ?? record.excerpt,
      symbols: record.symbols,
      summary: record.interpretation?.dream_summary ?? "",
      mood: record.interpretation?.mood ?? "",
    }));

    const system = `你是一个温和、谨慎的梦境周报分析助手。你只输出简短 JSON，不做诊断，不做确定性预言。`;
    const prompt = `请分析这一周的梦境资料，输出必须是 JSON，不要 Markdown。
每个字段都要短，不要长篇解释。

梦境资料：
${JSON.stringify(dreamDigest, null, 2)}

JSON 格式：
{
  "periodLabel": "${periodLabel}",
  "current_state": "一句话，45字以内",
  "self_awareness": "一句话，45字以内",
  "recurring_symbols": ["主题1", "主题2", "主题3"],
  "emotion_pattern": "一句话，40字以内",
  "reality_reflection": "一句话，40字以内",
  "suggestions": ["建议1，24字以内", "建议2，24字以内"],
  "gentle_warning": "一句温和提醒，35字以内"
}`;

    const raw = await generateText({ system, prompt });
    analysis = normalizeAnalysis(parseJsonObject(raw), stats.dreamCount, periodLabel);
  }

  const saved = (await sql`
    insert into dream_weekly_reports (
      user_id, week_start, week_end, analysis_json, dream_count, generated_at, updated_at
    )
    values (
      ${userId}, ${toShanghaiDateOnly(weekStart)}::date, ${toShanghaiDateOnly(weekEnd)}::date,
      cast(${JSON.stringify(analysis)} as jsonb), ${stats.dreamCount}, now(), now()
    )
    on conflict (user_id, week_start) do update set
      week_end = excluded.week_end,
      analysis_json = excluded.analysis_json,
      dream_count = excluded.dream_count,
      generated_at = now(),
      updated_at = now()
    returning week_start, week_end, analysis_json, dream_count, generated_at
  `) as WeeklyReportRow[];

  return serializeReport(saved[0]);
}

export async function GET() {
  try {
    const user = await requireUser();
    const { start, end, endDateOnly } = getCurrentWeekRange();
    const currentPeriodLabel = formatPeriodLabel(start, end);
    const sql = getSql();

    const cached = (await sql`
      select week_start, week_end, analysis_json, dream_count, generated_at
      from dream_weekly_reports
      where user_id = ${user.id} and week_start = ${toShanghaiDateOnly(start)}::date
      limit 1
    `) as WeeklyReportRow[];

    const stats = await getDreamStats({ userId: user.id, weekStart: start, weekEnd: end });

    if (cached[0] && !hasNewDreamSinceReport(cached[0], stats)) {
      return Response.json({
        ...serializeReport(cached[0], currentPeriodLabel),
        dreamCount: cached[0].dream_count,
        weekEnd: endDateOnly,
      });
    }

    return Response.json(await generateAndSaveReport({ userId: user.id, weekStart: start, weekEnd: end }));
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Load weekly dream analysis error:", err);
    return Response.json({ error: "读取本周梦境周报失败" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await requireUser();
    const { start, end } = getCurrentWeekRange();
    return Response.json(await generateAndSaveReport({ userId: user.id, weekStart: start, weekEnd: end }));
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Weekly dream analysis error:", err);
    return Response.json({ error: "生成本周梦境周报失败" }, { status: 500 });
  }
}
