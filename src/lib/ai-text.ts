const DEFAULT_TEXT_BASE_URL = "https://www.lansekafei.asia/v1";
const DEFAULT_TEXT_MODEL = "gpt-5.4-mini";
const TEXT_TIMEOUT_MS = 90_000;
const TEXT_ATTEMPTS = 4;

function readEnv(name: string) {
  return process.env[name]?.trim();
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNonRetriableTextError(err: unknown) {
  return err instanceof Error && /^Text API (400|401|403):/.test(err.message);
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function extractResponsesText(data: unknown) {
  if (typeof data !== "object" || data === null) return "";

  const record = data as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        text?: unknown;
      }>;
    }>;
  };

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  const text = record.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => typeof content.text === "string" ? content.text : "")
    .join("")
    .trim();

  return text ?? "";
}

function extractChatStreamText(raw: string) {
  let output = "";

  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;

    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;

    try {
      const data = JSON.parse(payload) as {
        choices?: Array<{
          delta?: {
            content?: unknown;
          };
          message?: {
            content?: unknown;
          };
        }>;
      };

      for (const choice of data.choices ?? []) {
        if (typeof choice.delta?.content === "string") output += choice.delta.content;
        if (typeof choice.message?.content === "string") output += choice.message.content;
      }
    } catch {
      // Ignore malformed SSE chunks from the upstream gateway.
    }
  }

  return output.trim();
}

async function generateTextViaChatStream({
  baseUrl,
  apiKey,
  model,
  system,
  prompt,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  system?: string;
  prompt: string;
}) {
  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
      stream: true,
      max_completion_tokens: 4096,
    }),
  }, TEXT_TIMEOUT_MS);

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Text API ${response.status}: ${raw.slice(0, 500)}`);
  }

  return extractChatStreamText(raw);
}

async function generateTextViaResponses({
  baseUrl,
  apiKey,
  model,
  system,
  prompt,
}: {
  baseUrl: string;
  apiKey: string;
  model: string;
  system?: string;
  prompt: string;
}) {
  const response = await fetchWithTimeout(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      ...(system ? { instructions: system } : {}),
      input: prompt,
      max_output_tokens: 4096,
      store: false,
    }),
  }, TEXT_TIMEOUT_MS);

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Text API ${response.status}: ${raw.slice(0, 500)}`);
  }

  return extractResponsesText(JSON.parse(raw) as unknown);
}

export async function generateText({
  system,
  prompt,
}: {
  system?: string;
  prompt: string;
}) {
  const apiKey = readEnv("CUSTOM_AI_API_KEY");
  if (!apiKey) {
    throw new Error("CUSTOM_AI_API_KEY is not configured");
  }

  const baseUrl = trimTrailingSlash(readEnv("CUSTOM_AI_BASE_URL") ?? DEFAULT_TEXT_BASE_URL);
  const model = readEnv("CUSTOM_AI_MODEL") ?? DEFAULT_TEXT_MODEL;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= TEXT_ATTEMPTS; attempt += 1) {
    try {
      const output = await generateTextViaChatStream({ baseUrl, apiKey, model, system, prompt });
      if (output) return output;

      const fallbackOutput = await generateTextViaResponses({ baseUrl, apiKey, model, system, prompt });
      if (fallbackOutput) return fallbackOutput;

      throw new Error("Text API returned an empty response");
    } catch (err) {
      lastError = err;
      if (isNonRetriableTextError(err)) {
        break;
      }
      if (attempt < TEXT_ATTEMPTS) {
        await sleep(attempt * 1_000);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Text API failed");
}
