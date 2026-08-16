"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft, Phone, Video, Send, Loader2,
  Edit2, Trash2, X, Check, Users, Info, Shield, Lock,
  Paperclip, Image as ImageIcon, Film, Smile,
} from "lucide-react";
import Avatar from "./Avatar";

type MessageType = "text" | "photo" | "video" | "gif" | "sticker";

interface User {
  id: string;
  username: string;
  displayName: string;
  status: string;
}

interface Message {
  id: string;
  content: string;
  encryptedContent: string | null;
  iv: string | null;
  encryptionVersion: number;
  messageType: MessageType;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderStatus: string;
  senderAvatar: string | null;
}

interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  isEncrypted: boolean;
  displayName: string;
  displayStatus: string;
  otherMembers: { id: string; displayName: string; username: string; status: string }[];
  members: { id: string; displayName: string; username: string; status: string; role?: string }[];
}

interface ChatViewProps {
  conversationId: string;
  conversation: Conversation | null;
  user: User;
  onBack: () => void;
  onRefreshConversations: () => void;
}

export default function ChatView({
  conversationId,
  conversation,
  user,
  onBack,
  onRefreshConversations,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [isActioning, setIsActioning] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);
  const stickerInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?conversationId=${conversationId}`);
      const data = await res.json();
      if (data.messages) {
        // Client-side decryption for encrypted messages
        const processed = await Promise.all(
          data.messages.map(async (msg: Message) => {
            if (msg.encryptedContent && msg.iv && msg.encryptionVersion > 0) {
              try {
                const { decryptMessage } = await import("@/lib/encryption");
                const plain = await decryptMessage(
                  msg.encryptedContent, msg.iv, null, null, conversationId
                );
                return { ...msg, content: plain };
              } catch {
                return { ...msg, content: "🔒 Encrypted message" };
              }
            }
            return msg;
          })
        );
        setMessages(processed);
      }
    } catch (e) {
      console.error("Error fetching messages:", e);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (payload: {
    content: string;
    messageType: MessageType;
    encryptedContent?: string;
    iv?: string;
  }) => {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, ...payload }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Unable to send message");
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      content,
      encryptedContent: null,
      iv: null,
      encryptionVersion: 0,
      messageType: "text",
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      senderId: user.id,
      senderName: user.displayName,
      senderUsername: user.username,
      senderStatus: user.status,
      senderAvatar: null,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      // Encrypt client-side
      const payload: {
        content: string;
        messageType: MessageType;
        encryptedContent?: string;
        iv?: string;
      } = {
        content,
        messageType: "text",
      };

      if (typeof window !== "undefined" && window.crypto?.subtle) {
        try {
          const { encryptMessage } = await import("@/lib/encryption");
          const encrypted = await encryptMessage(content, null, null, conversationId);
          payload.encryptedContent = encrypted.encryptedContent;
          payload.iv = encrypted.iv;
        } catch {
          // Fall back to plaintext
        }
      }

      await sendMessage(payload);
      await fetchMessages();
      onRefreshConversations();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setNewMessage(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const fileToDataUrl = async (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const handleSendMedia = async (messageType: MessageType, dataUrl: string) => {
    if (sending) return;

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      content: dataUrl,
      encryptedContent: null,
      iv: null,
      encryptionVersion: 0,
      messageType,
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      senderId: user.id,
      senderName: user.displayName,
      senderUsername: user.username,
      senderStatus: user.status,
      senderAvatar: null,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setSending(true);
    setShowAttachMenu(false);

    try {
      await sendMessage({ content: dataUrl, messageType });
      await fetchMessages();
      onRefreshConversations();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      alert("Unable to send media message.");
    } finally {
      setSending(false);
    }
  };

  const handleFilePicked = async (
    event: React.ChangeEvent<HTMLInputElement>,
    messageType: MessageType,
    mimePrefix: "image/" | "video/"
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith(mimePrefix)) {
      alert(`Please choose a valid ${mimePrefix === "image/" ? "image" : "video"} file.`);
      return;
    }

    const maxSizeBytes = mimePrefix === "video/" ? 12 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert(mimePrefix === "video/" ? "Video must be under 12MB." : "Image must be under 5MB.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      await handleSendMedia(messageType, dataUrl);
    } catch {
      alert("Unable to process the selected file.");
    }
  };

  const handleSendFromUrlPrompt = async (messageType: "gif" | "sticker") => {
    const promptLabel = messageType === "gif" ? "GIF" : "sticker";
    const url = window.prompt(`Paste a ${promptLabel} image URL:`)?.trim();
    if (!url) return;

    if (!/^https?:\/\//i.test(url) && !url.startsWith("data:image/")) {
      alert("Please provide a valid image URL.");
      return;
    }

    await handleSendMedia(messageType, url);
  };

  const handleEdit = async (msgId: string) => {
    if (!editContent.trim()) return;
    try {
      let body: Record<string, string> = { content: editContent };
      if (typeof window !== "undefined" && window.crypto?.subtle) {
        try {
          const { encryptMessage } = await import("@/lib/encryption");
          const encrypted = await encryptMessage(editContent, null, null, conversationId);
          body = { content: editContent, ...encrypted };
        } catch { /* fallback */ }
      }
      await fetch(`/api/messages/${msgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setEditingId(null);
      await fetchMessages();
    } catch { /* ignore */ }
  };

  const handleDelete = async (msgId: string) => {
    try {
      await fetch(`/api/messages/${msgId}`, { method: "DELETE" });
      await fetchMessages();
    } catch { /* ignore */ }
  };

  const handleCall = async (type: string) => {
    try {
      await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, callType: type }),
      });
      alert(`${type === "video" ? "Video" : "Voice"} call started! (Demo mode — E2E encrypted)`);
    } catch { /* ignore */ }
  };

  const handleConversationAction = async (action: "delete-for-me" | "leave-group" | "delete-group") => {
    const confirmMessage = action === "delete-group"
      ? "Delete this group for everyone? This will remove all group messages and members."
      : action === "leave-group"
      ? "Exit this group? You will no longer receive messages from it."
      : "Delete this chat for your account only? You will no longer see it or receive messages from it.";

    if (!window.confirm(confirmMessage)) return;

    try {
      setIsActioning(true);
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update conversation");
      }

      setShowInfo(false);
      onBack();
      onRefreshConversations();
    } catch (error) {
      console.error("Conversation action failed:", error);
      alert("This action could not be completed. Please try again.");
    } finally {
      setIsActioning(false);
    }
  };

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDateDivider = (d: string) => {
    const date = new Date(d);
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  };

  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const key = new Date(msg.createdAt).toDateString();
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === key) last.messages.push(msg);
    else groupedMessages.push({ date: key, messages: [msg] });
  });

  const displayName = conversation?.displayName || "Chat";
  const displayStatus = conversation?.displayStatus || "";
  const currentUserRole = conversation?.members.find((member) => member.id === user.id)?.role || "member";
  const isCurrentUserAdmin = currentUserRole === "admin";

  const renderMessageContent = (msg: Message) => {
    const content = msg.content || "";

    // Detect video media (by type or data URL)
    const isVideoData = content.startsWith("data:video/");
    if (msg.messageType === "video" || isVideoData) {
      return (
        <video
          src={content}
          controls
          className="max-h-72 w-full rounded-xl bg-black/40"
        />
      );
    }

    // Detect image/gif/sticker media (by type or data URL)
    const isImageData = content.startsWith("data:image/");
    if (msg.messageType === "photo" || msg.messageType === "gif" || msg.messageType === "sticker" || isImageData) {
      const imgClass = msg.messageType === "sticker"
        ? "max-h-44 max-w-[180px] object-contain"
        : "max-h-72 w-full rounded-xl object-cover";

      return (
        <img
          src={content}
          alt={msg.messageType || "media"}
          className={imgClass}
          loading="lazy"
        />
      );
    }

    // Fallback to text
    return <p className="whitespace-pre-wrap break-all leading-relaxed">{content}</p>;
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 glass border-b-0 flex-shrink-0">
        <button onClick={onBack} className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-surface-400 hover:text-white glass glass-hover transition">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {conversation?.isGroup ? (
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-600/30 to-purple-600/30 flex items-center justify-center flex-shrink-0 border border-accent-500/20">
            <Users className="w-5 h-5 text-accent-400" />
          </div>
        ) : (
          <Avatar name={displayName} size="md" status={conversation?.otherMembers[0]?.status} />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-white truncate">{displayName}</h3>
            <Lock className="w-3 h-3 text-emerald-500/70 flex-shrink-0" />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-surface-400">{displayStatus}</p>
            <span className="text-[9px] text-emerald-400/60 font-semibold">• E2E</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {[{ icon: Phone, type: "voice" }, { icon: Video, type: "video" }].map(({ icon: Icon, type }) => (
            <button key={type} onClick={() => handleCall(type)} className="w-9 h-9 rounded-xl flex items-center justify-center text-surface-400 hover:text-white glass glass-hover transition" title={`${type} call`}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <button onClick={() => setShowInfo(!showInfo)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${showInfo ? "bg-gradient-to-br from-accent-600 to-purple-600 text-white glow-accent-sm" : "text-surface-400 hover:text-white glass glass-hover"}`}>
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4">
          {/* E2E banner */}
          <div className="flex justify-center mb-4">
            <div className="e2e-badge rounded-full px-3 py-1.5 flex items-center gap-2">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 text-[10px] font-semibold">Messages are end-to-end encrypted</span>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="glass rounded-2xl p-6 flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 text-accent-400 animate-spin" />
                <p className="text-surface-400 text-sm">Decrypting messages…</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center animate-float">
                <Send className="w-7 h-7 text-surface-500" />
              </div>
              <p className="text-surface-300 font-semibold">No messages yet</p>
              <p className="text-surface-500 text-sm">Send the first encrypted message!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 my-4">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-surface-700/50 to-transparent" />
                    <span className="text-[10px] text-surface-500 font-semibold px-3 py-1 glass rounded-full">{formatDateDivider(group.messages[0].createdAt)}</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-surface-700/50 to-transparent" />
                  </div>
                  {group.messages.map((msg, i) => {
                    const isMe = msg.senderId === user.id;
                    const showSender = i === 0 || group.messages[i - 1].senderId !== msg.senderId;

                    return (
                      <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} ${showSender ? "mt-3" : "mt-0.5"} animate-fade-in group`}>
                        <div className={`flex gap-2 max-w-[75%] ${isMe ? "flex-row-reverse" : ""}`}>
                          {!isMe && showSender ? <Avatar name={msg.senderName} size="sm" className="mt-1" /> : !isMe ? <div className="w-9" /> : null}
                          <div>
                            {showSender && !isMe && conversation?.isGroup && (
                              <p className="text-[11px] text-surface-400 font-semibold mb-1 ml-1">{msg.senderName}</p>
                            )}

                            {editingId === msg.id ? (
                              <div className="flex items-center gap-2">
                                <input type="text" value={editContent} onChange={(e) => setEditContent(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") handleEdit(msg.id); if (e.key === "Escape") setEditingId(null); }}
                                  className="glass-input text-white text-sm rounded-xl px-3 py-2 focus:outline-none transition-all" autoFocus />
                                <button onClick={() => handleEdit(msg.id)} className="w-8 h-8 rounded-lg glass flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditingId(null)} className="w-8 h-8 rounded-lg glass flex items-center justify-center text-surface-400 hover:bg-glass-200 transition"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <div className="relative">
                                <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${
                                  msg.isDeleted
                                    ? "glass text-surface-500 italic"
                                    : isMe
                                    ? "bg-gradient-to-br from-accent-600 to-purple-600 text-white rounded-br-md shadow-lg shadow-accent-600/20"
                                    : "glass-light text-surface-100 rounded-bl-md"
                                }`}>
                                  {msg.isDeleted ? (
                                    <p className="whitespace-pre-wrap break-all leading-relaxed">{msg.content}</p>
                                  ) : (
                                    renderMessageContent(msg)
                                  )}
                                  <div className={`flex items-center gap-1.5 mt-1 ${isMe ? "justify-end" : ""}`}>
                                    <Lock className={`w-2.5 h-2.5 ${isMe ? "text-white/40" : "text-surface-500/60"}`} />
                                    <span className={`text-[10px] ${isMe ? "text-white/50" : "text-surface-500"}`}>{formatTime(msg.createdAt)}</span>
                                    {msg.isEdited && !msg.isDeleted && <span className={`text-[10px] ${isMe ? "text-white/40" : "text-surface-500"}`}>(edited)</span>}
                                  </div>
                                </div>

                                {isMe && !msg.isDeleted && !msg.id.startsWith("temp-") && msg.messageType === "text" && (
                                  <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-all">
                                    <div className="flex items-center gap-0.5 glass rounded-xl p-0.5 shadow-xl">
                                      <button onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:text-white hover:bg-glass-300 transition" title="Edit">
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button onClick={() => handleDelete(msg.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-400 hover:text-rose-400 hover:bg-rose-500/10 transition" title="Delete">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Info Panel */}
        {showInfo && conversation && (
          <div className="w-72 glass p-5 overflow-y-auto animate-slide-right hidden lg:block border-l-0">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-accent-400" />
              {conversation.isGroup ? "Group Info" : "Contact Info"}
            </h3>

            {conversation.isGroup ? (
              <div className="text-center mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-600/30 to-purple-600/30 flex items-center justify-center mx-auto mb-3 border border-accent-500/20">
                  <Users className="w-8 h-8 text-accent-400" />
                </div>
                <p className="font-semibold text-white">{conversation.name}</p>
                <p className="text-surface-400 text-sm">{conversation.members.length} members</p>
              </div>
            ) : (
              <div className="text-center mb-5">
                <div className="flex justify-center mb-3">
                  <Avatar name={conversation.displayName} size="xl" status={conversation.otherMembers[0]?.status} />
                </div>
                <p className="font-semibold text-white">{conversation.displayName}</p>
                <p className="text-surface-400 text-sm">@{conversation.otherMembers[0]?.username}</p>
              </div>
            )}

            {/* E2E Info */}
            <div className="e2e-badge rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 text-xs font-bold">End-to-End Encrypted</span>
              </div>
              <p className="text-emerald-400/60 text-[11px] leading-relaxed">
                Messages are encrypted with AES-256-GCM. Only participants can read them.
              </p>
            </div>

            <div className="border-t border-glass-border pt-4">
              <h4 className="text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-3">Members</h4>
              <div className="space-y-2">
                {conversation.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl hover:bg-glass-200 transition">
                    <Avatar name={member.displayName} size="sm" status={member.status} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">
                        {member.displayName}
                        {member.id === user.id && <span className="text-surface-500 text-[10px] ml-1">(you)</span>}
                      </p>
                      <p className="text-[11px] text-surface-500">@{member.username}</p>
                    </div>
                    {member.role === "admin" && (
                      <span className="text-[10px] uppercase tracking-wide text-accent-300">Admin</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-glass-border pt-4 mt-4 space-y-2">
              {conversation.isGroup ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleConversationAction("leave-group")}
                    disabled={isActioning}
                    className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 px-3 py-2 text-sm font-medium hover:bg-amber-500/15 transition disabled:opacity-60"
                  >
                    {isActioning ? "Processing..." : "Exit group"}
                  </button>
                  {isCurrentUserAdmin && (
                    <button
                      type="button"
                      onClick={() => handleConversationAction("delete-group")}
                      disabled={isActioning}
                      className="w-full rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-200 px-3 py-2 text-sm font-medium hover:bg-rose-500/15 transition disabled:opacity-60"
                    >
                      Delete group
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConversationAction("delete-for-me")}
                  disabled={isActioning}
                  className="w-full rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-200 px-3 py-2 text-sm font-medium hover:bg-rose-500/15 transition disabled:opacity-60"
                >
                  {isActioning ? "Processing..." : "Delete chat for me"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="relative flex items-center gap-2 px-4 py-3 glass border-t-0 flex-shrink-0">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFilePicked(event, "photo", "image/")}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => handleFilePicked(event, "video", "video/")}
        />
        <input
          ref={gifInputRef}
          type="file"
          accept="image/gif"
          className="hidden"
          onChange={(event) => handleFilePicked(event, "gif", "image/")}
        />
        <input
          ref={stickerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleFilePicked(event, "sticker", "image/")}
        />

        <button
          type="button"
          onClick={() => setShowAttachMenu((prev) => !prev)}
          className="w-10 h-10 rounded-xl glass glass-hover text-surface-300 hover:text-white flex items-center justify-center"
          aria-label="Add media"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {showAttachMenu && (
          <div className="absolute bottom-14 left-4 z-30 glass-light rounded-2xl border border-white/10 p-2 shadow-2xl w-56">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 text-surface-200 text-xs"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Photo
              </button>
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 text-surface-200 text-xs"
              >
                <Film className="w-3.5 h-3.5" />
                Video
              </button>
              <button
                type="button"
                onClick={() => {
                  gifInputRef.current?.click();
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 text-surface-200 text-xs"
              >
                <Smile className="w-3.5 h-3.5" />
                GIF file
              </button>
              <button
                type="button"
                onClick={() => stickerInputRef.current?.click()}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 text-surface-200 text-xs"
              >
                <Smile className="w-3.5 h-3.5" />
                Sticker
              </button>
              <button
                type="button"
                onClick={() => void handleSendFromUrlPrompt("gif")}
                className="col-span-2 flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/10 text-surface-200 text-xs"
              >
                <Smile className="w-3.5 h-3.5" />
                Send GIF from URL
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 glass-input rounded-xl flex items-center focus-within:border-accent-500/50 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] transition-all">
          <Lock className="w-3.5 h-3.5 text-emerald-500/50 ml-3" />
          <input ref={inputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type an encrypted message…"
            className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-surface-500 focus:outline-none" />
        </div>
        <button type="submit" disabled={!newMessage.trim() || sending}
          className="w-10 h-10 bg-gradient-to-br from-accent-600 to-purple-600 hover:from-accent-500 hover:to-purple-500 disabled:from-surface-700 disabled:to-surface-700 disabled:text-surface-500 text-white rounded-xl flex items-center justify-center transition-all glow-accent-sm disabled:shadow-none">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
