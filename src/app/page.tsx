"use client";

import { useEffect, useState } from "react";
import AuthPage from "@/components/AuthPage";
import AppShell from "@/components/AppShell";
import { Shield, Loader2 } from "lucide-react";

interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  status: string;
  statusMessage?: string;
  publicKey?: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        await fetch("/api/seed", { method: "POST" });

        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
        }
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleLogin = (u: User) => setUser(u);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center mesh-bg">
        <div className="glass rounded-3xl p-10 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-accent-600/20 flex items-center justify-center animate-pulse-glow">
              <Shield className="w-7 h-7 text-accent-400" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-accent-400 animate-spin" />
            <p className="text-surface-400 text-sm font-medium">
              Initializing secure connection…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <AppShell user={user} onLogout={handleLogout} onUserUpdate={setUser} />
  );
}
