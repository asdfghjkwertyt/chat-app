"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import ChatList from "./ChatList";
import ChatView from "./ChatView";
import ContactsView from "./ContactsView";
import CallsView from "./CallsView";
import SettingsView from "./SettingsView";
import { MessageCircle, Shield, Lock } from "lucide-react";

interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  status: string;
  statusMessage?: string;
  publicKey?: string;
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

interface AppShellProps {
  user: User;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

export default function AppShell({ user, onLogout, onUserUpdate }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<string>("chats");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
      }
    } catch (e) {
      console.error("Error fetching conversations:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    setMobileShowChat(true);
  };

  const handleBackToList = () => {
    setMobileShowChat(false);
  };

  const handleNewConversation = async (convId: string) => {
    await fetchConversations();
    setSelectedConversation(convId);
    setActiveTab("chats");
    setMobileShowChat(true);
  };

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab: string) => {
          setActiveTab(tab);
          setMobileShowChat(false);
        }}
        user={user}
        onLogout={onLogout}
      />

      {/* Middle panel */}
      <div
        className={`w-full md:w-80 lg:w-[360px] flex-shrink-0 glass flex flex-col border-r-0 ${
          mobileShowChat ? "hidden md:flex" : "flex"
        }`}
      >
        {activeTab === "chats" && (
          <ChatList
            conversations={conversations}
            selectedId={selectedConversation}
            onSelect={handleSelectConversation}
            loading={loading}
            user={user}
            onNewConversation={handleNewConversation}
          />
        )}
        {activeTab === "contacts" && (
          <ContactsView user={user} onStartChat={handleNewConversation} />
        )}
        {activeTab === "calls" && <CallsView user={user} />}
        {activeTab === "settings" && (
          <SettingsView user={user} onUserUpdate={onUserUpdate} onLogout={onLogout} />
        )}
      </div>

      {/* Right panel */}
      <div
        className={`flex-1 flex flex-col ${
          mobileShowChat ? "flex" : "hidden md:flex"
        }`}
      >
        {selectedConversation && activeTab === "chats" ? (
          <ChatView
            conversationId={selectedConversation}
            conversation={selectedConv || null}
            user={user}
            onBack={handleBackToList}
            onRefreshConversations={fetchConversations}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="relative mb-6">
              <div className="w-24 h-24 glass rounded-3xl flex items-center justify-center animate-float">
                {activeTab === "chats" ? (
                  <MessageCircle className="w-10 h-10 text-surface-500" />
                ) : activeTab === "contacts" ? (
                  <Shield className="w-10 h-10 text-surface-500" />
                ) : (
                  <Lock className="w-10 h-10 text-surface-500" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 e2e-badge rounded-full px-2 py-1 flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-300 text-[9px] font-bold">E2E</span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-surface-200 mb-2">
              {activeTab === "chats"
                ? "Select a conversation"
                : activeTab === "contacts"
                ? "Manage your contacts"
                : activeTab === "calls"
                ? "Call history"
                : "App Settings"}
            </h2>
            <p className="text-surface-500 text-sm text-center max-w-sm leading-relaxed">
              {activeTab === "chats"
                ? "All messages are end-to-end encrypted. Choose a conversation to start messaging securely."
                : activeTab === "contacts"
                ? "Add friends and colleagues by their unique username."
                : activeTab === "calls"
                ? "Your voice and video call history will appear here."
                : "Customize your profile and security preferences."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
