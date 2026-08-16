"use client";

import { useState } from "react";
import {
  User as UserIcon, LogOut, Save, Loader2, CheckCircle,
  Bell, Shield, Palette, HelpCircle, Lock, Key, Fingerprint, MoreHorizontal,
} from "lucide-react";
import Avatar from "./Avatar";

interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  status: string;
  statusMessage?: string;
}

interface SettingsViewProps {
  user: User;
  onUserUpdate: (user: User) => void;
  onLogout: () => void;
}

export default function SettingsView({ user, onUserUpdate, onLogout }: SettingsViewProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [statusMessage, setStatusMessage] = useState(user.statusMessage || "");
  const [status, setStatus] = useState(user.status);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, statusMessage, status }),
      });
      const data = await res.json();
      if (data.user) {
        onUserUpdate({ ...user, displayName: data.user.displayName, statusMessage: data.user.statusMessage, status: data.user.status });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const statuses = [
    { value: "online", label: "Online", color: "bg-emerald-400", glow: "shadow-emerald-400/30" },
    { value: "away", label: "Away", color: "bg-amber-400", glow: "shadow-amber-400/30" },
    { value: "busy", label: "Busy", color: "bg-rose-400", glow: "shadow-rose-400/30" },
    { value: "offline", label: "Invisible", color: "bg-surface-500", glow: "" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Settings</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Key className="w-3 h-3 text-accent-400" />
              <span className="text-accent-400/80 text-[10px] font-semibold tracking-wide">SECURITY CENTER</span>
            </div>
          </div>
          <button
            type="button"
            aria-label="More actions"
            className="w-9 h-9 rounded-xl glass glass-hover text-surface-400 hover:text-white flex items-center justify-center transition-all"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-4">
        {/* Profile */}
        <div className="glass-light rounded-2xl p-4">
          <h3 className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <UserIcon className="w-3.5 h-3.5" /> Profile
          </h3>

          <div className="flex items-center gap-4 mb-5">
            <Avatar name={displayName || user.displayName} size="xl" status={status} />
            <div>
              <p className="text-white font-bold text-lg">{displayName}</p>
              <p className="text-surface-400 text-sm">@{user.username}</p>
              <p className="text-surface-600 text-xs mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-surface-400 mb-1.5 block tracking-wide">Display Name</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-surface-500 focus:outline-none transition-all" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-surface-400 mb-1.5 block tracking-wide">Status Message</label>
              <input type="text" value={statusMessage} onChange={(e) => setStatusMessage(e.target.value)} placeholder="What's on your mind?"
                className="glass-input w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-surface-500 focus:outline-none transition-all" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-surface-400 mb-2 block tracking-wide">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {statuses.map((s) => (
                  <button key={s.value} onClick={() => setStatus(s.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${status === s.value ? "glass-accent text-white" : "glass glass-hover text-surface-400"}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${s.color} ${s.glow} shadow-md`} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full bg-gradient-to-r from-accent-600 to-purple-600 hover:from-accent-500 hover:to-purple-500 text-white text-sm font-bold py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 glow-accent-sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </div>

        {/* Security Info */}
        <div className="glass-light rounded-2xl p-4">
          <h3 className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" /> Security
          </h3>
          <div className="e2e-badge rounded-xl p-3 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300 text-xs font-bold">End-to-End Encryption Active</span>
            </div>
            <p className="text-emerald-400/60 text-[11px] leading-relaxed">
              All messages use AES-256-GCM with ECDH P-256 key exchange. Your private key never leaves this device.
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-2 px-1">
              <span className="text-surface-300 text-xs">Encryption</span>
              <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> AES-256-GCM</span>
            </div>
            <div className="flex items-center justify-between py-2 px-1">
              <span className="text-surface-300 text-xs">Key Exchange</span>
              <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> ECDH P-256</span>
            </div>
            <div className="flex items-center justify-between py-2 px-1">
              <span className="text-surface-300 text-xs">Password</span>
              <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> bcrypt (14 rounds)</span>
            </div>
            <div className="flex items-center justify-between py-2 px-1">
              <span className="text-surface-300 text-xs">Session</span>
              <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> JWT + HttpOnly</span>
            </div>
          </div>
        </div>

        {/* Quick settings */}
        <div className="glass-light rounded-2xl divide-y divide-glass-border overflow-hidden">
          <SettingsItem icon={<Fingerprint className="w-4 h-4" />} title="Unique Identity" desc="Your username is globally unique" />
          <SettingsItem icon={<Bell className="w-4 h-4" />} title="Notifications" desc="Manage alert preferences" />
          <SettingsItem icon={<Palette className="w-4 h-4" />} title="Appearance" desc="Customize the theme" />
          <SettingsItem icon={<HelpCircle className="w-4 h-4" />} title="Help & Support" desc="Get help or report issues" />
        </div>

        {/* Sign Out */}
        <button onClick={onLogout}
          className="w-full glass text-rose-400 hover:bg-rose-500/10 text-sm font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2 border-rose-500/20">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>

        <p className="text-center text-surface-700 text-[10px] pb-4">
          ConnectHub v2.0 • Encrypted by default • Built with ❤️
        </p>
      </div>
    </div>
  );
}

function SettingsItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button className="w-full flex items-center gap-3 p-3.5 hover:bg-glass-200 transition text-left">
      <div className="w-9 h-9 glass rounded-xl flex items-center justify-center text-accent-400 flex-shrink-0">{icon}</div>
      <div><p className="text-sm font-semibold text-white">{title}</p><p className="text-[11px] text-surface-500">{desc}</p></div>
    </button>
  );
}
