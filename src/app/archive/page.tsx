import { DarkVoidCanvas } from "@/components/astro/dark-void-canvas";
import { ArchiveScreen } from "@/components/astro/archive-screen";

export default function ArchivePage() {
  return (
    <div className="relative min-h-[500px] flex flex-col">
      <div className="absolute inset-0 rounded-2xl overflow-hidden bg-black/40 border border-white/5 z-0 pointer-events-none">
        <DarkVoidCanvas />
      </div>
      <div className="relative z-10 p-4 md:p-6 lg:p-8 flex-1 flex flex-col">
        <ArchiveScreen />
      </div>
    </div>
  );
}
