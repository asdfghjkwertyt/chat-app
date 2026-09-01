"use client";

import { useEffect, useState } from "react";
import AuthPage from "@/components/AuthPage";
import AppShell from "@/components/AppShell";

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
      <div className="min-h-screen flex flex-col items-center justify-center mesh-bg overflow-hidden">
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          @keyframes rotate-slow {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse-ring {
            0%, 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.7); }
            50% { box-shadow: 0 0 0 20px rgba(79, 70, 229, 0); }
          }
          @keyframes shimmer {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
          .animate-rotate-slow {
            animation: rotate-slow 20s linear infinite;
          }
          .animate-pulse-ring {
            animation: pulse-ring 2s infinite;
          }
          .animate-shimmer {
            animation: shimmer 2s ease-in-out infinite;
          }
        `}</style>
        
        <div className="flex flex-col items-center gap-8">
          {/* Animated Logo Container */}
          <div className="relative w-32 h-32">
            {/* Outer rotating ring */}
            <div className="absolute inset-0 animate-rotate-slow">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-30 blur-xl"></div>
            </div>
            
            {/* Middle pulsing ring */}
            <div className="absolute inset-4 animate-pulse-ring rounded-full border-2 border-indigo-500/30"></div>
            
            {/* Logo container */}
            <div className="absolute inset-0 flex items-center justify-center animate-float">
              <div className="relative w-24 h-24">
                <img 
                  src="/favicon.png" 
                  alt="ConnectHub" 
                  className="w-full h-full drop-shadow-2xl"
                  style={{
                    filter: 'drop-shadow(0 0 20px rgba(79, 70, 229, 0.6))'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Loading Text */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-shimmer" style={{animationDelay: '0s'}}></div>
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-shimmer" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-shimmer" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
            <p className="text-indigo-300 font-medium text-center">
              Initializing ConnectHub
            </p>
            <p className="text-surface-500 text-xs text-center max-w-xs">
              Securing your connection with end-to-end encryption
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
