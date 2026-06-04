export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_ENV === "production"
    ? "https://dreamdrop.cn"
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export const SITE_NAME = "DreamDrop";
export const SITE_TITLE = "DreamDrop";
export const SITE_SUBTITLE = "AI 梦境解析与星轨卡片";
export const SITE_DESCRIPTION =
  "DreamDrop 是一个融合东方梦象、荣格原型和认知睡眠机制的 AI 梦境解析应用，支持梦境档案保存与梦境卡片生成。";
export const SITE_DOMAIN = "dreamdrop.cn";

export const ICP_BEIAN = process.env.NEXT_PUBLIC_ICP_BEIAN?.trim() ?? "";
export const POLICE_BEIAN = process.env.NEXT_PUBLIC_POLICE_BEIAN?.trim() ?? "";
export const POLICE_BEIAN_URL = process.env.NEXT_PUBLIC_POLICE_BEIAN_URL?.trim() ?? "";
