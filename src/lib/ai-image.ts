const DEFAULT_IMAGE_BASE_URL = "https://www.lansekafei.asia/v1";
const DEFAULT_IMAGE_MODEL = "gpt-image-2";
const IMAGE_TIMEOUT_MS = 120_000;
const IMAGE_ATTEMPTS = 2;

function readEnv(name: string) {
  return process.env[name]?.trim();
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function toDisplayImageUrl(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    if (url.protocol === "https:") return imageUrl;
    return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  } catch {
    return imageUrl;
  }
}

export async function generateImage(prompt: string) {
  const apiKey = readEnv("GPT_IMAGE_API_KEY");
  if (!apiKey) {
    throw new Error("GPT_IMAGE_API_KEY is not configured");
  }

  const baseUrl = trimTrailingSlash(readEnv("GPT_IMAGE_BASE_URL") ?? DEFAULT_IMAGE_BASE_URL);
  const model = readEnv("GPT_IMAGE_MODEL") ?? DEFAULT_IMAGE_MODEL;
  const size = readEnv("GPT_IMAGE_SIZE") ?? "1024x1024";

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= IMAGE_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          size,
          response_format: "url",
        }),
      }, IMAGE_TIMEOUT_MS);

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Image API ${response.status}: ${text.slice(0, 500)}`);
      }

      const data = JSON.parse(text) as {
        data?: Array<{
          url?: string;
          b64_json?: string;
        }>;
      };
      const item = data.data?.[0];
      if (item?.url) {
        return toDisplayImageUrl(item.url);
      }
      if (item?.b64_json) {
        return `data:image/png;base64,${item.b64_json}`;
      }

      throw new Error("Image API did not return an image");
    } catch (err) {
      lastError = err;
      if (attempt < IMAGE_ATTEMPTS) {
        await sleep(attempt * 1_000);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Image API failed");
}
