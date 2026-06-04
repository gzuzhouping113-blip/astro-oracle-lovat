"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Star, Trash2, ChevronLeft, Plus, ImageIcon } from "lucide-react";
import Link from "next/link";
import { useDream } from "@/components/astro/dream-context";
import { useRouter } from "next/navigation";
import type { DreamRecord } from "@/lib/dream-types";

interface ArchiveCard {
  id?: string;
  dreamRecordId?: string | null;
  title: string;
  imageUrl?: string;
  symbol_emoji?: string;
  createdAt: number;
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

/* ── Date utilities ──────────────────────────── */
function parseRecordDate(dateStr: string): Date {
  const normalized = dateStr.replace(/\./g, "/");
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date() : d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

/* ── Calendar panel ─────────────────────────── */
function CalendarPanel({
  year, month, recordDates, selectedDate, onSelectDate,
}: {
  year: number;
  month: number;
  recordDates: Date[];
  selectedDate: Date | null;
  onSelectDate: (d: Date | null) => void;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = startOfMonth(year, month).getDay(); // 0=Sun
  const today = new Date();

  // Build grid cells: empty slots + day numbers
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="text-center font-mono-tech text-[9px] text-white/25 py-1">{w}</div>
        ))}
      </div>
      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;

          const cellDate = new Date(year, month, day);
          const hasRecord = recordDates.some(rd => isSameDay(rd, cellDate));
          const isToday = isSameDay(cellDate, today);
          const isSelected = selectedDate ? isSameDay(cellDate, selectedDate) : false;

          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSelectDate(isSelected ? null : cellDate)}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all ${
                isSelected
                  ? "bg-[rgba(136,117,255,0.28)] border border-[rgba(136,117,255,0.45)]"
                  : isToday
                  ? "bg-[rgba(136,117,255,0.1)] border border-[rgba(136,117,255,0.2)]"
                  : "hover:bg-white/[0.05]"
              }`}
            >
              <span className={`text-[12px] font-medium leading-none ${
                isSelected ? "text-white" : isToday ? "text-[#8875FF]" : "text-white/60"
              }`}>
                {day}
              </span>
              <span className={`w-1 h-1 rounded-full transition-all ${
                hasRecord ? "bg-[#4ade80]" : "invisible"
              }`} />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────── */
export function ArchiveScreen() {
  const [mounted, setMounted] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [cardHistory, setCardHistory] = useState<ArchiveCard[]>([]);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const { records, setEmotion, setDreamText, setInterpretation, setCurrentStep, deleteDream } = useDream();
  const router = useRouter();

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

  /* 所有记录日期（用于日历标点） */
  const recordDates = useMemo(() =>
    records.map(r => { const d = parseRecordDate(r.date); d.setHours(0,0,0,0); return d; }),
  [records]);

  /* 近30天 + 按时间倒序，如果选中了某天则只显示那天 */
  const filteredRecords = useMemo(() => {
    const now = Date.now();
    if (selectedDate) {
      return records.filter(r => isSameDay(parseRecordDate(r.date), selectedDate))
        .sort((a, b) => parseRecordDate(b.date).getTime() - parseRecordDate(a.date).getTime());
    }
    return records
      .filter(r => (now - parseRecordDate(r.date).getTime()) / 86400000 <= 30)
      .sort((a, b) => parseRecordDate(b.date).getTime() - parseRecordDate(a.date).getTime());
  }, [records, selectedDate]);

  const cardByRecordId = useMemo(() => {
    const map = new Map<string, ArchiveCard>();
    cardHistory.forEach((card) => {
      if (card.dreamRecordId && !map.has(card.dreamRecordId)) {
        map.set(card.dreamRecordId, card);
      }
    });
    return map;
  }, [cardHistory]);

  const handleOpen = (record: DreamRecord) => {
    setEmotion(record.emotion);
    setDreamText(record.fullText ?? record.excerpt);
    setInterpretation(record.interpretation ?? null);
    setCurrentStep(3);
    router.push("/parser");
  };

  const prevMonth = useCallback(() => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setSelectedDate(null);
  }, [calMonth]);

  const nextMonth = useCallback(() => {
    const now = new Date();
    if (calYear > now.getFullYear() || (calYear === now.getFullYear() && calMonth >= now.getMonth())) return;
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setSelectedDate(null);
  }, [calMonth, calYear]);

  const isAtCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

  if (!mounted) return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="w-7 h-7 rounded-full border-2 border-t-transparent border-[#8875FF] animate-spin" />
    </div>
  );

  return (
    /* 点击空白处取消选中日期 */
    <div className="w-full flex-1 flex flex-col gap-5" onClick={() => setSelectedDate(null)}>

      <Link
        href="/?reset=true"
        onClick={(e) => e.stopPropagation()}
        className="glass-bright group flex items-center justify-between rounded-2xl border border-[rgba(136,117,255,0.2)] p-4 transition-all hover:border-[rgba(136,117,255,0.36)] hover:bg-white/[0.045]"
      >
        <div>
          <p className="font-mono-tech text-[10px] tracking-widest text-[#8875FF]/75">NEW DREAM</p>
          <p className="mt-1 font-serif-dream text-[16px] text-white">叙述新的梦境</p>
          <p className="mt-1 text-[12px] text-white/35">新的解析会自动保存到梦境档案，并关联生成的卡片。</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8875FF]/20 text-[#8875FF] transition-all group-hover:bg-[#8875FF]/30">
          <Plus className="h-4 w-4" />
        </div>
      </Link>

      {/* ── 日历面板 ── */}
      <div className="glass-panel rounded-2xl p-4" onClick={e => e.stopPropagation()}>
        {/* 月份导航 */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <span className="font-mono-tech text-[13px] font-semibold text-white/80 tracking-widest">
              {calYear} / {String(calMonth + 1).padStart(2, "0")}
            </span>
          </div>

          <button onClick={nextMonth}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              isAtCurrentMonth
                ? "text-white/15 cursor-not-allowed"
                : "text-white/30 hover:text-white/70 hover:bg-white/[0.06]"
            }`}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <CalendarPanel
          year={calYear}
          month={calMonth}
          recordDates={recordDates}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </div>

      {/* ── 列表标题 ── */}
      <div className="flex items-center justify-between">
        <span className="font-mono-tech text-[10px] text-white/25 tracking-wider">
          {selectedDate
            ? `${selectedDate.getMonth() + 1} 月 ${selectedDate.getDate()} 日 · ${filteredRecords.length} 条`
            : `近 30 天 · ${filteredRecords.length} 条`}
        </span>
        {selectedDate && (
          <button onClick={() => setSelectedDate(null)}
            className="font-mono-tech text-[10px] text-[#8875FF] hover:text-white/60 transition-colors">
            查看全部
          </button>
        )}
      </div>

      {/* ── 列表 ── */}
      {filteredRecords.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[rgba(136,117,255,0.07)] border border-[rgba(136,117,255,0.12)] flex items-center justify-center mb-4">
            <Star className="w-5 h-5 text-[#8875FF]/30" />
          </div>
          <p className="font-serif-dream text-[14px] text-white/40 mb-2">
            {selectedDate ? "这天还没有梦境记录" : "近 30 天暂无梦境记录"}
          </p>
          <p className="text-[12px] text-white/20 mb-5">解析梦境后将自动保存到档案</p>
          <Link href="/?reset=true"
            className="text-[12px] text-[#8875FF]/70 border border-[rgba(136,117,255,0.2)] px-5 py-2 rounded-full hover:bg-[rgba(136,117,255,0.08)] transition-all">
            开始记录 →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <AnimatePresence>
            {filteredRecords.map((rec) => (
              (() => {
                const card = cardByRecordId.get(rec.id);
                const cardImage = getDisplayImageUrl(card?.imageUrl);
                return (
              <motion.div key={rec.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.22 }}
                className="relative"
              >
                {/* 删除确认遮罩 */}
                <AnimatePresence>
                  {deletingId === rec.id && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 rounded-2xl bg-[rgba(9,7,26,0.93)] backdrop-blur-sm
                        flex items-center justify-center gap-3 border border-red-500/20"
                    >
                      <span className="text-[12px] text-white/60 font-serif-dream">确认删除？</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteDream(rec.id); setDeletingId(null); }}
                        className="px-3 py-1 rounded-lg bg-red-500/15 text-red-300 text-[11px] border border-red-500/20 hover:bg-red-500/25 transition-all">
                        删除
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                        className="px-3 py-1 rounded-lg bg-white/[0.04] text-white/40 text-[11px] border border-white/[0.08] hover:bg-white/[0.08] transition-all">
                        取消
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div
                  onClick={(e) => { e.stopPropagation(); handleOpen(rec); }}
                  className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center
                    gap-3 group cursor-pointer hover:border-[rgba(136,117,255,0.18)] transition-all"
                >
                  <div className="h-20 w-full shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] md:h-24 md:w-20">
                    {cardImage ? (
                      <img src={cardImage} alt={card?.title ?? rec.excerpt} crossOrigin="anonymous" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle,rgba(136,117,255,0.18),rgba(9,7,26,0.2))]">
                        <ImageIcon className="h-5 w-5 text-white/25" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono-tech text-[9px] text-[#8875FF]/70">{rec.id}</span>
                      <span className="font-mono-tech text-[10px] text-white/20">{rec.date}</span>
                      <span className="font-serif-dream text-[11px] text-white/50">
                        {rec.emotion.split(" / ")[0]}
                      </span>
                    </div>
                    {card ? (
                      <p className="mb-1.5 font-mono-tech text-[9px] tracking-widest text-[#C9963A]/65">
                        已关联卡片 · {card.title}
                      </p>
                    ) : null}
                    <p className="text-[13px] text-white/55 line-clamp-1 leading-relaxed font-serif-dream mb-1.5">
                      「{rec.excerpt}」
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {rec.symbols.map((sym: string, i: number) => (
                        <span key={i} className="font-mono-tech text-[9px] bg-white/[0.04] text-white/30 px-2 py-0.5 rounded-full border border-white/[0.06]">
                          #{sym}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingId(rec.id); }}
                      className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100
                        hover:bg-red-500/12 transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-white/25 hover:text-red-400 transition-colors" />
                    </button>
                    <div className="w-7 h-7 rounded-xl bg-white/[0.03] flex items-center justify-center
                      group-hover:bg-[rgba(136,117,255,0.12)] transition-all">
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-[#8875FF] transition-colors" />
                    </div>
                  </div>
                </div>
              </motion.div>
                );
              })()
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── 底部 ── */}
      <div className="mt-1 pt-4 border-t border-white/[0.05] flex justify-between items-center">
        <span className="font-mono-tech text-[9px] text-white/15">共 {records.length} 条</span>
        <Link href="/?reset=true"
          className="flex items-center gap-1.5 font-mono-tech text-[10px] text-white/25 hover:text-white/50 transition-colors">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}>
            <Star className="w-2.5 h-2.5" />
          </motion.div>
          记录新的夜梦
        </Link>
      </div>
    </div>
  );
}
