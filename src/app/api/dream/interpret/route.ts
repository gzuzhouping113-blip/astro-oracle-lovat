import { NextRequest } from "next/server";
import { createTextClientConfig } from "@/lib/ai-text";

const SYSTEM_PROMPT = `你是一个梦境解析 AI 助手。你的任务是帮助用户回忆、梳理并解读梦境，但你不是心理医生、占卜权威或医疗诊断工具。

核心原则：
1. 先理解梦境，再解读； 
2. 梦境解析必须结合：梦中情绪、场景、人物关系、结局、现实近况、用户个人联想。
3. 不要把梦解释成确定预言，不要制造焦虑。
4. 心理分析必须使用"可能、或许、也许反映"等非绝对表达。
5. 如果用户提到长期严重噩梦、创伤回闪、影响睡眠、自伤念头或强烈痛苦，应温和建议寻求人类专业支持。
6. 如果用户不想回答追问，直接基于已有信息解读，并说明假设有限。

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

请严格按照 JSON 格式输出解析结果，不要有任何其他文字。`;

  try {
    const stream = await textConfig.client.chat.completions.create({
      model: textConfig.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) controller.enqueue(encoder.encode(delta));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("AI interpret error:", err);
    return Response.json({ error: "解析失败，请稍后再试" }, { status: 500 });
  }
}
