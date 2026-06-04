import { NextRequest } from "next/server";

export const runtime = "nodejs";

const DEFAULT_ALLOWED_HOSTS = [
  "154.217.234.133",
];

function getAllowedHosts() {
  return (process.env.IMAGE_PROXY_ALLOWED_HOSTS ?? DEFAULT_ALLOWED_HOSTS.join(","))
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return Response.json({ error: "Missing image url" }, { status: 400 });
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return Response.json({ error: "Invalid image url" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(imageUrl.protocol)) {
    return Response.json({ error: "Unsupported image protocol" }, { status: 400 });
  }

  if (!getAllowedHosts().includes(imageUrl.hostname)) {
    return Response.json({ error: "Image host is not allowed" }, { status: 403 });
  }

  const upstream = await fetch(imageUrl, {
    headers: {
      "User-Agent": "astro-oracle-image-proxy/1.0",
    },
  });

  if (!upstream.ok || !upstream.body) {
    return Response.json({ error: "Failed to load image" }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/png";
  return new Response(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
