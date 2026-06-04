import { Suspense } from "react";
import { DarkVoidCanvas } from "@/components/astro/dark-void-canvas";
import { DreamerScreen } from "@/components/astro/dreamer-screen";

export default function DreamerPage() {
  return (
    <div className="relative min-h-[500px] flex flex-col overflow-hidden">
      <div className="absolute -inset-x-4 -top-6 -bottom-6 md:-inset-x-8 lg:inset-y-0 lg:inset-x-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,rgba(24,47,86,0.55),rgba(9,7,26,0.08)_58%,transparent_82%)]">
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
