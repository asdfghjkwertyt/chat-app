"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  Users,
  MessageCircle,
  Loader2,
  X,
  Shield,
  Lock,
  MoreHorizontal,
  LogOut,
  Trash2,
} from "lucide-react";
import Avatar from "./Avatar";

interface User {
  id: string;
  username: string;
  displayName: string;
  status: string;
}

interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  isEncrypted: boolean;
  displayName: string;
  displayStatus: string;
  lastMessage: {
    content: string;
    messageType?: string;
    createdAt: string;
    senderName: string;
    senderId: string;
  } | null;
  otherMembers: {
    id: string;
    displayName: string;
    username: string;
    status: string;
  }[];
  members: {
    id: string;
    displayName: string;
    username: string;
    status: string;
  }[];
  unreadCount: number;
}

interface ChatListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  user: User;
  onNewConversation: (id: string) => void;
  onToggleSidebar?: () => void;
}

export default function ChatList({
  conversations,
  selectedId,
  onSelect,
  loading,
  user,
  onNewConversation,
  onToggleSidebar,
}: ChatListProps) {
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [searchUsers, setSearchUsers] = useState<
    { id: string; username: string; displayName: string; status: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [creating, setCreating] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [requestSent, setRequestSent] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!menuOpenId) return;

    const handleClickOutside = () => setMenuOpenId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [menuOpenId]);

  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        const res = await fetch("/api/chat-requests");
        const data = await res.json();
        if (data.requests) {
          setPendingRequests(data.requests);
        }
      } catch (error) {
        console.error("Error fetching requests:", error);
      }
    };
    fetchPendingRequests();
    const interval = setInterval(fetchPendingRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredConvs = conversations.filter((c) =>
    c.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSearchUsers = async (q: string) => {
    if (q.length < 2) { setSearchUsers([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchUsers(data.users || []);
    } catch { /* ignore */ } finally { setSearching(false); }
  };

  const handleStartDM = async (targetId: string) => {
    setCreating(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: [targetId], isGroup: false }),
      });
      const data = await res.json();
      
      if (res.status === 403 && data.code === "NOT_CONNECTED") {
        // User not connected, send a chat request instead
        await handleSendChatRequest(targetId);
        return;
      }
      
      if (data.conversation) {
        onNewConversation(data.conversation.id);
        setShowNew(false);
        setSearchUsers([]);
      } else {
        alert(data.error || "Unable to start conversation");
      }
    } catch (error) {
      console.error("Error starting DM:", error);
      alert("Unable to start conversation");
    } finally {
      setCreating(false);
    }
  };

  const handleSendChatRequest = async (recipientId: string) => {
    try {
      const res = await fetch("/api/chat-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setRequestSent(recipientId);
        setTimeout(() => setRequestSent(null), 3000);
        setShowNew(false);
        setSearchUsers([]);
        alert("Chat request sent! They will receive it in their inbox.");
      } else {
        alert(data.error || "Unable to send request");
      }
    } catch (error) {
      console.error("Error sending request:", error);
      alert("Unable to send request");
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/chat-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setPendingRequests(pendingRequests.filter((r) => r.id !== requestId));
      } else {
        alert(data.error || "Unable to accept request");
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Unable to accept request");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/chat-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      
      if (res.ok) {
        setPendingRequests(pendingRequests.filter((r) => r.id !== requestId));
      } else {
        const data = await res.json();
        alert(data.error || "Unable to reject request");
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Unable to reject request");
    }
  };

  const handleCreateGroup = async () => {
    if (selectedMembers.length === 0 || !newGroupName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: selectedMembers, name: newGroupName, isGroup: true }),
      });
      const data = await res.json();
      if (data.conversation) {
        onNewConversation(data.conversation.id);
        setShowNew(false);
        setSelectedMembers([]);
        setNewGroupName("");
        setIsGroup(false);
      }
    } catch { /* ignore */ } finally { setCreating(false); }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleChatAction = async (
    conv: Conversation,
    action: "delete-for-me" | "leave-group" | "delete-group"
  ) => {
    const confirmText = action === "delete-group"
      ? "Delete this group for everyone? This will remove all group messages and members."
      : conv.isGroup
      ? "Exit this group? You will no longer receive messages from it."
      : "Delete this chat for your account only?";

    if (!window.confirm(confirmText)) return;

    try {
      const res = await fetch(`/api/conversations/${conv.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Unable to update chat");
      }

      setMenuOpenId(null);
    } catch (error) {
      console.error("Chat action failed:", error);
      alert("This action could not be completed. Please try again.");
    }
  };

  const handleLongPressStart = (conv: Conversation) => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      handleChatAction(conv, conv.isGroup ? "leave-group" : "delete-for-me");
    }, 500);
  };

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  const getLastMessagePreview = (conv: Conversation): string => {
    if (!conv.lastMessage) return "Start the conversation…";

    const content = conv.lastMessage.content || "";
    const inferredType = conv.lastMessage.messageType
      || (content.startsWith("data:image/") ? "photo" : content.startsWith("data:video/") ? "video" : "text");

    const type = inferredType;
    const baseText = type === "photo"
      ? "📷 Photo"
      : type === "video"
      ? "🎥 Video"
      : type === "gif"
      ? "GIF"
      : type === "sticker"
      ? "Sticker"
      : type === "document"
      ? "📎 Document"
      : conv.lastMessage.content;

    if (conv.lastMessage.senderId === user.id) return `You: ${baseText}`;
    if (conv.isGroup) return `${conv.lastMessage.senderName}: ${baseText}`;
    return baseText;
  };

  return (
    <div className="flex flex-col h-full pt-0 md:pt-0 pl-0 md:pl-0">
      {/* Header */}
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-3 gap-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden w-9 h-9 rounded-full glass flex items-center justify-center text-surface-200 shadow-sm border border-white/10"
            aria-label="Toggle sidebar"
          >
            <span className="flex flex-col gap-1">
              <span className="block w-4 h-0.5 rounded-full bg-current" />
              <span className="block w-4 h-0.5 rounded-full bg-current" />
              <span className="block w-4 h-0.5 rounded-full bg-current" />
            </span>
          </button>

          <div className="flex-1 md:flex-none">
            <h2 className="text-[1.1rem] font-bold text-white leading-none">Messages</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400/80 text-[10px] font-semibold tracking-wide">ENCRYPTED</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowNew((prev) => !prev)}
            aria-label="Create new conversation"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              showNew
                ? "bg-gradient-to-br from-accent-600 to-purple-600 text-white glow-accent-sm"
                : "glass glass-hover text-surface-400 hover:text-white"
            }`}
          >
            {showNew ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-surface-500 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* New Conversation */}
      {showNew && (
        <div className="px-4 pb-3 animate-fade-in">
          <div className="glass-light rounded-2xl p-3 space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setIsGroup(false)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${!isGroup ? "bg-gradient-to-r from-accent-600 to-purple-600 text-white" : "glass text-surface-400"}`}>
                Direct Message
              </button>
              <button onClick={() => setIsGroup(true)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${isGroup ? "bg-gradient-to-r from-accent-600 to-purple-600 text-white" : "glass text-surface-400"}`}>
                Group Chat
              </button>
            </div>

            {isGroup && (
              <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name…" className="glass-input w-full rounded-lg px-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none transition-all" />
            )}

            <input type="text" placeholder="Search users…" onChange={(e) => handleSearchUsers(e.target.value)} className="glass-input w-full rounded-lg px-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none transition-all" />

            {searching && <div className="flex items-center gap-2 text-surface-500 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Searching…</div>}

            {selectedMembers.length > 0 && isGroup && (
              <div className="flex flex-wrap gap-1.5">
                {selectedMembers.map((id) => {
                  const u = searchUsers.find((su) => su.id === id);
                  return (
                    <span key={id} className="glass-accent rounded-full px-2 py-1 text-[11px] text-accent-300 font-medium flex items-center gap-1">
                      {u?.displayName || "User"}
                      <button onClick={() => toggleMember(id)}><X className="w-3 h-3" /></button>
                    </span>
                  );
                })}
                <button onClick={handleCreateGroup} disabled={creating} className="bg-gradient-to-r from-accent-600 to-purple-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full hover:opacity-90 transition disabled:opacity-50">
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            )}

            <div className="space-y-1 max-h-36 overflow-y-auto">
              {searchUsers.map((u) => (
                <button key={u.id} onClick={() => (isGroup ? toggleMember(u.id) : handleStartDM(u.id))} disabled={creating}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-xl transition text-left ${selectedMembers.includes(u.id) ? "glass-accent" : "hover:bg-glass-200"}`}>
                  <Avatar name={u.displayName} size="sm" status={u.status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{u.displayName}</p>
                    <p className="text-[11px] text-surface-500">@{u.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isGroup && selectedMembers.includes(u.id) && (
                      <div className="w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center"><span className="text-[10px] text-white">✓</span></div>
                    )}
                    {!isGroup && requestSent === u.id && (
                      <span className="text-[10px] text-emerald-400 font-semibold">Sent</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <div className="mb-4">
            <h3 className="px-2 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider">Pending Requests</h3>
            <div className="space-y-1">
              {pendingRequests.map((req) => (
                <div key={req.id} className="glass-light rounded-2xl p-3 border border-accent-500/20">
                  <div className="flex items-center gap-2.5 mb-2">
                    <Avatar name={req.senderName} size="md" status={req.senderStatus} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{req.senderName}</p>
                      <p className="text-[11px] text-surface-500">wants to chat</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:opacity-90 transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="flex-1 py-1.5 text-xs font-semibold rounded-lg glass text-surface-300 hover:text-white transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="w-5 h-5 text-accent-400 animate-spin" />
            <p className="text-surface-500 text-sm">Loading chats…</p>
          </div>
        ) : filteredConvs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 p-6">
            <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-surface-500" />
            </div>
            <p className="text-surface-500 text-sm text-center">
              {search ? "No matches found" : "No conversations yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredConvs.map((conv) => (
              <div key={conv.id} className="relative">
                <button
                  type="button"
                  onClick={() => onSelect(conv.id)}
                  onPointerDown={() => handleLongPressStart(conv)}
                  onPointerUp={clearLongPress}
                  onPointerLeave={clearLongPress}
                  onPointerCancel={clearLongPress}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setMenuOpenId((prev) => (prev === conv.id ? null : conv.id));
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left group relative overflow-hidden active:scale-[0.995] active:opacity-95 pr-12 ${
                    selectedId === conv.id
                      ? "bg-gradient-to-r from-accent-600/20 via-purple-600/15 to-transparent border border-accent-500/30 shadow-[0_0_0_1px_rgba(168,85,247,0.18)]"
                      : "hover:bg-white/5"
                  }`}
                >
                  {conv.isGroup ? (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-600/30 to-purple-600/30 flex items-center justify-center flex-shrink-0 border border-accent-500/20">
                      <Users className="w-5 h-5 text-accent-400" />
                    </div>
                  ) : (
                    <Avatar name={conv.displayName} size="md" status={conv.otherMembers[0]?.status} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 leading-none">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{conv.displayName}</p>
                        <Lock className="w-3 h-3 text-emerald-500/60 flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {conv.lastMessage && (
                          <span className={`text-[10px] leading-none ${selectedId === conv.id ? "text-accent-300" : "text-surface-500"}`}>
                            {formatTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.65)] leading-none">
                            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs truncate mt-1 ${selectedId === conv.id ? "text-surface-200" : "text-surface-400"}`}>
                      {getLastMessagePreview(conv)}
                    </p>
                  </div>
                </button>

                <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-6 h-6 flex items-center justify-center">
                  <button
                    type="button"
                    aria-label={`Chat options for ${conv.displayName}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpenId((prev) => (prev === conv.id ? null : conv.id));
                    }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                      selectedId === conv.id
                        ? "bg-accent-500/10 text-accent-200 hover:bg-accent-500/20"
                        : "bg-surface-900/70 text-surface-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {menuOpenId === conv.id && (
                    <div className="absolute right-8 top-10 z-30 min-w-[180px] glass-light rounded-xl border border-white/10 p-1.5 shadow-2xl backdrop-blur-md">
                      {conv.isGroup && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuOpenId(null);
                            handleChatAction(conv, "delete-group");
                          }}
                          className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm rounded-lg text-rose-200 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete chat
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuOpenId(null);
                          handleChatAction(conv, conv.isGroup ? "leave-group" : "delete-for-me");
                        }}
                        className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm rounded-lg text-rose-200 hover:bg-rose-500/10 transition"
                      >
                        {conv.isGroup ? <LogOut className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                        {conv.isGroup ? "Exit group" : "Delete chat"}
                      </button>
                    </div>
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
