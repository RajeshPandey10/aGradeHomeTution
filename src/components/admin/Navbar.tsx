"use client";

import { Menu } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function Navbar() {
  const { user, setSidebarOpen } = useAuthStore();

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <button
        onClick={() => setSidebarOpen(true)}
        className="p-2 rounded-lg hover:bg-slate-100 transition-colors lg:hidden cursor-pointer"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">{user?.name}</p>
          <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
          {user?.name?.charAt(0)?.toUpperCase() || "A"}
        </div>
      </div>
    </header>
  );
}
