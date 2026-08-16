"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Loader2, Clock, Shield, Lock, Menu,
} from "lucide-react";
import Avatar from "./Avatar";

interface User { id: string; username: string; displayName: string; }

interface Call {
  id: string;
  conversationId: string;
  callerId: string;
  callType: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  duration: string | null;
  callerName: string;
  callerUsername: string;
  callerAvatar: string | null;
  displayName: string;
  isGroup: boolean;
}

interface CallsViewProps {
  user: User;
  onToggleSidebar?: () => void;
}

export default function CallsView({ user, onToggleSidebar }: CallsViewProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "missed">("all");

  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch("/api/calls");
      const data = await res.json();
      if (data.calls) setCalls(data.calls);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  const filtered = filter === "missed" ? calls.filter((c) => c.status === "missed") : calls;

  const formatCallTime = (d: string) => {
    const date = new Date(d);
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 0) return `Today, ${time}`;
    if (diffDays === 1) return `Yesterday, ${time}`;
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
  };

  const getCallIcon = (call: Call) => {
    if (call.status === "missed") return <PhoneMissed className="w-3.5 h-3.5 text-rose-400" />;
    if (call.callerId === user.id) return <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-400" />;
    return <PhoneIncoming className="w-3.5 h-3.5 text-accent-400" />;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-3">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="md:hidden w-9 h-9 rounded-xl glass glass-hover text-surface-200 flex items-center justify-center"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-white">Calls</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400/80 text-[10px] font-semibold tracking-wide">ENCRYPTED CALLS</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Filter calls"
            className="w-9 h-9 rounded-xl glass glass-hover text-surface-400 hover:text-white flex items-center justify-center transition-all"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2">
          {(["all", "missed"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${filter === f ? "bg-gradient-to-r from-accent-600 to-purple-600 text-white glow-accent-sm" : "glass glass-hover text-surface-400"}`}>
              {f === "all" ? "All Calls" : "Missed"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="w-5 h-5 text-accent-400 animate-spin" />
            <p className="text-surface-500 text-sm">Loading calls…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 p-6">
            <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center">
              <Phone className="w-6 h-6 text-surface-500" />
            </div>
            <p className="text-surface-500 text-sm">{filter === "missed" ? "No missed calls" : "No call history"}</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((call) => (
              <div key={call.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-glass-200 transition group">
                <Avatar name={call.displayName} size="md" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${call.status === "missed" ? "text-rose-400" : "text-white"}`}>{call.displayName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {getCallIcon(call)}
                    <span className="text-[11px] text-surface-500">{formatCallTime(call.startedAt)}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-emerald-500/40" />
                    {call.callType === "video" ? <Video className="w-4 h-4 text-surface-500" /> : <Phone className="w-4 h-4 text-surface-500" />}
                  </div>
                  {call.duration && (
                    <span className="text-[10px] text-surface-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{call.duration}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
