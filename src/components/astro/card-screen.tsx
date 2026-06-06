"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RefreshCw, ImageIcon, Share2, BookOpen, Brain, Cpu, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDream } from "@/components/astro/dream-context";
import { SITE_NAME } from "@/lib/site-config";

interface CardData {
  id?: string;
  dreamRecordId?: string | null;
  title: string;
  short_reading: string;
  east_tip: string;
  west_tip: string;
  color_theme: "amber" | "teal" | "indigo" | "violet";
  symbol_emoji: string;
  imageUrl: string;
  image_prompt?: string;
  createdAt: number;
  emotion: string;
  dreamExcerpt: string;
}

const THEME = {
  amber:  { border:"border-[rgba(201,150,58,0.3)]",  accent:"text-[#C9963A]", tag:"bg-[rgba(201,150,58,0.12)] text-[#E8B85A] border-[rgba(201,150,58,0.25)]" },
  teal:   { border:"border-[rgba(45,212,191,0.3)]",  accent:"text-[#2DD4BF]", tag:"bg-[rgba(45,212,191,0.12)] text-[#3DE8D8] border-[rgba(45,212,191,0.25)]" },
  indigo: { border:"border-[rgba(99,102,241,0.3)]",  accent:"text-indigo-300", tag:"bg-[rgba(99,102,241,0.12)] text-indigo-200 border-[rgba(99,102,241,0.25)]" },
  violet: { border:"border-[rgba(136,117,255,0.3)]", accent:"text-[#8875FF]", tag:"bg-[rgba(136,117,255,0.12)] text-[#A897FF] border-[rgba(136,117,255,0.25)]" },
};

const PROXIED_IMAGE_HOSTS = new Set([
  "154.217.234.133",
  "lansekafei.asia",
  "www.lansekafei.asia",
]);

function getDisplayImageUrl(imageUrl: string) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("data:") || imageUrl.startsWith("/") || imageUrl.startsWith("blob:")) {
    return imageUrl;
  }

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

function sanitizeFileName(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]/g, "-").slice(0, 80) || "dream-card";
}

function downloadBlob(blob: Blob, card: CardData) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${SITE_NAME}-${sanitizeFileName(card.title)}-${Date.now()}.png`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadPureImage(card: CardData) {
  if (!card.imageUrl) throw new Error("这张卡片还没有图片");
  const response = await fetch(getDisplayImageUrl(card.imageUrl), { cache: "no-store" });
  if (!response.ok) throw new Error("图片下载失败，请稍后再试");
  downloadBlob(await response.blob(), card);
}

export function CardScreen() {
  const [mounted, setMounted] = useState(false);
  const [card, setCard] = useState<CardData | null>(null);
  const [history, setHistory] = useState<CardData[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"card"|"detail">("card");
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  // 从档案选中的梦境数据（一次性原子更新，避免多 state 异步问题）
  const [activeDream, setActiveDream] = useState<{
    recordId?: string;
    emotion: string;
    dreamText: string;
    excerpt: string;
    keywords: string[];
    interpretation: import("@/lib/dream-types").DreamInterpretation | null;
  } | null>(null);

  const {
    emotion: ctxEmotion,
    dreamText: ctxDreamText,
    interpretation: ctxInterpretation,
    records,
    currentRecordId,
  } = useDream();

  // 当前展示用数据：优先用档案选中的，否则回退到 context
  const emotion        = activeDream?.emotion       ?? ctxEmotion;
  const dreamText      = activeDream?.dreamText     ?? ctxDreamText;
  const interpretation = activeDream?.interpretation ?? ctxInterpretation;
  const displayKeywords = activeDream?.keywords     ?? interpretation?.keywords ?? [];
  const displayExcerpt  = activeDream?.excerpt      ?? (dreamText.length > 80 ? dreamText.slice(0, 80) + "…" : dreamText);

  useEffect(() => {
    setMounted(true);
    fetch("/api/dream/cards")
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        const cards = (data.cards ?? []) as CardData[];
        setHistory(cards);
      })
      .catch((err) => {
        console.error("Load card history error:", err);
        setHistory([]);
      })
      .finally(() => setIsHistoryLoading(false));
  }, []);

  const searchParams = useSearchParams();
  const selectMode = searchParams.get("select") === "1";

  // 核心生图函数（不用 useCallback 避免声明顺序问题）
  const doGenerate = async (
    em: string,
    dt: string,
    interp: import("@/lib/dream-types").DreamInterpretation | null,
  ) => {
    if (!dt.trim() || !interp) return;
    setIsGenerating(true); setError(null); setCard(null); setViewMode("card");
    try {
      const res = await fetch("/api/dream/generate-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emotion: em,
          dreamText: dt,
          keywords: interp?.keywords ?? [],
          mood: interp?.mood ?? "",
          dream_summary: interp?.dream_summary ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? "生成失败"); return; }
      const newCard: CardData = {
        ...data,
        dreamRecordId: activeDream?.recordId ?? currentRecordId,
        createdAt: Date.now(),
        emotion: em,
        dreamExcerpt: dt.length > 80 ? dt.slice(0, 80) + "…" : dt,
      };
      setCard(newCard);
      const saveRes = await fetch("/api/dream/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCard),
      });
      const saved = await saveRes.json().catch(() => null);
      const cardToStore = saveRes.ok && saved?.card ? saved.card as CardData : newCard;
      setCard(cardToStore);
      setHistory(prev => [cardToStore, ...prev.filter(item => item.id !== cardToStore.id)].slice(0, 20));
    } catch { setError("网络异常，请稍后重试"); }
    finally { setIsGenerating(false); }
  };

  // 从解析页带 ?generate=1 跳转过来，自动触发生图
  useEffect(() => {
    if (!mounted) return;
    if (searchParams.get("generate") === "1" && ctxDreamText.trim() && ctxInterpretation) {
      doGenerate(ctxEmotion, ctxDreamText, ctxInterpretation);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);


  if (!mounted) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent border-[#8875FF] animate-spin" />
    </div>
  );

  const displayCard = card;
  const hasCurrentDream = !selectMode && Boolean(dreamText.trim());
  const canGenerateCard = hasCurrentDream && Boolean(interpretation);
  const sourceExcerpt = hasCurrentDream ? displayExcerpt : displayCard?.dreamExcerpt ?? "";
  const sourceEmotion = hasCurrentDream ? emotion : displayCard?.emotion ?? "";
  const sourceKeywords = hasCurrentDream ? displayKeywords : [];

  const selectHistoryCard = (historyCard: CardData) => {
    setCard(historyCard);
    setViewMode("card");

    const record = historyCard.dreamRecordId
      ? records.find((item) => item.id === historyCard.dreamRecordId)
      : undefined;

    if (!record) {
      setActiveDream(null);
      return;
    }

    const interp = record.interpretation ?? null;
    setActiveDream({
      recordId: record.id,
      emotion: record.emotion,
      dreamText: record.fullText ?? record.excerpt,
      excerpt: record.excerpt,
      keywords: interp?.keywords ?? record.symbols ?? [],
      interpretation: interp,
    });
  };

  const deleteCard = async (target: CardData) => {
    if (!target.id) return;
    const previousHistory = history;
    const previousCard = card;
    setHistory(prev => prev.filter(item => item.id !== target.id));
    if (card?.id === target.id) setCard(null);
    setDeletingCardId(null);

    try {
      const response = await fetch(`/api/dream/cards/${encodeURIComponent(target.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      window.dispatchEvent(new CustomEvent("dream-card-deleted", { detail: { id: target.id } }));
    } catch (err) {
      console.error("Delete card error:", err);
      setHistory(previousHistory);
      setCard(previousCard);
      setError("删除卡片失败，请稍后再试");
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col gap-5">
      {displayCard && !isGenerating && canGenerateCard ? (
        <div className="flex items-center justify-end">
          <motion.button whileTap={{ scale:0.96 }} onClick={() => doGenerate(emotion, dreamText, interpretation)}
            className="flex items-center gap-1.5 font-mono-tech text-[10px] text-[#6A677E] hover:text-[#A9A6C4] transition-colors">
            <RefreshCw className="w-3 h-3" />重新生成
          </motion.button>
        </div>
      ) : null}

      {isHistoryLoading && !displayCard && !hasCurrentDream ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="w-7 h-7 rounded-full border-2 border-t-transparent border-[#8875FF] animate-spin" />
        </div>
      ) : !hasCurrentDream && !displayCard && history.length === 0 && records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[rgba(136,117,255,0.07)] border border-[rgba(136,117,255,0.14)] flex items-center justify-center mb-5">
            <Share2 className="w-7 h-7 text-[#8875FF]/40" />
          </div>
          <h3 className="font-serif-dream text-[16px] text-white mb-2">还没有梦境卡片</h3>
          <p className="text-[13px] text-[#6A677E] mb-7 max-w-xs leading-relaxed">先去诉说梦境，生成你的第一张分享卡</p>
          <Link href="/" className="bg-gradient-to-r from-[#8875FF] to-[#5B4FD4] text-white text-[13px] font-semibold px-7 py-3 rounded-full shadow-lg shadow-[#8875FF]/25">
            前往述梦 →
          </Link>
        </div>
      ) : (
        <>
          {/* ── 梦境原文（最上方）── */}
          {sourceExcerpt ? (
            <div className="glass rounded-2xl p-4 border border-[rgba(201,150,58,0.14)]">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="h-px w-5 bg-gradient-to-r from-[#C9963A] to-transparent" />
                <p className="font-serif-dream text-[13px] text-[#E8B85A] tracking-wide">梦境原文</p>
              </div>
              <p className="font-serif-dream text-[13px] text-[#A9A6C4] leading-relaxed">
                {sourceExcerpt}
              </p>
              <div className="flex gap-2 mt-2.5 flex-wrap">
                {sourceEmotion ? (
                  <span className="font-mono-tech text-[10px] text-[#6A677E] border border-[rgba(255,255,255,0.08)] px-2 py-0.5 rounded-full">
                    {sourceEmotion.split(" / ")[0]}
                  </span>
                ) : null}
                {sourceKeywords.slice(0, 3).map((kw: string, i: number) => (
                  <span key={i} className="font-mono-tech text-[10px] text-[#8875FF]/70 border border-[rgba(136,117,255,0.2)] px-2 py-0.5 rounded-full">
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* ── Main layout ── */}
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            <div className="w-full lg:w-[290px] shrink-0 flex flex-col gap-3">

              {/* Tab toggle */}
              {displayCard && !isGenerating && (
                <div className="flex rounded-xl overflow-hidden border border-[rgba(136,117,255,0.15)] text-[11px]">
                  {(["card","detail"] as const).map((mode) => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                      className={`flex-1 py-2 font-mono-tech tracking-wider transition-all ${
                        viewMode === mode
                          ? "bg-[rgba(136,117,255,0.18)] text-white"
                          : "text-[#3E3C50] hover:text-[#6A677E]"
                      }`}>
                      {mode === "card" ? "卡片" : "解读"}
                    </button>
                  ))}
                </div>
              )}

              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div key="loading"
                    initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                    className="w-full aspect-[3/4] rounded-2xl border border-[rgba(136,117,255,0.15)] bg-[rgba(14,11,36,0.7)] flex flex-col items-center justify-center gap-5"
                  >
                    <div className="relative w-14 h-14">
                      <motion.div animate={{rotate:360}} transition={{duration:3,repeat:Infinity,ease:"linear"}}
                        className="absolute inset-0 rounded-full border-2 border-dashed border-[#8875FF]/50" />
                      <motion.div animate={{rotate:-360}} transition={{duration:2,repeat:Infinity,ease:"linear"}}
                        className="absolute inset-2.5 rounded-full border border-[#2DD4BF]/40" />
                      <motion.div animate={{scale:[1,1.2,1]}} transition={{duration:1.5,repeat:Infinity}}
                        className="absolute inset-[18px] rounded-full bg-[rgba(136,117,255,0.2)]" />
                    </div>
                    <div className="text-center px-4">
                      <p className="font-mono-tech text-[11px] text-white/75 tracking-widest animate-pulse">AI 正在绘制你的梦境...</p>
                      <p className="font-serif-dream text-[10px] text-[#3E3C50] mt-1.5">约需 20–30 秒</p>
                    </div>
                  </motion.div>

                ) : displayCard && viewMode === "card" ? (
                  <motion.div key={`card-${displayCard.createdAt}`}
                    initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} transition={{duration:0.4}}
                    className={`group relative w-full aspect-square overflow-hidden rounded-2xl border ${THEME[displayCard.color_theme??"violet"].border} bg-black/20 shadow-2xl`}
                  >
                    {displayCard.imageUrl
                      ? <img src={getDisplayImageUrl(displayCard.imageUrl)} alt="梦境意象" crossOrigin="anonymous" className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#1a1050] via-[#0e0a28] to-[#07050f]">
                          <ImageIcon className="h-8 w-8 text-white/20" />
                        </div>
                    }
                    {displayCard.id ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDeletingCardId(displayCard.id ?? null); }}
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-red-400/20 bg-black/45 text-red-200 opacity-0 backdrop-blur-md transition-all hover:bg-red-500/20 group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label="删除卡片"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}

                    <AnimatePresence>
                      {displayCard.id && deletingCardId === displayCard.id ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[rgba(9,7,26,0.82)] p-5 text-center backdrop-blur-sm"
                        >
                          <p className="font-serif-dream text-[14px] text-white/80">确认删除这张卡片？</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => deleteCard(displayCard)}
                              className="rounded-lg border border-red-500/25 bg-red-500/15 px-4 py-1.5 text-[12px] text-red-200 transition-all hover:bg-red-500/25"
                            >
                              删除
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingCardId(null)}
                              className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-4 py-1.5 text-[12px] text-white/45 transition-all hover:bg-white/[0.1]"
                            >
                              取消
                            </button>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>

                ) : displayCard && viewMode === "detail" ? (
                  <motion.div key={`detail-${displayCard.createdAt}`}
                    initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} transition={{duration:0.3}}
                    className="w-full aspect-[3/4] rounded-2xl border border-[rgba(136,117,255,0.2)] bg-[rgba(14,11,40,0.82)] p-5 flex flex-col gap-4 overflow-y-auto"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-2xl font-serif-dream ${THEME[displayCard.color_theme??"violet"].accent}`}>{displayCard.symbol_emoji}</span>
                      <h3 className="font-serif-dream text-[15px] text-white">{displayCard.title}</h3>
                    </div>
                    {/* 核心解读 */}
                    <p className="text-[13px] text-[#A9A6C4] leading-relaxed">{displayCard.short_reading}</p>

                    {/* 三层详细解析 —— 从 interpretation context 取全量数据 */}
                    {interpretation?.interpretations ? (
                      <div className="flex flex-col gap-3 pt-3 border-t border-[rgba(136,117,255,0.1)]">

                        {/* 东方传统象征 */}
                        {interpretation.interpretations.traditional && (
                          <div className="bg-[rgba(201,150,58,0.07)] border border-[rgba(201,150,58,0.18)] rounded-xl p-3.5 flex flex-col gap-2">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-3 h-3 text-[#C9963A]" />
                              <span className="font-mono-tech text-[9px] tracking-widest text-[#C9963A]/80 uppercase">东方传统象征</span>
                              {interpretation.interpretations.traditional.fortune_tone && (
                                <span className="ml-auto font-mono-tech text-[9px] text-[#E8B85A] font-semibold">
                                  {interpretation.interpretations.traditional.fortune_tone}
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] text-[#A9A6C4] leading-relaxed">
                              {interpretation.interpretations.traditional.content}
                            </p>
                            {interpretation.interpretations.traditional.advice && (
                              <p className="font-serif-dream text-[11px] text-[#C9963A] italic border-t border-[rgba(201,150,58,0.15)] pt-2">
                                {interpretation.interpretations.traditional.advice}
                              </p>
                            )}
                          </div>
                        )}

                        {/* 心理分析 */}
                        {interpretation.interpretations.psychological && (
                          <div className="bg-[rgba(45,212,191,0.06)] border border-[rgba(45,212,191,0.18)] rounded-xl p-3.5 flex flex-col gap-2">
                            <div className="flex items-center gap-1.5">
                              <Brain className="w-3 h-3 text-[#2DD4BF]" />
                              <span className="font-mono-tech text-[9px] tracking-widest text-[#2DD4BF]/80 uppercase">心理分析</span>
                            </div>
                            <p className="text-[12px] text-[#A9A6C4] leading-relaxed">
                              {interpretation.interpretations.psychological.content}
                            </p>
                            {interpretation.interpretations.psychological.insight && (
                              <p className="font-serif-dream text-[11px] text-[#2DD4BF] italic border-t border-[rgba(45,212,191,0.15)] pt-2">
                                {interpretation.interpretations.psychological.insight}
                              </p>
                            )}
                            {interpretation.interpretations.psychological.advice && (
                              <p className="text-[11px] text-[#6A677E] leading-relaxed">
                                {interpretation.interpretations.psychological.advice}
                              </p>
                            )}
                          </div>
                        )}

                        {/* 认知睡眠机制 */}
                        {interpretation.interpretations.cognitive && (
                          <div className="bg-[rgba(136,117,255,0.06)] border border-[rgba(136,117,255,0.18)] rounded-xl p-3.5 flex flex-col gap-2">
                            <div className="flex items-center gap-1.5">
                              <Cpu className="w-3 h-3 text-[#8875FF]" />
                              <span className="font-mono-tech text-[9px] tracking-widest text-[#8875FF]/80 uppercase">认知与睡眠机制</span>
                            </div>
                            <p className="text-[12px] text-[#A9A6C4] leading-relaxed">
                              {interpretation.interpretations.cognitive.content}
                            </p>
                            {interpretation.interpretations.cognitive.advice && (
                              <p className="font-serif-dream text-[11px] text-[#8875FF] italic border-t border-[rgba(136,117,255,0.15)] pt-2">
                                {interpretation.interpretations.cognitive.advice}
                              </p>
                            )}
                          </div>
                        )}

                        {/* 综合建议 */}
                        {interpretation.overall_advice && (
                          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-3.5">
                            <p className="font-serif-dream text-[12px] text-[#E4E1F5] leading-relaxed">{interpretation.overall_advice}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* 无完整解析时的降级展示 */
                      <div className="flex flex-col gap-2.5 pt-3 border-t border-[rgba(136,117,255,0.12)]">
                        <div className="bg-[rgba(201,150,58,0.07)] border border-[rgba(201,150,58,0.15)] rounded-xl p-3">
                          <p className="font-mono-tech text-[8px] text-[#C9963A]/80 mb-1">东方提示</p>
                          <p className="text-[12px] text-[#A9A6C4]">{displayCard.east_tip}</p>
                        </div>
                        <div className="bg-[rgba(45,212,191,0.07)] border border-[rgba(45,212,191,0.15)] rounded-xl p-3">
                          <p className="font-mono-tech text-[8px] text-[#2DD4BF]/80 mb-1">心理洞察</p>
                          <p className="text-[12px] text-[#A9A6C4]">{displayCard.west_tip}</p>
                        </div>
                      </div>
                    )}
                    <p className="font-mono-tech text-[9px] text-[#3E3C50] mt-auto">
                      {new Date(displayCard.createdAt).toLocaleString("zh-CN")}
                    </p>
                  </motion.div>

                ) : error ? (
                  <motion.div key="error" initial={{opacity:0}} animate={{opacity:1}}
                    className="w-full aspect-[3/4] rounded-2xl border border-[rgba(224,80,80,0.2)] bg-[rgba(20,8,18,0.7)] flex flex-col items-center justify-center gap-4 p-6 text-center"
                  >
                    <p className="text-[12px] text-red-300/80">{error}</p>
                    <button onClick={() => doGenerate(emotion, dreamText, interpretation)}
                      disabled={!canGenerateCard}
                      className="font-mono-tech text-[11px] text-[#8875FF] border border-[rgba(136,117,255,0.3)] px-4 py-2 rounded-xl hover:bg-[rgba(136,117,255,0.1)] transition-all">
                      重试
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{opacity:0}} animate={{opacity:1}}
                    className="w-full aspect-[3/4] rounded-2xl border border-[rgba(136,117,255,0.12)] bg-[rgba(14,11,36,0.5)] flex flex-col items-center justify-center gap-4 p-6 text-center cursor-pointer hover:border-[rgba(136,117,255,0.28)] transition-all"
                    onClick={() => setShowPicker(true)}
                  >
                    <div className="w-12 h-12 rounded-full bg-[rgba(136,117,255,0.08)] border border-[rgba(136,117,255,0.18)] flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-[#8875FF]/50" />
                    </div>
                    <div>
                      <p className="font-serif-dream text-[13px] text-white/50 mb-1">选择梦境档案生图</p>
                      <p className="font-mono-tech text-[10px] text-white/20">从已保存的梦境中选择后生成卡片</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Download button ── */}
              {displayCard && !isGenerating && (
                <motion.button initial={{opacity:0}} animate={{opacity:1}} whileTap={{scale:0.97}}
                  onClick={async () => {
                    setIsDownloading(true);
                    setError(null);
                    try {
                      if (viewMode !== "card") {
                        setViewMode("card");
                      }
                      await downloadPureImage(displayCard);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "下载失败，请稍后再试");
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                  disabled={isDownloading}
                  className="w-full py-3 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all
                    bg-gradient-to-r from-[#8875FF] to-[#5B4FD4] text-white shadow-xl shadow-[#8875FF]/20 disabled:opacity-60"
                >
                  {isDownloading
                    ? <><RefreshCw className="w-4 h-4 animate-spin" />下载中...</>
                    : <><Download className="w-4 h-4" />下载这张卡片</>
                  }
                </motion.button>
              )}
            </div>

            {/* Desktop spacer */}
            <div className="flex-1 hidden lg:block" />
          </div>

          {/* ── 历史梦境 ── */}
          {history.length > 0 && (
            <div>
              <p className="font-mono-tech text-[9px] text-[#3E3C50] uppercase tracking-widest mb-3">历史梦境卡片</p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {history.map((h, i) => (
                  <motion.div key={h.id ?? h.createdAt}
                    initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} transition={{delay:i*0.04}}
                    className="group relative flex w-[72px] shrink-0 flex-col gap-1"
                  >
                    <button type="button" onClick={() => selectHistoryCard(h)} className="text-left">
                      <div className={`w-[72px] h-24 rounded-xl overflow-hidden border relative transition-all ${
                        displayCard?.createdAt === h.createdAt
                          ? "border-[#8875FF] ring-1 ring-[#8875FF]/30"
                          : "border-[rgba(136,117,255,0.12)] group-hover:border-[rgba(136,117,255,0.28)]"
                      }`}>
                        {h.imageUrl
                          ? <img src={getDisplayImageUrl(h.imageUrl)} alt={h.title} crossOrigin="anonymous" className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-gradient-to-b from-[#1a1050] to-[#07050f] flex items-center justify-center">
                              <span className="text-lg font-serif-dream text-white/30">{h.symbol_emoji}</span>
                            </div>
                        }
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-1.5">
                          <span className="font-serif-dream text-[8px] text-white/85 leading-tight line-clamp-2">{h.title}</span>
                        </div>
                      </div>
                    </button>
                    {h.id ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDeletingCardId(h.id ?? null); }}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-red-400/20 bg-black/60 text-red-200 opacity-0 backdrop-blur transition-all hover:bg-red-500/20 group-hover:opacity-100 focus-visible:opacity-100"
                        aria-label="删除卡片"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    ) : null}
                    <AnimatePresence>
                      {h.id && deletingCardId === h.id ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-x-0 top-0 z-10 flex h-24 flex-col items-center justify-center gap-1 rounded-xl bg-[rgba(9,7,26,0.88)] p-1.5 text-center backdrop-blur-sm"
                        >
                          <span className="text-[10px] text-white/70">删除？</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => deleteCard(h)}
                              className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] text-red-100"
                            >
                              是
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingCardId(null)}
                              className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[9px] text-white/55"
                            >
                              否
                            </button>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                    <span className="font-mono-tech text-[8px] text-[#3E3C50] text-center">
                      {new Date(h.createdAt).toLocaleString("zh-CN",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 梦境档案选择弹层 ── */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowPicker(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-bright rounded-t-3xl md:rounded-3xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-white/[0.08]">
                <h3 className="font-serif-dream text-[16px] text-white mb-1">选择梦境</h3>
                <p className="text-[12px] text-white/40">从档案中选择要生成卡片的梦境</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {records.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-[13px] text-white/30 mb-4">暂无梦境档案</p>
                    <Link href="/?reset=true"
                      onClick={() => setShowPicker(false)}
                      className="text-[12px] text-[#8875FF] border border-[rgba(136,117,255,0.2)] px-5 py-2 rounded-full inline-block hover:bg-[rgba(136,117,255,0.08)] transition-all">
                      前往述梦 →
                    </Link>
                  </div>
                ) : (
                  records.map((rec) => (
                    <motion.button key={rec.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const em = rec.emotion;
                        const dt = rec.fullText ?? rec.excerpt;
                        const interp = rec.interpretation ?? null;
                        // 原子更新：一次 setState 避免 React 异步批处理导致旧值残留
                        setActiveDream({
                          recordId: rec.id,
                          emotion: em,
                          dreamText: dt,
                          excerpt: rec.excerpt,
                          keywords: interp?.keywords ?? rec.symbols ?? [],
                          interpretation: interp,
                        });
                        setShowPicker(false);
                        doGenerate(em, dt, interp);
                      }}
                      className="w-full text-left p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-[rgba(136,117,255,0.2)] transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono-tech text-[9px] text-[#8875FF]/60">{rec.id}</span>
                        <span className="font-mono-tech text-[10px] text-white/25">{rec.date}</span>
                      </div>
                      <p className="text-[13px] text-white/60 line-clamp-1 font-serif-dream">
                        「{rec.excerpt}」
                      </p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {rec.symbols.slice(0, 3).map((sym: string, i: number) => (
                          <span key={i} className="text-[9px] text-white/30 font-mono-tech">#{sym}</span>
                        ))}
                      </div>
                    </motion.button>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-white/[0.08]">
                <button
                  onClick={() => setShowPicker(false)}
                  className="w-full py-2.5 rounded-xl text-[12px] text-white/40 border border-white/[0.08] hover:bg-white/[0.04] transition-all">
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
