"use client";

import {
  MessageCircle,
  Users,
  Phone,
  Settings,
  LogOut,
  Shield,
  X,
  MoreHorizontal,
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
  onClose?: () => void;
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
  onClose,
}: SidebarProps) {
  return (
    <div className="w-[82vw] max-w-[300px] h-full glass flex flex-col items-stretch py-4 px-3 flex-shrink-0 border-r border-white/5 shadow-2xl md:w-[72px] md:max-w-[72px] md:px-0 md:py-5">
      <div className="flex items-center justify-between mb-6 md:justify-center md:mb-8">
        <div className="relative">
          <div className="w-11 h-11 bg-gradient-to-br from-accent-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg glow-accent-sm">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-surface-900">
            <Shield className="w-2 h-2 text-white" />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="md:hidden w-9 h-9 rounded-full glass flex items-center justify-center text-surface-200 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-2 md:items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <div key={tab.id} className="relative w-full md:w-11">
              <button
                onClick={() => onTabChange(tab.id)}
                className={`group relative w-full md:w-11 h-11 rounded-xl flex items-center justify-start md:justify-center gap-3 px-3 md:px-0 transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-br from-accent-600 to-purple-600 text-white shadow-lg glow-accent-sm"
                    : "text-surface-500 hover:text-white hover:bg-glass-200"
                }`}
                title={tab.label}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className="text-sm font-medium md:hidden">{tab.label}</span>
                <span className="absolute left-full ml-3 px-2.5 py-1.5 glass rounded-lg text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 shadow-xl hidden md:block">
                  {tab.label}
                </span>
              </button>

              <button
                type="button"
                aria-label={`${tab.label} options`}
                onClick={(event) => event.stopPropagation()}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-surface-400 hover:text-white hover:bg-white/5 md:hidden"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </nav>

      <div className="flex flex-col gap-3 mt-2 md:items-center">
        <button
          onClick={onLogout}
          className="group relative w-full md:w-10 h-10 rounded-xl flex items-center justify-start md:justify-center gap-3 px-3 md:px-0 text-surface-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          title="Sign out"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm md:hidden">Sign out</span>
          <span className="absolute left-full ml-3 px-2.5 py-1.5 glass rounded-lg text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 z-50 shadow-xl hidden md:block">
            Sign out
          </span>
        </button>
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-surface-700 to-transparent md:w-10" />
        <div className="flex items-center justify-start md:justify-center gap-3 md:gap-0 px-1 md:px-0">
          <Avatar name={user.displayName} size="sm" status={user.status} />
          <span className="md:hidden text-sm font-medium text-surface-200">{user.displayName}</span>
        </div>
      </div>
    </div>
  );
}
