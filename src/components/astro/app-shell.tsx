"use client";
import { AuthProvider, useAuth } from "@/components/astro/auth-context";
import { AuthScreen } from "@/components/astro/auth-screen";
import { DreamProvider } from "@/components/astro/dream-context";
import { OracleHeader } from "@/components/astro/oracle-nav";
import { OracleSidebar } from "@/components/astro/oracle-nav";
import { OracleBottomNav } from "@/components/astro/oracle-nav";
import { ErrorBoundary } from "@/components/astro/error-boundary";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthenticatedShell>{children}</AuthenticatedShell>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-[#09071A]">
        <div className="w-7 h-7 rounded-full border-2 border-t-transparent border-[#8875FF] animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <DreamProvider>
      <OracleHeader />
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 pb-20 lg:pb-6 flex gap-6 items-start">
        <OracleSidebar />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
      <OracleBottomNav />
    </DreamProvider>
  );
}
