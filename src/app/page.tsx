import { Suspense } from "react";
import { DarkVoidCanvas } from "@/components/astro/dark-void-canvas";
import { DreamerScreen } from "@/components/astro/dreamer-screen";

export default function DreamerPage() {
  return (
    <div className="relative min-h-[500px] flex flex-col">
      <div className="absolute inset-0 rounded-2xl overflow-hidden bg-black/40 border border-white/5 z-0 pointer-events-none">
        <DarkVoidCanvas />
      </div>
      <div className="relative z-10 p-4 md:p-6 lg:p-8 flex-1 flex flex-col">
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-[#7F77DD] animate-spin" />
          </div>
        }>
          <DreamerScreen />
        </Suspense>
      </div>
    </div>
  );
}
