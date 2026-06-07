const DEFAULT_IMAGE_BASE_URL = "https://www.lansekafei.asia/v1";
const DEFAULT_IMAGE_MODEL = "gpt-image-2";
const IMAGE_TIMEOUT_MS = 55_000;
const IMAGE_ATTEMPTS = 1;
const DEFAULT_PROXY_IMAGE_HOSTS = [
  "154.217.234.133",
  "lansekafei.asia",
  "www.lansekafei.asia",
];

function readEnv(name: string) {
  return process.env[name]?.trim();
}

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function isNonRetriableImageError(err: unknown) {
  return err instanceof Error && /^Image API (400|401|403):/.test(err.message);
}

function getProxyImageHosts() {
  return Array.from(
    new Set([
      ...DEFAULT_PROXY_IMAGE_HOSTS,
      ...(readEnv("IMAGE_PROXY_ALLOWED_HOSTS") ?? "")
        .split(",")
        .map((host) => host.trim())
        .filter(Boolean),
    ]),
  );
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
    if (getProxyImageHosts().includes(url.hostname)) {
      return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    }
    if (url.protocol === "https:") return imageUrl;
    return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  } catch {
    return imageUrl;
  }
}

function normalizeImageValue(value: string) {
  if (!value) return "";
  if (value.startsWith("data:image/")) return value;
  if (/^https?:\/\//.test(value)) return toDisplayImageUrl(value);
  if (value.length > 100) return `data:image/png;base64,${value}`;
  return "";
}

function extractImageValue(data: unknown): string {
  const candidates: unknown[] = [];

  if (isRecord(data)) {
    candidates.push(data);
    if (Array.isArray(data.data)) candidates.push(...data.data);
    if (Array.isArray(data.output)) candidates.push(...data.output);
  }

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;

    const direct = normalizeImageValue(
      asString(candidate.url)
        || asString(candidate.b64_json)
        || asString(candidate.image_url)
        || asString(candidate.result),
    );
    if (direct) return direct;

    const imageUrl = candidate.image_url;
    if (isRecord(imageUrl)) {
      const nested = normalizeImageValue(asString(imageUrl.url) || asString(imageUrl.b64_json));
      if (nested) return nested;
    }

    if (Array.isArray(candidate.content)) {
      for (const content of candidate.content) {
        if (!isRecord(content)) continue;
        const nested = normalizeImageValue(
          asString(content.url)
            || asString(content.b64_json)
            || asString(content.image_url)
            || asString(content.result),
        );
        if (nested) return nested;
      }
    }
  }

  return "";
}

export async function generateImage(prompt: string) {
  const apiKeys = uniqueValues([
    readEnv("GPT_IMAGE_API_KEY"),
    readEnv("CUSTOM_AI_API_KEY"),
  ]);
  if (!apiKeys.length) {
    throw new Error("GPT_IMAGE_API_KEY is not configured");
  }

  const baseUrl = trimTrailingSlash(readEnv("GPT_IMAGE_BASE_URL") ?? DEFAULT_IMAGE_BASE_URL);
  const model = readEnv("GPT_IMAGE_MODEL") ?? DEFAULT_IMAGE_MODEL;
  const size = readEnv("GPT_IMAGE_SIZE") ?? "1024x1024";

  let lastError: unknown = null;
  for (const apiKey of apiKeys) {
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
        const image = extractImageValue(data);
        if (image) {
          return image;
        }

        throw new Error("Image API did not return an image");
      } catch (err) {
        lastError = err;
        if (isNonRetriableImageError(err)) {
          break;
        }
        if (attempt < IMAGE_ATTEMPTS) {
          await sleep(attempt * 1_000);
        }
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Image API failed");
}
