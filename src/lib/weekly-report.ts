import { generateText } from "@/lib/ai-text";
import { getSql } from "@/lib/db";
import { mapDreamRecord, type DreamRecordRow } from "@/lib/dream-db";

export interface WeeklyAnalysis {
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
  report_version?: number;
}

export interface WeeklyReport {
  analysis: WeeklyAnalysis | null;
  dreamCount: number;
  weekStart: string;
  weekEnd: string;
  generatedAt?: string;
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
}

const SHANGHAI_TIME_ZONE = "Asia/Shanghai";
const WEEKLY_REPORT_VERSION = 2;
const WEEKLY_REPORT_RECORD_LIMIT = 100;

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

function asString(value: unknown, fallback: string, maxLength = 160) {
  const text = typeof value === "string" && value.trim() ? value.trim() : fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function asStringArray(value: unknown, fallback: string[], maxItems = 3, maxLength = 80) {
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
    current_state: "本周梦境样本还不算多，但已经可以作为近期内在节奏的观察入口。先把梦里的情绪强度、醒来后的余韵和反复出现的画面放在一起看，它们会比单个象征更接近真实状态。",
    self_awareness: "你可以留意梦境里最先被记住的人、地点和动作，它们往往对应现实中正在被反复触碰的关注点。不要急着解释对错，先观察哪些感受在醒来后仍然停留。",
    recurring_symbols: ["情绪强度", "重复场景", "醒来感受"],
    emotion_pattern: "本周情绪线索暂时还在聚拢，可能呈现为零散片段而不是清晰主题。继续记录几天后，压力、期待或回避的方向会更容易显出来。",
    reality_reflection: "梦境可能正在映照现实中的未完成事项、关系压力或身体疲惫。它不一定给出答案，但会提醒你哪些部分已经需要更温和地被看见。",
    suggestions: ["醒来后先写下第一感受，再补充梦里最清晰的画面。", "把重复出现的人物、地点或颜色标记出来，周末再一起回看。"],
    gentle_warning: "如果噩梦持续变频繁，或明显影响睡眠和白天状态，建议把它当作需要照顾的信号，并考虑寻求专业支持。",
    disclaimer: "本周梦境分析仅供自我观察和娱乐参考，不构成心理诊断、医疗建议或确定性预测。",
    report_version: WEEKLY_REPORT_VERSION,
  };
}

function pickTopItems(items: string[], maxItems: number) {
  const counts = new Map<string, number>();

  items
    .map(item => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      counts.set(item, (counts.get(item) ?? 0) + 1);
    });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([item]) => item)
    .slice(0, maxItems);
}

function buildLocalWeeklyAnalysis(records: ReturnType<typeof mapDreamRecord>[], dreamCount: number, periodLabel: string): WeeklyAnalysis {
  const fallback = fallbackAnalysis(dreamCount, periodLabel);
  if (records.length === 0) return fallback;

  const emotions = pickTopItems(
    records.map(record => record.emotion.split(" / ")[0] ?? record.emotion),
    2,
  );
  const symbols = pickTopItems(records.flatMap(record => record.symbols ?? []), 3);
  const symbolText = symbols.length ? symbols.join("、") : "醒来感受、重复场景";
  const emotionText = emotions.length ? emotions.join("、") : "起伏";

  return {
    periodLabel,
    dreamCount,
    current_state: `本周共记录 ${dreamCount} 条梦境，整体情绪更靠近${emotionText}。这些梦不像单一事件，更像近期压力、期待和身体疲惫交错后的回声，适合先把它们作为自我观察线索。`,
    self_awareness: `梦里反复被记住的部分集中在${symbolText}。你可以留意醒来后最先残留的感受，它通常比梦里的剧情更能指向当下真正被触动的位置。`,
    recurring_symbols: symbols.length ? symbols : fallback.recurring_symbols,
    emotion_pattern: `情绪线索有一定持续性，但还不需要急着下结论。更适合继续记录几天，观察哪些画面反复出现，哪些感受在白天仍然有轻微延续。`,
    reality_reflection: `这些梦可能在映照现实里的节奏压力、未完成事项或关系中的不确定感。它们不负责给出答案，但能提醒你哪些部分已经需要被慢慢照顾。`,
    suggestions: [
      "醒来后先写下第一感受，再补充梦里最清晰的一个画面。",
      "把重复出现的人物、地点或颜色标记出来，周末再一起回看。",
    ],
    gentle_warning: "如果近期噩梦明显增多，或影响睡眠和白天状态，建议把它当作需要休息与支持的信号。",
    disclaimer: fallback.disclaimer,
    report_version: WEEKLY_REPORT_VERSION,
  };
}

function normalizeAnalysis(raw: unknown, dreamCount: number, periodLabel: string): WeeklyAnalysis {
  const data = asRecord(raw);
  const fallback = fallbackAnalysis(dreamCount, periodLabel);

  return {
    periodLabel: asString(data.periodLabel, fallback.periodLabel, 32),
    dreamCount,
    current_state: asString(data.current_state, fallback.current_state, 150),
    self_awareness: asString(data.self_awareness, fallback.self_awareness, 140),
    recurring_symbols: asStringArray(data.recurring_symbols, fallback.recurring_symbols, 3, 18),
    emotion_pattern: asString(data.emotion_pattern, fallback.emotion_pattern, 120),
    reality_reflection: asString(data.reality_reflection, fallback.reality_reflection, 120),
    suggestions: asStringArray(data.suggestions, fallback.suggestions, 2, 72),
    gentle_warning: asString(data.gentle_warning, fallback.gentle_warning, 100),
    disclaimer: fallback.disclaimer,
    report_version: WEEKLY_REPORT_VERSION,
  };
}

function serializeReport(row: WeeklyReportRow, currentPeriodLabel?: string): WeeklyReport {
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
    select count(*)::int as dream_count
    from dream_records
    where user_id = ${userId}
      and deleted_at is null
      and created_at >= ${weekStart.toISOString()}::timestamptz
      and created_at < ${weekEnd.toISOString()}::timestamptz
  `) as DreamStatsRow[];
  const row = rows[0];

  return {
    dreamCount: Number(row?.dream_count ?? 0),
  };
}

function serializeEmptyReport({
  weekStart,
  weekEnd,
  dreamCount,
}: {
  weekStart: Date;
  weekEnd: Date;
  dreamCount: number;
}): WeeklyReport {
  return {
    analysis: null,
    dreamCount,
    weekStart: toShanghaiDateOnly(weekStart),
    weekEnd: toShanghaiDateOnly(weekEnd),
  };
}

export async function getCurrentWeeklyReport(userId: string) {
  const { start, end, endDateOnly } = getCurrentWeekRange();
  const currentPeriodLabel = formatPeriodLabel(start, end);
  const sql = getSql();

  const cached = (await sql`
    select week_start, week_end, analysis_json, dream_count, generated_at
    from dream_weekly_reports
    where user_id = ${userId} and week_start = ${toShanghaiDateOnly(start)}::date
    limit 1
  `) as WeeklyReportRow[];

  const cachedReport = cached[0] ?? null;
  if (cachedReport) {
    return {
      ...serializeReport(cachedReport, currentPeriodLabel),
      dreamCount: cachedReport.dream_count,
      weekEnd: endDateOnly,
    };
  }

  const stats = await getDreamStats({ userId, weekStart: start, weekEnd: end });
  return serializeEmptyReport({
    weekStart: start,
    weekEnd: end,
    dreamCount: stats.dreamCount,
  });
}

export async function generateCurrentWeeklyReport(userId: string) {
  const { start, end } = getCurrentWeekRange();
  const sql = getSql();
  const stats = await getDreamStats({ userId, weekStart: start, weekEnd: end });
  const rows = (await sql`
    select id, emotion, dream_text, excerpt, symbols, coordinate_x, coordinate_y, interpretation_json, created_at
    from dream_records
    where user_id = ${userId}
      and deleted_at is null
      and created_at >= ${start.toISOString()}::timestamptz
      and created_at < ${end.toISOString()}::timestamptz
    order by created_at desc
    limit ${WEEKLY_REPORT_RECORD_LIMIT}
  `) as DreamRecordRow[];

  const records = rows.map(mapDreamRecord);
  const periodLabel = formatPeriodLabel(start, end);
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

    const system = `你是一个温和、细腻、谨慎的梦境周报分析助手。你只输出 JSON，不做诊断，不做确定性预言。`;
    const prompt = `请分析这一周的梦境资料，输出必须是 JSON，不要 Markdown。
内容要比一句话更充分：每个主要字段在界面里大约能自然显示 2-3 行，但不要写成长篇文章。
语气温和、具体、像是在帮助用户做自我观察，不要恐吓，不要医学诊断。

梦境资料：
${JSON.stringify(dreamDigest, null, 2)}

JSON 格式：
{
  "periodLabel": "${periodLabel}",
  "current_state": "70-95个中文字符，描述本周整体状态",
  "self_awareness": "65-90个中文字符，指出可观察的自我意识线索",
  "recurring_symbols": ["2-6字主题1", "2-6字主题2", "2-6字主题3"],
  "emotion_pattern": "55-80个中文字符，描述情绪模式",
  "reality_reflection": "55-80个中文字符，连接现实压力或生活节奏",
  "suggestions": ["35-55个中文字符的建议1", "35-55个中文字符的建议2"],
  "gentle_warning": "45-70个中文字符的温和提醒"
}`;

    try {
      const raw = await generateText({ system, prompt });
      analysis = normalizeAnalysis(parseJsonObject(raw), stats.dreamCount, periodLabel);
    } catch (err) {
      console.error("Weekly report model error, using local fallback:", err);
      analysis = buildLocalWeeklyAnalysis(records, stats.dreamCount, periodLabel);
    }
  }

  const saved = (await sql`
    insert into dream_weekly_reports (
      user_id, week_start, week_end, analysis_json, dream_count, generated_at, updated_at
    )
    values (
      ${userId}, ${toShanghaiDateOnly(start)}::date, ${toShanghaiDateOnly(end)}::date,
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
