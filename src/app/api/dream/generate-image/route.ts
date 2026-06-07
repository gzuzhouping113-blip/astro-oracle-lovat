import { NextRequest } from "next/server";
import { generateImage } from "@/lib/ai-image";
import { generateText } from "@/lib/ai-text";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { emotion, dreamText, keywords } = await request.json();

  if (!dreamText?.trim()) {
    return Response.json({ error: "梦境描述不能为空" }, { status: 400 });
  }

  // Step 1：用 AI 把梦境内容润色成生图 prompt
  let imagePrompt = "";
  try {
    imagePrompt = await generateText({
      system: `你是一个专业的 AI 图像 prompt 工程师，擅长将文字描述转化为高质量的图像生成提示词。
你的任务是根据用户的梦境内容和情绪，生成一段适合 AI 绘画的英文+中文混合 prompt。

要求：
1. 保留梦境的核心意象和氛围
2. 加入电影级视觉描述（光影、色调、构图、质感）
3. 风格偏向超现实主义、暗黑奇幻、电影大片感
4. 结合情绪映射对应的色彩和氛围
5. 直接输出 prompt 文字，不要任何解释，不要 JSON，不要引号包裹`,
      prompt: `梦境情绪：${emotion}
梦境内容：${dreamText}
${keywords?.length ? `关键意象：${keywords.join("、")}` : ""}

请生成一段适合 AI 生图的 prompt（150字以内，中英文混合），要突出视觉冲击力和超现实氛围。`,
    });
  } catch (err) {
    console.error("Prompt generation error:", err);
    // 兜底 prompt
    imagePrompt = `梦境幻象，${dreamText.substring(0, 50)}，超现实主义，暗黑奇幻，电影大片感，光影戏剧，深邃星空，神秘氛围，细腻光线，对比色，oc渲染，光线追踪，景深，surrealism, cinematic, dark fantasy, dramatic lighting, ultra detailed, 8K`;
  }

  // Step 2：调用 OpenAI-compatible 生图模型
  try {
    const imageUrl = await generateImage(imagePrompt);
    return Response.json({ imageUrl, prompt: imagePrompt });
  } catch (err) {
    console.error("Image generation error:", err);
    return Response.json({ error: "图像生成服务异常", prompt: imagePrompt }, { status: 500 });
  }
}
