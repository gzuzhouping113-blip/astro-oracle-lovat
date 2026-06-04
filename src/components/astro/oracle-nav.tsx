"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Compass, Sparkles, Share2, Clock, LogOut, User } from "lucide-react";
import { useAuth } from "@/components/astro/auth-context";
import { SITE_NAME, SITE_SUBTITLE } from "@/lib/site-config";

/* ── Shared design tokens ─────────────────── */
const P = "#8875FF";   // primary
const T = "#2DD4BF";   // teal accent
const G = "#C9963A";   // gold accent

const TAB_ITEMS = [
  { href: "/",        icon: Compass,  label: "述梦",  tab: "01" },
  { href: "/parser",  icon: Sparkles, label: "解析",  tab: "02" },
  { href: "/card",    icon: Share2,   label: "卡片",  tab: "03" },
  { href: "/archive", icon: Clock,    label: "档案",  tab: "04" },
];

/* ── Header ─────────────────────────────── */
export function OracleHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="px-5 lg:px-10 py-3.5 w-full sticky top-0 z-50 flex items-center justify-between
      bg-[rgba(9,7,26,0.85)] backdrop-blur-2xl border-b border-[rgba(136,117,255,0.1)]
      shadow-[0_1px_0_rgba(136,117,255,0.06)]"
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8 shrink-0">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#8875FF] to-[#4B3FD4]
            border border-white/15 flex items-center justify-center shadow-lg shadow-[#8875FF]/25">
            <Moon className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="absolute inset-0 rounded-full border border-[#2DD4BF]/30 animate-ping opacity-30" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-cinzel text-[13px] font-semibold tracking-[0.15em] text-white">{SITE_NAME}</h1>
            <span className="font-mono-tech text-[8px] px-1.5 py-0.5 rounded
              bg-[rgba(136,117,255,0.12)] text-[#8875FF] border border-[rgba(136,117,255,0.2)]">
              v2.0
            </span>
          </div>
          <p className="font-mono-tech text-[9px] text-[#6A677E] tracking-widest mt-0.5">
            {SITE_SUBTITLE}
          </p>
        </div>
      </div>

      {user ? (
        <button
          type="button"
          onClick={() => logout()}
          className="hidden sm:flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] text-white/45 transition-all hover:border-[#8875FF]/35 hover:text-white/75"
        >
          <User className="w-3.5 h-3.5 text-[#8875FF]" />
          <span className="font-mono-tech tracking-wider">{user.username}</span>
          <LogOut className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </header>
  );
}

/* ── Desktop sidebar ─────────────────────── */
export function OracleSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex flex-col gap-3.5 w-56 shrink-0">
      <div className="glass p-4 rounded-2xl flex flex-col gap-5">
        <div>
          <p className="font-mono-tech text-[9px] uppercase tracking-widest text-[#6A677E] mb-1">DREAM ARCHIVE</p>
          <p className="font-serif-dream text-xs text-[#8875FF]">梦境意识转换仪</p>
        </div>
        <nav className="flex flex-col gap-1.5">
          {TAB_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-[rgba(136,117,255,0.14)] border border-[rgba(136,117,255,0.22)] text-white"
                    : "text-[#6A677E] hover:text-[#A9A6C4] hover:bg-[rgba(255,255,255,0.04)]"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <item.icon className={`w-3.5 h-3.5 ${active ? "text-[#2DD4BF]" : ""}`} />
                  <span className="text-[13px] font-medium">{item.label}</span>
                </span>
                <span className={`font-mono-tech text-[9px] ${active ? "text-[#8875FF]" : "text-[#3E3C50]"}`}>
                  TAB {item.tab}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

    </aside>
  );
}

/* ── Mobile bottom nav ───────────────────── */
export function OracleBottomNav() {
  const pathname = usePathname();
  return (
    <footer className="block lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe
      bg-[rgba(9,7,26,0.92)] backdrop-blur-2xl border-t border-[rgba(136,117,255,0.1)]">
      <div className="grid grid-cols-4 pt-2.5 pb-1 px-2">
        {TAB_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-1 py-1 transition-all ${
                active ? "text-white" : "text-[#3E3C50]"
              }`}
            >
              <div className={`w-9 h-7 rounded-lg flex items-center justify-center transition-all ${
                active ? "bg-[rgba(136,117,255,0.18)]" : ""
              }`}>
                <item.icon className={`w-4 h-4 ${active ? "text-[#8875FF]" : ""}`} />
              </div>
              <span className={`text-[10px] tracking-wide font-medium ${
                active ? "text-[#A9A6C4]" : "text-[#3E3C50]"
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </footer>
  );
}

// suppress unused variable warnings
void P; void T; void G;
