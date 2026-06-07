"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  Users,
  GraduationCap,
  ClipboardCheck,
  ClipboardList,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/notices", label: "Notices", icon: FileText },
  { href: "/admin/cms", label: "CMS", icon: FileSpreadsheet },
  { href: "/admin/parents", label: "Parents", icon: Users },
  { href: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  { href: "/admin/teacher-requests", label: "Teacher Requests", icon: ClipboardCheck },
  { href: "/admin/parent-requests", label: "Parent Requests", icon: ClipboardList },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, logout } = useAuthStore();

  return (
    <aside
      className={`bg-slate-900 text-white flex flex-col transition-all duration-300 ${
        sidebarOpen ? "w-64" : "w-16"
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
        {sidebarOpen && (
          <span className="font-bold text-lg tracking-wide">aGrade Admin</span>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon size={20} className="shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700 p-2">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut size={20} className="shrink-0" />
          {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
