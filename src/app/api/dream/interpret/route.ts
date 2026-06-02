import { NextRequest } from "next/server";
import { createTextClientConfig } from "@/lib/ai-text";

const SYSTEM_PROMPT = `你是一个梦境解析 AI 助手。你的任务是帮助用户回忆、梳理并解读梦境，但你不是心理医生、占卜权威或医疗诊断工具。

核心原则：
1. 先理解梦境，再解读； 
2. 梦境解析必须结合：梦中情绪、场景、人物关系、结局、现实近况、用户个人联想。
3. 不要把梦解释成确定预言，不要制造焦虑。
4. 心理分析必须使用"可能、或许、也许反映"等非绝对表达。
5. 如果用户提到长期严重噩梦、创伤回闪、影响睡眠、自伤念头或强烈痛苦，应温和建议寻求人类专业支持。
6. 不允许追问用户，不允许输出 request_more_details；即使信息有限，也必须直接基于已有信息完成解读。

工作流程：

解读包含四层：
1. 梦境摘要：简短复述梦的核心情节。
2. 情绪与现实关联：分析梦中情绪可能对应的现实压力、期待、冲突或未完成事件。
3. 象征解读：
   - 传统文化视角：参考周公解梦、颜色、动物、方向、五行、吉凶象征，但不要说成绝对事实。
   - 心理学视角：参考弗洛伊德、荣格原型、潜意识、投射、控制感、安全感、记忆巩固、情绪调节。
   - 神经/认知视角：说明梦可能是大脑整理记忆、处理情绪、模拟威胁或生成叙事的过程。
4. 综合建议：给用户一个温和、具体、可执行的建议。

输出格式要求：直接输出 JSON，不要有任何其他文字、代码块标记或解释。
必须输出 action 为 "interpret" 的完整 JSON。禁止输出 "request_more_details"、"message" 或任何追问结构。

如果可以解读，输出：
{
  "action": "interpret",
  "dream_summary": "20字以内梦境摘要",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "mood": "anxious | peaceful | sad | surreal | exciting | nostalgic",
  "interpretations": {
    "traditional": {
      "title": "传统象征",
      "content": "从周公解梦、颜色、动物、五行、吉凶象征等角度解释，但避免绝对化。",
      "fortune_tone": "大吉 | 吉 | 中性 | 中性偏凶 | 凶",
      "advice": "一句宜忌或提醒"
    },
    "psychological": {
      "title": "心理分析",
      "content": "从情绪、现实压力、潜意识、投射、安全感、控制感等角度解释。",
      "insight": "一句核心洞察",
      "advice": "一个具体的自我关照建议"
    },
    "cognitive": {
      "title": "认知与睡眠机制",
      "content": "从记忆巩固、情绪调节、威胁模拟、梦境叙事生成等角度解释。",
      "advice": "一个记录或观察梦境的建议"
    }
  },
  "imagery": [
    {
      "symbol": "意象名称（如：黑色海洋）",
      "meaning": "该意象的象征含义解读，结合东西方视角，50字以内",
      "archetype": "对应的荣格原型或传统象征（可选，10字以内）"
    }
  ],
  "overall_advice": "1-2句话综合建议",
  "disclaimer": "梦境解析仅供自我理解和娱乐参考，不等同于诊断或预言。"
}

imagery 数组最多5个元素，挑选梦境中最核心的意象，每个意象单独解析。`;

const VALID_MOODS = ["anxious", "peaceful", "sad", "surreal", "exciting", "nostalgic"] as const;

type Mood = (typeof VALID_MOODS)[number];

interface InterpretationPayload {
  action: "interpret";
  dream_summary: string;
  keywords: string[];
  mood: Mood;
  interpretations: {
    traditional: {
      title: string;
      content: string;
      fortune_tone: string;
      advice: string;
    };
    psychological: {
      title: string;
      content: string;
      insight: string;
      advice: string;
    };
    cognitive: {
      title: string;
      content: string;
      advice: string;
    };
  };
  imagery: Array<{
    symbol: string;
    meaning: string;
    archetype?: string;
  }>;
  overall_advice: string;
  disclaimer: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asMood(value: unknown): Mood {
  return VALID_MOODS.includes(value as Mood) ? value as Mood : "surreal";
}

function asStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 5);
  return items.length ? items : fallback;
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

function fallbackInterpretation(dreamText: string, realityTrigger?: string): InterpretationPayload {
  const summary = dreamText.length > 22 ? `${dreamText.slice(0, 22)}...` : dreamText;

  return {
    action: "interpret",
    dream_summary: summary,
    keywords: ["梦境", "意象", "现实"],
    mood: "surreal",
    interpretations: {
      traditional: {
        title: "传统象征",
        content: "梦中的道路、门、光影等意象，常被理解为转折、机会或心境变化的象征，但不应视作确定预言。",
        fortune_tone: "中性",
        advice: "宜静心观察，顺势而行。",
      },
      psychological: {
        title: "心理分析",
        content: `这个梦或许反映你正在处理现实中的期待、选择或压力${realityTrigger ? "，也可能与近期事件有关" : ""}。梦境是在用象征语言呈现内心状态。`,
        insight: "梦中的关键意象可能代表你正在寻找新的方向。",
        advice: "可以记录梦里最强烈的情绪，再对应近期生活中的具体事件。",
      },
      cognitive: {
        title: "认知与睡眠机制",
        content: "梦境可能是大脑在睡眠中整合记忆、调节情绪、生成叙事的结果，画面越鲜明，往往越值得留意其中的情绪线索。",
        advice: "醒来后简单记录场景、人物、情绪和结局，有助于后续观察重复主题。",
      },
    },
    imagery: [
      {
        symbol: "梦境核心意象",
        meaning: "它可能象征当下心理状态与现实选择之间的连接。",
        archetype: "门槛",
      },
    ],
    overall_advice: "把这次梦境当作一次温和的自我提醒：关注内心真正牵挂的事，并用具体行动回应它。",
    disclaimer: "梦境解析仅供自我理解和娱乐参考，不等同于诊断或预言。",
  };
}

function normalizeInterpretation(raw: unknown, dreamText: string, realityTrigger?: string): InterpretationPayload {
  if (!isRecord(raw) || raw.action !== "interpret") {
    return fallbackInterpretation(dreamText, realityTrigger);
  }

  const fallback = fallbackInterpretation(dreamText, realityTrigger);
  const interpretations = isRecord(raw.interpretations) ? raw.interpretations : {};
  const traditional = isRecord(interpretations.traditional) ? interpretations.traditional : {};
  const psychological = isRecord(interpretations.psychological) ? interpretations.psychological : {};
  const cognitive = isRecord(interpretations.cognitive) ? interpretations.cognitive : {};
  const imagery = Array.isArray(raw.imagery)
    ? raw.imagery
      .filter(isRecord)
      .map((item) => ({
        symbol: asString(item.symbol, "梦境意象"),
        meaning: asString(item.meaning, "这个意象可能反映你近期的心理状态。"),
        archetype: asString(item.archetype, undefined),
      }))
      .slice(0, 5)
    : fallback.imagery;

  return {
    action: "interpret",
    dream_summary: asString(raw.dream_summary, fallback.dream_summary),
    keywords: asStringArray(raw.keywords, fallback.keywords),
    mood: asMood(raw.mood),
    interpretations: {
      traditional: {
        title: asString(traditional.title, fallback.interpretations.traditional.title),
        content: asString(traditional.content, fallback.interpretations.traditional.content),
        fortune_tone: asString(traditional.fortune_tone, fallback.interpretations.traditional.fortune_tone),
        advice: asString(traditional.advice, fallback.interpretations.traditional.advice),
      },
      psychological: {
        title: asString(psychological.title, fallback.interpretations.psychological.title),
        content: asString(psychological.content, fallback.interpretations.psychological.content),
        insight: asString(psychological.insight, fallback.interpretations.psychological.insight),
        advice: asString(psychological.advice, fallback.interpretations.psychological.advice),
      },
      cognitive: {
        title: asString(cognitive.title, fallback.interpretations.cognitive.title),
        content: asString(cognitive.content, fallback.interpretations.cognitive.content),
        advice: asString(cognitive.advice, fallback.interpretations.cognitive.advice),
      },
    },
    imagery: imagery.length ? imagery : fallback.imagery,
    overall_advice: asString(raw.overall_advice, fallback.overall_advice),
    disclaimer: asString(raw.disclaimer, fallback.disclaimer),
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { emotion, dreamText, realityTrigger } = body;

  if (!dreamText?.trim()) {
    return Response.json({ error: "梦境描述不能为空" }, { status: 400 });
  }

  const textConfig = createTextClientConfig();
  if (!textConfig) {
    return Response.json({ error: "文本解析服务未配置" }, { status: 500 });
  }

  const userPrompt = `请解析以下梦境：

醒来时的情绪：${emotion}
梦境描述：${dreamText}${realityTrigger ? `\n现实情景锚定：${realityTrigger}` : ""}

请严格按照 action 为 "interpret" 的 JSON 格式输出解析结果，不要有任何其他文字，不要追问用户。`;

  try {
    const result = await textConfig.client.chat.completions.create({
      model: textConfig.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      stream: false,
    });

    const raw = result.choices[0]?.message?.content ?? "{}";
    const parsed = parseJsonObject(raw);
    const interpretation = normalizeInterpretation(parsed, dreamText, realityTrigger);

    return new Response(JSON.stringify(interpretation), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("AI interpret error:", err);
    return Response.json({ error: "解析失败，请稍后再试" }, { status: 500 });
  }
}
