"use client";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ChevronRight, ImageIcon, Play, Plus } from "lucide-react";
import { useDream } from "@/components/astro/dream-context";
import { useRouter, useSearchParams } from "next/navigation";
import type { DreamRecord } from "@/lib/dream-types";

const EMOTION_OPTIONS = [
  "迷茫 / Bewildered",
  "惊骇 / Dreaded",
  "释然 / Relieved",
  "狂喜 / Euphoric",
  "怅惘 / Nostalgic",
  "平静 / Serene",
];

interface DreamerArchiveCard {
  dreamRecordId?: string | null;
  title: string;
  imageUrl?: string;
}

const PROXIED_IMAGE_HOSTS = new Set([
  "154.217.234.133",
  "lansekafei.asia",
  "www.lansekafei.asia",
]);

function getDisplayImageUrl(imageUrl?: string) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("data:") || imageUrl.startsWith("/") || imageUrl.startsWith("blob:")) return imageUrl;

  try {
    const url = new URL(imageUrl);
    if (url.protocol === "http:" || PROXIED_IMAGE_HOSTS.has(url.hostname)) {
      return `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    }
  } catch {
    return imageUrl;
  }

  return imageUrl;
}

function DreamerArchiveItem({
  record,
  card,
  onOpen,
}: {
  record: DreamRecord;
  card?: DreamerArchiveCard;
  onOpen: (record: DreamRecord) => void;
}) {
  const cardImage = getDisplayImageUrl(card?.imageUrl);

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen(record)}
      className="group flex w-full gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3 text-left transition-all hover:border-[rgba(136,117,255,0.24)] hover:bg-white/[0.055]"
    >
      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
        {cardImage ? (
          <img src={cardImage} alt={card?.title ?? record.excerpt} crossOrigin="anonymous" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,rgba(136,117,255,0.18),rgba(9,7,26,0.2))]">
            <ImageIcon className="h-4 w-4 text-white/25" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="font-mono-tech text-[10px] text-[#8875FF]/70">{record.date}</span>
          <span className="font-serif-dream text-[11px] text-white/45">{record.emotion.split(" / ")[0]}</span>
        </div>
        {card ? (
          <p className="mb-1.5 truncate font-mono-tech text-[9px] tracking-widest text-[#C9963A]/65">
            已关联卡片 · {card.title}
          </p>
        ) : null}
        <p className="line-clamp-2 font-serif-dream text-[13px] leading-relaxed text-white/62">
          「{record.excerpt}」
        </p>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] self-center transition-all group-hover:bg-[rgba(136,117,255,0.12)]">
        <ChevronRight className="h-3.5 w-3.5 text-white/20 group-hover:text-[#8875FF]" />
      </div>
    </motion.button>
  );
}

export function DreamerScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [emotionPickerOpen, setEmotionPickerOpen] = useState(false);
  const [cardHistory, setCardHistory] = useState<DreamerArchiveCard[]>([]);

  const { emotion, setEmotion, dreamText, setDreamText, realityTrigger,
    setRealityTrigger, setCurrentStep, setInterpretation, triggerInterpret, isLoading, records, resetDream } = useDream();
  const showHistory = searchParams.get("history") === "1" || searchParams.get("fromCard") === "true";

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/dream/cards")
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (active) setCardHistory(data.cards ?? []);
      })
      .catch((err) => {
        console.error("Load dream cards error:", err);
        if (active) setCardHistory([]);
      });

    return () => { active = false; };
  }, []);

  // 每次从欢迎页进入（包括导航栏点「述梦」）都重置为欢迎态并清空内容
  useEffect(() => {
    if (!mounted) return;
    if (searchParams.get("reset") === "true") {
      setExpanded(false);
      setDreamText(""); setRealityTrigger(""); setEmotion("");
      router.replace("/");
    }
  }, [mounted, searchParams, setDreamText, setRealityTrigger, setEmotion, router]);

  // 每次组件首次挂载（从其他页面跳回 /），都折叠并清空
  useEffect(() => {
    if (!mounted) return;
    setExpanded(false);
    setDreamText("");
    setRealityTrigger("");
    setEmotion("");
    if (showHistory) resetDream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const cardByRecordId = useMemo(() => {
    const map = new Map<string, DreamerArchiveCard>();
    cardHistory.forEach((card) => {
      if (card.dreamRecordId && !map.has(card.dreamRecordId)) {
        map.set(card.dreamRecordId, card);
      }
    });
    return map;
  }, [cardHistory]);

  const openRecord = (record: DreamRecord) => {
    setEmotion(record.emotion);
    setDreamText(record.fullText ?? record.excerpt);
    setInterpretation(record.interpretation ?? null);
    setCurrentStep(3);
    router.push("/parser");
  };

  const startNewDream = () => {
    resetDream();
    setExpanded(true);
    router.replace("/");
  };

  if (!mounted) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent border-[#8875FF] animate-spin" />
    </div>
  );

  if (showHistory && !expanded) return (
    <div className="w-full flex-1 flex flex-col gap-5">
      <button
        type="button"
        onClick={startNewDream}
        className="glass-bright group flex items-center justify-between rounded-2xl border border-[rgba(136,117,255,0.2)] p-4 text-left transition-all hover:border-[rgba(136,117,255,0.36)] hover:bg-white/[0.045]"
      >
        <div>
          <p className="font-mono-tech text-[10px] tracking-widest text-[#8875FF]/75">NEW DREAM</p>
          <p className="mt-1 font-serif-dream text-[16px] text-white">新建梦境档案</p>
          <p className="mt-1 text-[12px] text-white/35">继续述说新的梦境，解析完成后会保存到历史记录并关联生成卡片。</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8875FF]/20 text-[#8875FF] transition-all group-hover:bg-[#8875FF]/30">
          <Plus className="h-4 w-4" />
        </div>
      </button>

      <div className="flex items-center justify-between">
        <span className="font-mono-tech text-[10px] text-white/25 tracking-wider">历史梦境档案 · {records.length} 条</span>
      </div>

      {records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-14 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(136,117,255,0.14)] bg-[rgba(136,117,255,0.07)]">
            <ImageIcon className="h-5 w-5 text-[#8875FF]/35" />
          </div>
          <h3 className="mb-2 font-serif-dream text-[16px] text-white/70">还没有梦境档案</h3>
          <p className="mb-6 max-w-xs text-[13px] leading-relaxed text-white/30">先新建一条梦境档案，生成的卡片会自动出现在这里。</p>
          <button
            type="button"
            onClick={startNewDream}
            className="rounded-full bg-[#8875FF] px-6 py-2.5 text-[12px] font-semibold text-white shadow-lg shadow-[#8875FF]/20 transition-colors hover:bg-[#9A88FF]"
          >
            开始述梦
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {records.slice(0, 12).map((record) => (
            <DreamerArchiveItem key={record.id} record={record} card={cardByRecordId.get(record.id)} onOpen={openRecord} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center relative">
      {/* 标题副标题 - 初始居中，展开后上移 */}
      <motion.div
        layout
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className={`w-full max-w-2xl flex flex-col items-center text-center ${
          expanded ? "mb-8" : "mb-0"
        }`}
      >
        <motion.h1
          layout="position"
          className="font-serif-dream text-[26px] md:text-[28px] text-white leading-tight mb-3"
        >
          醒来时的灵魂回响
        </motion.h1>
        <motion.p
          layout="position"
          className="text-[13px] text-white/45 leading-relaxed max-w-md"
        >
          睁开眼，灵魂在清醒与虚无间摩擦的第一感受<br/>
          将锚定你的梦境解读方向
        </motion.p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!expanded ? (
          /* 初始状态：波纹圆 + 文字 */
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-6 mt-12"
          >
            {/* 镂空粒子圆形按钮 */}
            <motion.button
              onClick={() => setExpanded(true)}
              className="relative w-32 h-32 rounded-full flex items-center justify-center group cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              {/* 外圈粒子边框 */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 128 128">
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: "#8875FF", stopOpacity: 0.6 }} />
                    <stop offset="100%" style={{ stopColor: "#2DD4BF", stopOpacity: 0.4 }} />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <circle
                  cx="64" cy="64" r="60"
                  fill="none"
                  stroke="url(#grad1)"
                  strokeWidth="1.5"
                  strokeDasharray="4 6"
                  opacity="0.5"
                  filter="url(#glow)"
                  className="group-hover:opacity-80 transition-opacity"
                />
                <circle
                  cx="64" cy="64" r="58"
                  fill="none"
                  stroke="url(#grad1)"
                  strokeWidth="0.5"
                  strokeDasharray="2 4"
                  opacity="0.3"
                />
              </svg>

              {/* 内发光背景 */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[rgba(136,117,255,0.08)] to-[rgba(45,212,191,0.05)]
                group-hover:from-[rgba(136,117,255,0.12)] group-hover:to-[rgba(45,212,191,0.08)] transition-all duration-300" />

              {/* 波纹动画层 */}
              {[0, 0.5, 1].map((delay, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border border-[#8875FF]/30"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{
                    duration: 2.5,
                    delay: delay,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
              ))}

              {/* 中心图标 */}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-[rgba(136,117,255,0.2)] border border-[rgba(136,117,255,0.4)]
                  flex items-center justify-center group-hover:bg-[rgba(136,117,255,0.3)] transition-all">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#8875FF]">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
                    </svg>
                  </motion.div>
                </div>
              </div>
            </motion.button>

            <motion.p
              className="font-serif-dream text-[14px] text-white/60 tracking-wide"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              述说梦境
            </motion.p>
          </motion.div>

        ) : (
          /* 展开状态：表单 */
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full max-w-2xl flex flex-col gap-5"
          >
            {/* 情绪选择 */}
            <div
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setEmotionPickerOpen(false);
                }
              }}
            >
              <label className="block font-mono-tech text-[10px] tracking-widest text-white/40 uppercase mb-2.5">
                醒来情绪
              </label>
              <button
                type="button"
                aria-expanded={emotionPickerOpen}
                onClick={() => setEmotionPickerOpen((open) => !open)}
                className="w-full border-0 border-b border-white/[0.12] px-0 py-3 text-left
                  focus:outline-none focus:border-b-[#8875FF] transition-colors cursor-pointer group"
              >
                <span className="flex items-center justify-between gap-4">
                  <span className="flex flex-col gap-1.5">
                    {emotion ? (
                      <>
                        <span className="text-[11px] font-mono-tech tracking-widest text-white/35 uppercase">
                          已选择醒来时的第一感受
                        </span>
                        <span className="text-base text-white/85">{emotion}</span>
                      </>
                    ) : (
                      <span className="text-base text-white/35">
                        点击选择醒来时的第一感受
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-white/35 transition-transform group-hover:text-white/60 ${
                      emotionPickerOpen ? "rotate-180" : ""
                    }`}
                  />
                </span>
              </button>

              <AnimatePresence>
                {emotionPickerOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute left-0 right-0 top-full z-30 mt-3 overflow-hidden rounded-md border border-white/[0.12]
                      bg-[#0A0818]/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
                  >
                    {EMOTION_OPTIONS.map((opt) => {
                      const selected = opt === emotion;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setEmotion(opt);
                            setEmotionPickerOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors
                            ${selected ? "bg-[#8875FF]/18 text-white" : "text-white/70 hover:bg-white/[0.06] hover:text-white"}`}
                        >
                          <span>{opt}</span>
                          {selected ? <Check className="h-4 w-4 text-[#8875FF]" /> : null}
                        </button>
                      );
                    })}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* 梦境描述 */}
            <div>
              <label className="block font-mono-tech text-[10px] tracking-widest text-white/40 uppercase mb-2.5">
                梦境描述
              </label>
              <textarea
                value={dreamText}
                onChange={(e) => setDreamText(e.target.value)}
                placeholder="描述你梦境的主体景物、颜色、角色……越具体越好"
                className="w-full h-36 bg-transparent border-0 border-b border-white/[0.12] rounded-none px-0 py-3
                  text-base text-white/85 placeholder-white/20 leading-relaxed resize-none
                  focus:outline-none focus:border-b-[#8875FF] transition-colors"
              />
            </div>

            {/* 现实场景 */}
            <div>
              <label className="block font-mono-tech text-[10px] tracking-widest text-white/40 uppercase mb-2.5">
                最近发生的事情 <span className="text-white/20">(可选)</span>
              </label>
              <input
                type="text"
                value={realityTrigger}
                onChange={(e) => setRealityTrigger(e.target.value)}
                placeholder="近期的压力、变化或印象深刻的事件"
                className="w-full bg-transparent border-0 border-b border-white/[0.12] rounded-none px-0 py-3
                  text-base text-white/85 placeholder-white/20
                  focus:outline-none focus:border-b-[#8875FF] transition-colors"
              />
            </div>

            {/* 解析按钮 + 返回 */}
            <div className="flex flex-col items-center gap-3 mt-4">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (!dreamText.trim() || !emotion) return;
                  setCurrentStep(3);
                  triggerInterpret();
                  router.push("/parser");
                }}
                disabled={!dreamText.trim() || !emotion || isLoading}
                className="flex items-center gap-2.5 bg-[#8875FF] hover:bg-[#9A88FF] disabled:opacity-30
                  text-white font-bold text-[13px] px-10 py-3.5 rounded-full
                  shadow-lg shadow-[#8875FF]/25 font-mono-tech tracking-wider transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                解析梦境
              </motion.button>

              <button
                onClick={() => {
                  setExpanded(false);
                  setDreamText("");
                  setRealityTrigger("");
                  setEmotion("");
                }}
                className="font-mono-tech text-[11px] text-white/20 hover:text-white/50 tracking-wider transition-colors"
              >
                ← 返回
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
