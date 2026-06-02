import { Suspense } from "react";
import { DarkVoidCanvas } from "@/components/astro/dark-void-canvas";
import { CardScreen } from "@/components/astro/card-screen";

export default function CardPage() {
  return (
    <div className="relative min-h-[500px] flex flex-col">
      <div className="absolute inset-0 rounded-2xl overflow-hidden bg-black/40 border border-white/5 z-0 pointer-events-none">
        <DarkVoidCanvas />
      </div>
      <div className="relative z-10 p-4 md:p-6 lg:p-8 flex-1 flex flex-col">
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent border-[#8875FF] animate-spin" />
          </div>
        }>
          <CardScreen />
        </Suspense>
      </div>
    </div>
  );
}
