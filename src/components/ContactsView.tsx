"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, UserPlus, MessageCircle, Trash2, Loader2,
  Users, X, AlertCircle, CheckCircle, Shield, Fingerprint, MoreHorizontal,
} from "lucide-react";
import Avatar from "./Avatar";

interface User {
  id: string;
  username: string;
  displayName: string;
  status: string;
}

interface Contact {
  id: string;
  contactId: string;
  nickname: string | null;
  status: string;
  displayName: string;
  username: string;
  userStatus: string;
  statusMessage: string | null;
  avatarUrl: string | null;
  email: string;
}

interface ContactsViewProps {
  user: User;
  onStartChat: (convId: string) => void;
}

export default function ContactsView({ user, onStartChat }: ContactsViewProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts");
      const data = await res.json();
      if (data.contacts) setContacts(data.contacts);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsername.trim()) return;
    setAdding(true); setAddError(""); setAddSuccess("");
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: addUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || "Failed to add contact"); return; }
      setAddSuccess(`Added ${data.contact.displayName}!`);
      setAddUsername("");
      await fetchContacts();
      setTimeout(() => setAddSuccess(""), 3000);
    } catch { setAddError("Network error"); } finally { setAdding(false); }
  };

  const handleDeleteContact = async (contactId: string) => {
    setDeletingId(contactId);
    try {
      await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
      setContacts((prev) => prev.filter((c) => c.contactId !== contactId));
    } catch { /* ignore */ } finally { setDeletingId(null); }
  };

  const handleStartChat = async (contactId: string) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: [contactId], isGroup: false }),
      });
      const data = await res.json();
      if (data.conversation) onStartChat(data.conversation.id);
    } catch { /* ignore */ }
  };

  const filteredContacts = contacts.filter((c) =>
    c.displayName.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  const online = filteredContacts.filter((c) => c.userStatus === "online");
  const away = filteredContacts.filter((c) => c.userStatus === "away");
  const offline = filteredContacts.filter((c) => c.userStatus !== "online" && c.userStatus !== "away");

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Contacts</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Fingerprint className="w-3 h-3 text-accent-400" />
              <span className="text-accent-400/80 text-[10px] font-semibold tracking-wide">VERIFIED IDENTITIES</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="More actions"
              className="w-9 h-9 rounded-xl glass glass-hover text-surface-400 hover:text-white flex items-center justify-center transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd((prev) => !prev); setAddError(""); setAddSuccess(""); }}
              aria-label="Add contact"
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showAdd ? "bg-gradient-to-br from-accent-600 to-purple-600 text-white glow-accent-sm" : "glass glass-hover text-surface-400 hover:text-white"}`}
            >
              {showAdd ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts…"
            className="glass-input w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-surface-500 focus:outline-none transition-all" />
        </div>
      </div>

      {showAdd && (
        <div className="px-4 pb-3 animate-fade-in">
          <div className="glass-light rounded-2xl p-3 space-y-3">
            <form onSubmit={handleAddContact} className="flex gap-2">
              <input type="text" value={addUsername} onChange={(e) => setAddUsername(e.target.value)} placeholder="Enter username…"
                className="glass-input flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder-surface-500 focus:outline-none transition-all" />
              <button type="submit" disabled={adding || !addUsername.trim()}
                className="bg-gradient-to-r from-accent-600 to-purple-600 text-white text-sm px-4 py-2 rounded-xl transition disabled:opacity-50 font-semibold">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
              </button>
            </form>
            {addError && <div className="flex items-center gap-2 text-rose-400 text-xs"><AlertCircle className="w-3 h-3" />{addError}</div>}
            {addSuccess && <div className="flex items-center gap-2 text-emerald-400 text-xs"><CheckCircle className="w-3 h-3" />{addSuccess}</div>}
            <p className="text-surface-600 text-[11px]">Try: sarah_dev, mike_design, emma_pm, alex_ops, jordan_qa</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="w-5 h-5 text-accent-400 animate-spin" />
            <p className="text-surface-500 text-sm">Loading contacts…</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 p-6">
            <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-surface-500" />
            </div>
            <p className="text-surface-500 text-sm text-center">{search ? "No matches" : "No contacts yet"}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {online.length > 0 && <ContactGroup title="Online" contacts={online} onChat={handleStartChat} onDelete={handleDeleteContact} deletingId={deletingId} />}
            {away.length > 0 && <ContactGroup title="Away" contacts={away} onChat={handleStartChat} onDelete={handleDeleteContact} deletingId={deletingId} />}
            {offline.length > 0 && <ContactGroup title="Offline" contacts={offline} onChat={handleStartChat} onDelete={handleDeleteContact} deletingId={deletingId} />}
          </div>
        )}
      </div>
    </div>
  );
}

function ContactGroup({ title, contacts, onChat, onDelete, deletingId }: {
  title: string; contacts: Contact[]; onChat: (id: string) => void; onDelete: (id: string) => void; deletingId: string | null;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider px-3 mb-1.5">{title} — {contacts.length}</p>
      <div className="space-y-0.5">
        {contacts.map((c) => (
          <div key={c.contactId} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-glass-200 transition group">
            <Avatar name={c.displayName} size="md" status={c.userStatus} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-white truncate">{c.displayName}</p>
                <Shield className="w-3 h-3 text-emerald-500/50 flex-shrink-0" />
              </div>
              <p className="text-[11px] text-surface-500 truncate">{c.statusMessage || `@${c.username}`}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => onChat(c.contactId)} className="w-8 h-8 rounded-lg glass flex items-center justify-center text-accent-400 hover:bg-accent-500/20 transition" title="Message">
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(c.contactId)} disabled={deletingId === c.contactId} className="w-8 h-8 rounded-lg glass flex items-center justify-center text-surface-400 hover:text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-50" title="Remove">
                {deletingId === c.contactId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
