"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  Users,
  GraduationCap,
  ClipboardCheck,
  ClipboardList,
  Bell,
  History,
  Ticket,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  RotateCcw,
  Mail,
  HelpCircle,
  UserSquare2,
  Quote,
  BarChart3,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/notices", label: "Notices", icon: FileText },
  { href: "/admin/cms", label: "CMS", icon: FileSpreadsheet },
  { href: "/admin/contact-messages", label: "Contact Messages", icon: Mail },
  { href: "/admin/faq-items", label: "FAQ", icon: HelpCircle },
  { href: "/admin/team", label: "Team", icon: UserSquare2 },
  { href: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { href: "/admin/site-stats", label: "Homepage Stats", icon: BarChart3 },
  { href: "/admin/parents", label: "Parents", icon: Users },
  { href: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  {
    href: "/admin/teacher-requests",
    label: "Teacher Requests",
    icon: ClipboardCheck,
  },
  {
    href: "/admin/parent-requests",
    label: "Parent Requests",
    icon: ClipboardList,
  },
  { href: "/admin/refunds", label: "Refunds", icon: RotateCcw },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/notifications", label: "Send Notification", icon: Bell },
  {
    href: "/admin/notification-logs",
    label: "Notification Logs",
    icon: History,
  },
  { href: "/admin/email-senders", label: "Email Senders", icon: Mail },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, logout } = useAuthStore();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <>
      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full min-h-0 w-64 flex-col bg-slate-900 text-white shadow-xl transition-transform duration-300 lg:static lg:z-auto lg:shadow-none lg:transition-[width] ${
          sidebarOpen
            ? "translate-x-0 lg:w-64"
            : "-translate-x-full lg:translate-x-0 lg:w-16"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-700 px-4">
          {sidebarOpen && (
            <span className="font-bold text-lg tracking-wide">
              aGrade Admin
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {sidebarOpen ? (
              <ChevronLeft size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon size={20} className="shrink-0" />
                {sidebarOpen && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-700 p-2">
          <button
            onClick={() => setLogoutOpen(true)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut size={20} className="shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>
      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => logout()}
        title="Logout"
        message="Are you sure you want to logout from the admin panel?"
        confirmLabel="Logout"
        confirmColor="red"
      />
    </>
  );
}
