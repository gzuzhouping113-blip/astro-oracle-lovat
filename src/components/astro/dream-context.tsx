"use client";
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { DreamInterpretation, DreamRecord } from "@/lib/dream-types";

interface DreamStore {
  emotion: string;
  dreamText: string;
  realityTrigger: string;
  currentStep: number;
  interpretation: DreamInterpretation | null;
  isLoading: boolean;
  streamBuffer: string;
  records: DreamRecord[];
  currentRecordId: string | null;
  isSaved: boolean;
  setEmotion: (v: string) => void;
  setDreamText: (v: string) => void;
  setRealityTrigger: (v: string) => void;
  setCurrentStep: (v: number) => void;
  setInterpretation: (v: DreamInterpretation | null) => void;
  triggerInterpret: () => Promise<void>;
  saveDream: (onSuccess?: () => void) => void;
  deleteDream: (id: string) => void;
  resetDream: () => void;
}

const DreamContext = createContext<DreamStore | null>(null);
const SESSION_KEY = "dream-session";

// 安全读写——只在浏览器端执行
function ssGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function ssSave(key: string, data: object) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch {}
}

export function DreamProvider({ children }: { children: React.ReactNode }) {
  const [emotion, setEmotionState] = useState("迷茫 / Bewildered");
  const [dreamText, setDreamTextState] = useState("");
  const [realityTrigger, setRealityTriggerState] = useState("");
  const [currentStep, setCurrentStepState] = useState(1);
  const [interpretation, setInterpretation] = useState<DreamInterpretation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [records, setRecords] = useState<DreamRecord[]>([]);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // 客户端 hydration：从 sessionStorage 恢复跨页状态
  useEffect(() => {
    const raw = ssGet(SESSION_KEY);
    if (raw) {
      try {
        const session = JSON.parse(raw);
        if (session.emotion) setEmotionState(session.emotion);
        if (session.dreamText) setDreamTextState(session.dreamText);
        if (session.realityTrigger) setRealityTriggerState(session.realityTrigger);
        if (session.currentStep) setCurrentStepState(session.currentStep);
        if (session.interpretation) setInterpretation(session.interpretation);
      } catch {}
    }
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/dream/records")
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (active) setRecords(data.records ?? []);
      })
      .catch((err) => {
        console.error("Load dream records error:", err);
        if (active) setRecords([]);
      });

    return () => { active = false; };
  }, []);

  // 同步写入 sessionStorage（只在浏览器端）
  const syncSession = useCallback((patch: object) => {
    const raw = ssGet(SESSION_KEY);
    let prev: object = {};
    if (raw) { try { prev = JSON.parse(raw); } catch {} }
    ssSave(SESSION_KEY, { ...prev, ...patch });
  }, []);

  const setEmotion = useCallback((v: string) => {
    setEmotionState(v);
    syncSession({ emotion: v });
  }, [syncSession]);

  const setDreamText = useCallback((v: string) => {
    setDreamTextState(v);
    syncSession({ dreamText: v });
  }, [syncSession]);

  const setRealityTrigger = useCallback((v: string) => {
    setRealityTriggerState(v);
    syncSession({ realityTrigger: v });
  }, [syncSession]);

  const setCurrentStep = useCallback((v: number) => {
    setCurrentStepState(v);
    syncSession({ currentStep: v });
  }, [syncSession]);

  const setInterpretationWrapped = useCallback((v: DreamInterpretation | null) => {
    setInterpretation(v);
    setIsSaved(false);
    syncSession({ interpretation: v });
  }, [syncSession]);

  // 自动保存到档案（内部调用，不需要 onSuccess 回调）
  const autoSaveDream = useCallback(async (interp: DreamInterpretation) => {
    if (!dreamText.trim()) return;
    try {
      const res = await fetch("/api/dream/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotion, dreamText, realityTrigger, interpretation: interp }),
      });
      const data = await res.json();
      if (!res.ok || !data.record) throw new Error(data.error ?? "保存失败");

      const newRecord = data.record as DreamRecord;
      setCurrentRecordId(newRecord.id);
      setIsSaved(true);
      setRecords(prev => {
        if (prev.some(r => r.id === newRecord.id)) return prev;
        return [newRecord, ...prev];
      });
    } catch (err) {
      console.error("Auto save dream error:", err);
    }
  }, [dreamText, emotion, realityTrigger]);

  const triggerInterpret = useCallback(async () => {
    if (!dreamText.trim()) return;
    setIsLoading(true);
    setStreamBuffer("");
    setInterpretation(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };

      const res = await fetch("/api/dream/interpret", {
        method: "POST",
        headers,
        body: JSON.stringify({ emotion, dreamText, realityTrigger }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamBuffer(accumulated);
      }

      // 提取 JSON（模型可能在 JSON 外包了 markdown 代码块）
      const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as DreamInterpretation;
        setInterpretation(parsed);
        setIsSaved(false);
        syncSession({ interpretation: parsed });
        // 解析完成后自动保存到档案
        await autoSaveDream(parsed);
      }
    } catch (err) {
      console.error("Interpret error:", err);
      const fallback: DreamInterpretation = {
        action: "interpret",
        dream_summary: "解析遇到了一点问题，以下为参考内容",
        keywords: ["梦境", "潜意识"],
        mood: "surreal",
        interpretations: {
          traditional: {
            title: "传统象征",
            content: "梦境中的意象在传统解梦体系中往往象征心灵的转折与现实的映照，建议结合近期生活状态加以理解。",
            fortune_tone: "中性",
            advice: "宜静心思考，不宜急于行动。",
          },
          psychological: {
            title: "心理分析",
            content: "梦境或许是潜意识在处理日常压力或未完成的情感事件，值得留意梦中的情绪感受。",
            insight: "内心可能正在寻求某种平衡或释放。",
            advice: "可以尝试写梦境日记，记录反复出现的意象。",
          },
          cognitive: {
            title: "认知与睡眠机制",
            content: "大脑在睡眠中整合记忆、调节情绪，梦境是这一过程的自然呈现，无需过度解读。",
            advice: "保持规律作息，有助于提升睡眠质量和梦境记忆。",
          },
        },
        overall_advice: "梦境是自我了解的一扇窗，保持好奇而非焦虑的态度去观察它。",
        disclaimer: "梦境解析仅供自我理解和娱乐参考，不等同于诊断或预言。",
      };
      setInterpretation(fallback);
      setIsSaved(false);
      syncSession({ interpretation: fallback });
    } finally {
      setIsLoading(false);
    }
  }, [emotion, dreamText, realityTrigger, syncSession, autoSaveDream]);

  const saveDream = useCallback((onSuccess?: () => void) => {
    if (!dreamText.trim()) return;
    if (isSaved) return;

    void (async () => {
      await autoSaveDream(interpretation ?? {
        action: "interpret",
        dream_summary: dreamText.length > 20 ? `${dreamText.substring(0, 20)}...` : dreamText,
        keywords: [],
        mood: "surreal",
        interpretations: {
          traditional: { title: "", content: "", fortune_tone: "", advice: "" },
          psychological: { title: "", content: "", insight: "", advice: "" },
          cognitive: { title: "", content: "", advice: "" },
        },
        overall_advice: "",
        disclaimer: "",
      });
      setIsSaved(true);
      if (onSuccess) onSuccess();
    })();
  }, [dreamText, interpretation, isSaved, autoSaveDream]);

  const resetDream = useCallback(() => {
    setDreamTextState("");
    setRealityTriggerState("");
    setCurrentStepState(1);
    setInterpretation(null);
    setStreamBuffer("");
    setEmotionState("迷茫 / Bewildered");
    setCurrentRecordId(null);
    setIsSaved(false);
    if (typeof window !== "undefined") {
      try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    }
  }, []);

  const deleteDream = useCallback((id: string) => {
    const previousRecords = records;
    setRecords(prev => {
      return prev.filter(r => r.id !== id);
    });
    void fetch(`/api/dream/records/${encodeURIComponent(id)}`, { method: "DELETE" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      })
      .catch((err) => {
        console.error("Delete dream error:", err);
        setRecords(previousRecords);
      });
  }, [records]);

  return (
    <DreamContext.Provider
      value={{
        emotion, dreamText, realityTrigger, currentStep,
        interpretation, isLoading, streamBuffer,
        records, currentRecordId, isSaved,
        setEmotion, setDreamText, setRealityTrigger, setCurrentStep,
        setInterpretation: setInterpretationWrapped,
        triggerInterpret, saveDream, deleteDream, resetDream,
      }}
    >
      {children}
    </DreamContext.Provider>
  );
}

export function useDream() {
  const ctx = useContext(DreamContext);
  if (!ctx) throw new Error("useDream must be used within DreamProvider");
  return ctx;
}
