"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Share2, BookOpen, Brain, Cpu, Eye } from "lucide-react";
import Link from "next/link";
import { useDream } from "@/components/astro/dream-context";
import { MOOD_LABELS, FORTUNE_COLORS } from "@/lib/dream-types";

function Skel({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

/* Reusable section card */
function SectionCard({
  icon, label, accent, children,
}: {
  icon: React.ReactNode; label: string; accent: string; children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl p-5 border ${accent} flex flex-col gap-3`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-mono-tech text-[10px] tracking-widest text-[#6A677E] uppercase">{label}</span>
      </div>
      {children}
    </motion.div>
  );
}

export function ParserScreen() {
  const [mounted, setMounted] = useState(false);
  const { interpretation, isLoading, emotion } = useDream();

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent border-[#8875FF] animate-spin" />
    </div>
  );

  /* ── Loading skeleton ── */
  if (isLoading) return (
    <div className="w-full flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-10">
        <div className="relative w-20 h-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-[#2DD4BF]/50" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-3 rounded-full border border-[#8875FF]/40" />
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
            className="absolute inset-6 rounded-full bg-[rgba(136,117,255,0.15)]" />
        </div>
        <div className="text-center">
          <p className="font-mono-tech text-[12px] text-white/80 tracking-widest animate-pulse">正在解析梦境...</p>
          <p className="font-serif-dream text-[11px] text-[#6A677E] mt-1.5">周公解梦 × 荣格心理学双轨分析中</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="glass rounded-2xl p-5 flex flex-col gap-3">
          <Skel className="h-3 w-36" /><Skel className="h-3 w-full" /><Skel className="h-3 w-5/6" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="glass rounded-2xl p-4 flex flex-col gap-2">
            <Skel className="h-3 w-32" /><Skel className="h-12 w-full" />
          </div>
          <div className="glass rounded-2xl p-4 flex flex-col gap-2">
            <Skel className="h-3 w-32" /><Skel className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Empty ── */
  if (!interpretation) return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-[rgba(136,117,255,0.08)] border border-[rgba(136,117,255,0.15)] flex items-center justify-center mb-5">
        <Sparkles className="w-7 h-7 text-[#8875FF]/50" />
      </div>
      <h3 className="font-serif-dream text-[16px] text-white mb-2">星盘尚未激活</h3>
      <p className="text-[13px] text-[#6A677E] mb-7 max-w-xs leading-relaxed">前往述梦界面描述你的梦境，完成仪式后激活解析引擎</p>
      <Link href="/" className="bg-gradient-to-r from-[#8875FF] to-[#5B4FD4] text-white text-[13px] font-semibold px-7 py-3 rounded-full shadow-lg shadow-[#8875FF]/25">
        前往述梦 →
      </Link>
    </div>
  );

  const tr = interpretation.interpretations?.traditional;
  const ps = interpretation.interpretations?.psychological;
  const cg = interpretation.interpretations?.cognitive;

  return (
    <div className="w-full flex-1 flex flex-col">
      {/* Channel header */}
      <div className="flex items-center justify-end mb-6 gap-2">
        <span className="font-mono-tech text-[10px] text-[#6A677E]">情绪：</span>
        <span className="font-serif-dream text-[12px] text-[#C9963A]">{emotion.split(" / ")[0]}</span>
        {interpretation.mood && (
          <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded-full
            bg-[rgba(45,212,191,0.1)] text-[#2DD4BF] border border-[rgba(45,212,191,0.2)]">
            {MOOD_LABELS[interpretation.mood] ?? interpretation.mood}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {/* Dream summary + keywords */}
        <div className="glass-bright rounded-2xl p-5">
          {interpretation.dream_summary && (
            <p className="font-serif-dream text-[15px] text-white leading-relaxed border-l-2 border-[#8875FF] pl-3.5 mb-4">
              {interpretation.dream_summary}
            </p>
          )}
          {interpretation.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {interpretation.keywords.map((kw: string, i: number) => (
                <span key={i} className="font-mono-tech text-[10px] px-2.5 py-1 rounded-full
                  bg-[rgba(136,117,255,0.1)] text-[#8875FF] border border-[rgba(136,117,255,0.2)]">
                  #{kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Three interpretation cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Eastern */}
          {tr && (
            <SectionCard
              icon={<BookOpen className="w-3.5 h-3.5 text-[#C9963A]" />}
              label="东方传统象征"
              accent="border-[rgba(201,150,58,0.2)]"
            >
              {tr.fortune_tone && (
                <span className={`font-mono-tech text-[11px] font-semibold ${FORTUNE_COLORS[tr.fortune_tone] ?? "text-[#A9A6C4]"}`}>
                  {tr.fortune_tone}
                </span>
              )}
              <p className="text-[13px] text-[#A9A6C4] leading-relaxed">{tr.content}</p>
              {tr.advice && (
                <p className="font-serif-dream text-[12px] text-[#C9963A] italic border-t border-[rgba(201,150,58,0.15)] pt-2.5">
                  {tr.advice}
                </p>
              )}
              <blockquote className="text-[11px] text-[#6A677E] italic leading-relaxed border-l border-[rgba(201,150,58,0.3)] pl-3 mt-1">
                「这可能不是&quot;失去方向&quot;，而是你的心在用迷途换取新的指引。」
              </blockquote>
            </SectionCard>
          )}

          {/* Psychological */}
          {ps && (
            <SectionCard
              icon={<Brain className="w-3.5 h-3.5 text-[#2DD4BF]" />}
              label="心理分析"
              accent="border-[rgba(45,212,191,0.18)]"
            >
              <p className="text-[13px] text-[#A9A6C4] leading-relaxed">{ps.content}</p>
              {ps.insight && (
                <p className="font-serif-dream text-[12px] text-[#2DD4BF] italic border-t border-[rgba(45,212,191,0.15)] pt-2.5">
                  {ps.insight}
                </p>
              )}
              {ps.advice && (
                <p className="text-[11px] text-[#6A677E] leading-relaxed">{ps.advice}</p>
              )}
            </SectionCard>
          )}

          {/* Cognitive */}
          {cg && (
            <SectionCard
              icon={<Cpu className="w-3.5 h-3.5 text-[#8875FF]" />}
              label="认知与睡眠机制"
              accent="border-[rgba(136,117,255,0.18)]"
            >
              <p className="text-[13px] text-[#A9A6C4] leading-relaxed">{cg.content}</p>
              {cg.advice && (
                <p className="font-serif-dream text-[12px] text-[#8875FF] italic border-t border-[rgba(136,117,255,0.15)] pt-2.5">
                  {cg.advice}
                </p>
              )}
              <blockquote className="text-[11px] text-[#6A677E] italic leading-relaxed border-l border-[rgba(136,117,255,0.3)] pl-3 mt-1">
                「这可能不是&quot;失去行动力&quot;，而是你的心在用停下来换取恢复。」
              </blockquote>
            </SectionCard>
          )}
        </div>

        {/* Imagery analysis */}
        {interpretation.imagery && interpretation.imagery.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-5 border border-[rgba(136,117,255,0.15)]">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-3.5 h-3.5 text-[#8875FF]" />
              <span className="font-mono-tech text-[10px] tracking-widest text-[#6A677E] uppercase">意象解析</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {interpretation.imagery.slice(0, 5).map((img, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 + i * 0.06 }}
                  className="bg-[rgba(136,117,255,0.06)] border border-[rgba(136,117,255,0.12)] rounded-xl p-3.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-serif-dream text-[13px] text-white font-medium">
                      {img.symbol}
                    </span>
                    {img.archetype && (
                      <span className="font-mono-tech text-[9px] px-1.5 py-0.5 rounded bg-[rgba(136,117,255,0.12)] text-[#8875FF]">
                        {img.archetype}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#A9A6C4] leading-relaxed">{img.meaning}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Overall advice */}
        {interpretation.overall_advice && (
          <div className="glass rounded-2xl p-5 border border-[rgba(136,117,255,0.14)]">
            <p className="font-serif-dream text-[14px] text-[#E4E1F5] leading-relaxed">{interpretation.overall_advice}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-5 flex items-center justify-end gap-3 border-t border-[rgba(136,117,255,0.1)] pt-4">
        <span className="font-mono-tech text-[10px] text-[#3E3C50] mr-auto">
          梦境情绪：{emotion.split(" / ")[0]}
        </span>
        <Link href="/card?generate=1"
          className="flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2.5 rounded-xl transition-all
            bg-[rgba(136,117,255,0.14)] text-[#8875FF] border border-[rgba(136,117,255,0.25)] hover:bg-[rgba(136,117,255,0.22)]">
          <Share2 className="w-3.5 h-3.5" />
          生成分享卡
        </Link>

      </div>

      {interpretation.disclaimer && (
        <p className="font-mono-tech text-[9px] text-[#3E3C50] text-center mt-3">
          {interpretation.disclaimer}
        </p>
      )}
    </div>
  );
}
