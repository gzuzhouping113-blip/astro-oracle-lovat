import { DarkVoidCanvas } from "@/components/astro/dark-void-canvas";
import { ParserScreen } from "@/components/astro/parser-screen";

export default function ParserPage() {
  return (
    <div className="relative flex flex-col" style={{ minHeight: 500 }}>
      <div className="absolute inset-0 rounded-2xl overflow-hidden bg-black/40 border border-white/5 z-0 pointer-events-none">
        <DarkVoidCanvas />
      </div>
      <div className="relative z-10 p-4 md:p-6 lg:p-8 flex-1 flex flex-col">
        <ParserScreen />
      </div>
    </div>
  );
}
