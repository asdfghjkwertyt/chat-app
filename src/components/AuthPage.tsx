"use client";

import { useState } from "react";
import {
  MessageCircle,
  Phone,
  Users,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Fingerprint,
  Sparkles,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  status: string;
  publicKey?: string;
}

interface AuthPageProps {
  onLogin: (user: User) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordChecks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Lowercase", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let publicKeyPayload = undefined;

      // Generate E2E key pair on register
      if (mode === "register" && typeof window !== "undefined" && window.crypto?.subtle) {
        try {
          const { generateKeyPair, storePrivateKey } = await import(
            "@/lib/encryption"
          );
          const keys = await generateKeyPair();
          publicKeyPayload = keys.publicKey;
          // Store private key after we know the userId
          sessionStorage.setItem(
            "__pendingPrivKey",
            JSON.stringify(keys.privateKey)
          );
        } catch {
          // Encryption not supported — continue without
        }
      }

      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { username, password }
          : {
              username,
              password,
              displayName,
              email,
              publicKey: publicKeyPayload,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      // Store private key in IndexedDB
      if (typeof window !== "undefined" && window.crypto?.subtle) {
        try {
          const { storePrivateKey } = await import("@/lib/encryption");
          const pending = sessionStorage.getItem("__pendingPrivKey");
          if (pending) {
            await storePrivateKey(data.user.id, JSON.parse(pending));
            sessionStorage.removeItem("__pendingPrivKey");
          }
        } catch {
          // continue
        }
      }

      onLogin(data.user);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "demo", password: "Demo1234" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Demo login failed");
        return;
      }
      onLogin(data.user);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex mesh-bg overflow-auto">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[55%] relative p-12 flex-col justify-between overflow-hidden">
        {/* Animated orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent-600/10 rounded-full blur-[100px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/8 rounded-full blur-[120px] animate-float" style={{ animationDelay: "1.5s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-accent-400 rounded-full animate-orbit opacity-30" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 glass rounded-xl flex items-center justify-center glow-accent-sm">
              <MessageCircle className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">ConnectHub</h1>
              <p className="text-surface-500 text-[11px] tracking-wider uppercase">Encrypted Communications</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-5xl font-extrabold leading-tight mb-6">
            <span className="text-white">Secure chats.</span>
            <br />
            <span className="bg-gradient-to-r from-accent-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Zero phone numbers.
            </span>
          </h2>
          <p className="text-surface-400 text-lg mb-10 leading-relaxed">
            End-to-end encrypted messaging and calls for your team.
            Your conversations stay yours — not even we can read them.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <FeatureCard icon={<Lock className="w-5 h-5" />} title="E2E Encrypted" desc="AES-256-GCM + ECDH keys" />
            <FeatureCard icon={<Phone className="w-5 h-5" />} title="No Phone Needed" desc="Connect via username only" />
            <FeatureCard icon={<Users className="w-5 h-5" />} title="Team Groups" desc="Private group conversations" />
            <FeatureCard icon={<Fingerprint className="w-5 h-5" />} title="Unique Identity" desc="Verified unique accounts" />
          </div>
        </div>

        <p className="relative z-10 text-surface-600 text-xs">
          © 2024 ConnectHub • Military-grade encryption
        </p>
      </div>

      {/* Right auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 glass rounded-xl flex items-center justify-center glow-accent-sm">
              <MessageCircle className="w-5 h-5 text-accent-400" />
            </div>
            <h1 className="text-xl font-bold text-white">ConnectHub</h1>
          </div>

          <div className="glass rounded-3xl p-8 animate-scale-in">
            {/* E2E badge */}
            <div className="e2e-badge rounded-full px-3 py-1.5 inline-flex items-center gap-2 mb-5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 text-[11px] font-semibold tracking-wide">
                END-TO-END ENCRYPTED
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-surface-400 text-sm mb-6">
              {mode === "login"
                ? "Your encrypted conversations await"
                : "Set up your secure identity on ConnectHub"}
            </p>

            {error && (
              <div className="glass rounded-xl p-3 mb-4 border-rose-500/30 bg-rose-500/10 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <p className="text-rose-300 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <Field label="Display Name">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="glass-input w-full rounded-xl px-4 py-2.5 text-white placeholder-surface-500 text-sm focus:outline-none transition-all"
                      placeholder="Jane Doe"
                      required
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input w-full rounded-xl px-4 py-2.5 text-white placeholder-surface-500 text-sm focus:outline-none transition-all"
                      placeholder="jane@company.com"
                      required
                    />
                  </Field>
                </>
              )}

              <Field label="Username" hint={mode === "register" ? "Letters, numbers, underscores" : undefined}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input w-full rounded-xl px-4 py-2.5 text-white placeholder-surface-500 text-sm focus:outline-none transition-all"
                  placeholder="janedoe"
                  required
                />
              </Field>

              <Field label="Password">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input w-full rounded-xl px-4 py-2.5 pr-10 text-white placeholder-surface-500 text-sm focus:outline-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === "register" && password.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {passwordChecks.map((c) => (
                      <span
                        key={c.label}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${
                          c.ok
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                            : "bg-surface-800/50 text-surface-500 border border-surface-700/50"
                        }`}
                      >
                        {c.ok && <CheckCircle className="w-2.5 h-2.5" />}
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
              </Field>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-accent-600 to-purple-600 hover:from-accent-500 hover:to-purple-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 glow-accent-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {mode === "login" ? "Sign In Securely" : "Create Secure Account"}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-surface-700 to-transparent" />
              <span className="text-surface-600 text-[10px] tracking-widest uppercase">or</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-surface-700 to-transparent" />
            </div>

            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full glass glass-hover text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4 text-accent-400" />
              Try Demo Account
            </button>

            <p className="mt-5 text-center text-surface-500 text-sm">
              {mode === "login" ? "Don't have an account?" : "Already registered?"}{" "}
              <button
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                }}
                className="text-accent-400 hover:text-accent-300 font-semibold transition"
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>

            {mode === "login" && (
              <p className="mt-2 text-center text-surface-600 text-xs">
                Demo: <code className="text-surface-400 bg-surface-800/50 px-1.5 py-0.5 rounded">demo</code> / <code className="text-surface-400 bg-surface-800/50 px-1.5 py-0.5 rounded">Demo1234</code>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-surface-300 tracking-wide">
          {label}
        </label>
        {hint && <span className="text-[10px] text-surface-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="glass rounded-2xl p-4 glass-hover transition-all">
      <div className="w-9 h-9 rounded-lg bg-accent-600/15 flex items-center justify-center text-accent-400 mb-2">
        {icon}
      </div>
      <h3 className="text-white font-semibold text-sm">{title}</h3>
      <p className="text-surface-500 text-xs mt-0.5">{desc}</p>
    </div>
  );
}
