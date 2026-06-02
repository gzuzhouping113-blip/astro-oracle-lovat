"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Moon, UserPlus } from "lucide-react";
import { useAuth } from "@/components/astro/auth-context";

export function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        await login(identifier, password);
      } else {
        await register(username, email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后再试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-svh flex items-center justify-center px-4 py-10 bg-[radial-gradient(circle_at_50%_0%,rgba(136,117,255,0.18),transparent_38%),#09071A]">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md glass-bright rounded-2xl border border-[rgba(136,117,255,0.18)] p-6 shadow-2xl shadow-black/30"
      >
        <div className="flex items-center gap-3 mb-7">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8875FF] to-[#4B3FD4] flex items-center justify-center shadow-lg shadow-[#8875FF]/25">
            <Moon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-cinzel text-[15px] font-semibold tracking-[0.15em] text-white">
              解梦 · ORACLE
            </h1>
            <p className="font-mono-tech text-[10px] text-white/35 tracking-widest mt-1">
              私人梦境档案登录
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-white/[0.08] mb-6">
          {(["login", "register"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setMode(item);
                setError(null);
              }}
              className={`py-2.5 text-[12px] font-mono-tech tracking-wider transition-all ${
                mode === item
                  ? "bg-[rgba(136,117,255,0.18)] text-white"
                  : "text-white/35 hover:text-white/65"
              }`}
            >
              {item === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "login" ? (
            <label className="flex flex-col gap-2">
              <span className="font-mono-tech text-[10px] text-white/35 tracking-widest">账号或邮箱</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-3 text-sm text-white outline-none focus:border-[#8875FF]/60"
                placeholder="输入账号或邮箱"
                autoComplete="username"
              />
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-2">
                <span className="font-mono-tech text-[10px] text-white/35 tracking-widest">账号</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-3 text-sm text-white outline-none focus:border-[#8875FF]/60"
                  placeholder="3-24 位字母、数字或下划线"
                  autoComplete="username"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-mono-tech text-[10px] text-white/35 tracking-widest">邮箱 <span className="text-white/20">(可选)</span></span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-3 text-sm text-white outline-none focus:border-[#8875FF]/60"
                  placeholder="用于之后找回账号"
                  autoComplete="email"
                />
              </label>
            </>
          )}

          <label className="flex flex-col gap-2">
            <span className="font-mono-tech text-[10px] text-white/35 tracking-widest">密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-3 text-sm text-white outline-none focus:border-[#8875FF]/60"
              placeholder={mode === "register" ? "至少 8 位" : "输入密码"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {error ? (
            <p className="text-[12px] text-red-300/85 leading-relaxed">{error}</p>
          ) : (
            <p className="text-[11px] text-white/25 leading-relaxed">
              梦境数据会保存到你的私人账号下，密码只会以加密哈希保存。
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 flex items-center justify-center gap-2 rounded-full bg-[#8875FF] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#8875FF]/25 transition-colors hover:bg-[#9A88FF] disabled:opacity-45"
          >
            {mode === "login" ? <Lock className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {isSubmitting ? "处理中..." : mode === "login" ? "登录" : "创建账号"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

