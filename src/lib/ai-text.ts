import OpenAI from "openai";

const DOUBAO_TEXT_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const DOUBAO_TEXT_MODEL = "doubao-seed-1-6-251015";

export interface TextClientConfig {
  client: OpenAI;
  model: string;
}

function readEnv(name: string) {
  return process.env[name]?.trim();
}

export function createTextClientConfig(): TextClientConfig | null {
  const customApiKey = readEnv("CUSTOM_AI_API_KEY");
  if (customApiKey) {
    const customBaseUrl = readEnv("CUSTOM_AI_BASE_URL");

    return {
      client: new OpenAI({
        apiKey: customApiKey,
        ...(customBaseUrl ? { baseURL: customBaseUrl } : {}),
      }),
      model: readEnv("CUSTOM_AI_MODEL") ?? "gpt-5.5",
    };
  }

  const doubaoApiKey = readEnv("DOUBAO_API_KEY");
  if (doubaoApiKey) {
    return {
      client: new OpenAI({
        apiKey: doubaoApiKey,
        baseURL: readEnv("DOUBAO_TEXT_BASE_URL") ?? DOUBAO_TEXT_BASE_URL,
      }),
      model: readEnv("DOUBAO_TEXT_MODEL") ?? DOUBAO_TEXT_MODEL,
    };
  }

  return null;
}
