"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export interface WeeklyAnalysis {
  periodLabel: string;
  dreamCount: number;
  current_state: string;
  self_awareness: string;
  recurring_symbols: string[];
  emotion_pattern: string;
  reality_reflection: string;
  suggestions: string[];
  gentle_warning: string;
  disclaimer: string;
}

export interface WeeklyReport {
  analysis: WeeklyAnalysis | null;
  dreamCount: number;
  weekStart: string;
  weekEnd: string;
  generatedAt?: string;
  needsRefresh?: boolean;
}

interface WeeklyReportContextValue {
  report: WeeklyReport | null;
  error: string | null;
  isPreloading: boolean;
  isRegenerating: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  regenerate: () => Promise<void>;
}

const WeeklyReportContext = createContext<WeeklyReportContextValue | null>(null);

async function readWeeklyReport(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({})) as WeeklyReport & { error?: string };
  if (!response.ok) throw new Error(data.error ?? fallback);
  return data;
}

function readCachedReport(userId: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`dream-weekly-report:${userId}`);
    return raw ? JSON.parse(raw) as WeeklyReport : null;
  } catch {
    return null;
  }
}

function saveCachedReport(userId: string, report: WeeklyReport) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`dream-weekly-report:${userId}`, JSON.stringify(report));
  } catch {}
}

export function WeeklyReportProvider({ children, userId }: { children: React.ReactNode; userId: string }) {
  const [report, setReport] = useState<WeeklyReport | null>(() => readCachedReport(userId));
  const [error, setError] = useState<string | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const inflightRef = useRef<Promise<void> | null>(null);
  const regenerateRef = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inflightRef.current) return inflightRef.current;

    const task = (async () => {
      setIsPreloading(true);
      setError(null);

      try {
        const data = await fetch("/api/dream/weekly-analysis?preferCache=1", { method: "GET" })
          .then((response) => readWeeklyReport(response, "读取本周梦境周报失败"));
        setReport(data);
        saveCachedReport(userId, data);

        if (data.needsRefresh && !regenerateRef.current) {
          setIsRefreshing(true);
          regenerateRef.current = fetch("/api/dream/weekly-analysis", { method: "POST" })
            .then((response) => readWeeklyReport(response, "生成本周梦境周报失败"))
            .then((freshData) => {
              setReport(freshData);
              saveCachedReport(userId, freshData);
            })
            .catch((err) => {
              setError(err instanceof Error ? err.message : "生成本周梦境周报失败");
            })
            .finally(() => {
              setIsRefreshing(false);
              regenerateRef.current = null;
            });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "读取本周梦境周报失败");
      } finally {
        setIsPreloading(false);
        inflightRef.current = null;
      }
    })();

    inflightRef.current = task;
    return task;
  }, [userId]);

  const regenerate = useCallback(async () => {
    if (regenerateRef.current) {
      setIsRegenerating(true);
      try {
        await regenerateRef.current;
      } finally {
        setIsRegenerating(false);
      }
      return;
    }

    setIsRegenerating(true);
    setError(null);

    try {
      const data = await fetch("/api/dream/weekly-analysis", { method: "POST" })
        .then((response) => readWeeklyReport(response, "生成本周梦境周报失败"));
      setReport(data);
      saveCachedReport(userId, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成本周梦境周报失败");
    } finally {
      setIsRegenerating(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({
    report,
    error,
    isPreloading,
    isRegenerating,
    isRefreshing,
    refresh,
    regenerate,
  }), [error, isPreloading, isRefreshing, isRegenerating, refresh, regenerate, report]);

  return (
    <WeeklyReportContext.Provider value={value}>
      {children}
    </WeeklyReportContext.Provider>
  );
}

export function useWeeklyReport() {
  const context = useContext(WeeklyReportContext);
  if (!context) throw new Error("useWeeklyReport must be used within WeeklyReportProvider");
  return context;
}
