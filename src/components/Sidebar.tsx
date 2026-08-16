"use client";

import {
  MessageCircle,
  Users,
  Phone,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import Avatar from "./Avatar";

interface User {
  id: string;
  username: string;
  displayName: string;
  status: string;
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: User;
  onLogout: () => void;
}

const tabs = [
  { id: "chats", icon: MessageCircle, label: "Chats" },
  { id: "contacts", icon: Users, label: "Contacts" },
  { id: "calls", icon: Phone, label: "Calls" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  user,
  onLogout,
}: SidebarProps) {
  return (
    <div className="w-[72px] glass flex flex-col items-center py-5 flex-shrink-0 border-r-0">
      {/* Logo */}
      <div className="relative mb-8">
        <div className="w-11 h-11 bg-gradient-to-br from-accent-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg glow-accent-sm">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-surface-900">
          <Shield className="w-2 h-2 text-white" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`group relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-br from-accent-600 to-purple-600 text-white shadow-lg glow-accent-sm"
                  : "text-surface-500 hover:text-white hover:bg-glass-200"
              }`}
              title={tab.label}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="absolute left-full ml-3 px-2.5 py-1.5 glass rounded-lg text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 shadow-xl">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-3 mt-2">
        <button
          onClick={onLogout}
          className="group relative w-10 h-10 rounded-xl flex items-center justify-center text-surface-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <span className="absolute left-full ml-3 px-2.5 py-1.5 glass rounded-lg text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 shadow-xl">
            Sign out
          </span>
        </button>
        <div className="w-10 h-[1px] bg-gradient-to-r from-transparent via-surface-700 to-transparent" />
        <Avatar name={user.displayName} size="sm" status={user.status} />
      </div>
    </div>
  );
}
