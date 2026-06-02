export interface DreamCoordinate {
  x: number;
  y: number;
}

export interface DreamImagery {
  symbol: string;
  meaning: string;
  archetype?: string;
}

export interface DreamInterpretation {
  action: "interpret";
  dream_summary: string;
  keywords: string[];
  imagery?: DreamImagery[];
  mood: "anxious" | "peaceful" | "sad" | "surreal" | "exciting" | "nostalgic";
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
  overall_advice: string;
  disclaimer: string;
  coordinate?: DreamCoordinate;
}

export interface DreamRecord {
  id: string;
  date: string;
  emotion: string;
  excerpt: string;
  symbols: string[];
  coord: DreamCoordinate;
  fullText?: string;
  interpretation?: DreamInterpretation;
}

export const EMOTIONS = [
  { title: "迷茫 / Bewildered", desc: "如隐雾之海坠落，摸不着边界", code: "M-1" },
  { title: "惊骇 / Dreaded", desc: "剧烈窒息，被无上宏伟物压迫", code: "H-2" },
  { title: "释然 / Relieved", desc: "如释重负，感觉大限初开般轻松", code: "R-3" },
  { title: "狂喜 / Euphoric", desc: "飞跃群星，拥有支配万物之权", code: "E-4" },
  { title: "怅惘 / Nostalgic", desc: "怀恋梦中人，重获不可重逢的过去", code: "N-5" },
  { title: "平静 / Serene", desc: "平静似湖，好似未曾经历任何起伏", code: "S-6" },
] as const;

export const MOOD_LABELS: Record<string, string> = {
  anxious: "焦虑",
  peaceful: "平静",
  sad: "悲伤",
  surreal: "超现实",
  exciting: "兴奋",
  nostalgic: "怀念",
};

export const FORTUNE_COLORS: Record<string, string> = {
  "大吉": "text-yellow-300",
  "吉": "text-green-400",
  "中性": "text-gray-300",
  "中性偏凶": "text-orange-400",
  "凶": "text-red-400",
};
