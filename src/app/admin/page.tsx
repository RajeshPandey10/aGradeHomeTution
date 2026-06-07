"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/axios";
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRealtimeRefresh } from "@/lib/socket";
import { useToast } from "@/hooks/useToast";
import { StatCard, PageHeader } from "@/components/admin/DataTable";

interface Stat {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  bg: string;
}

export default function AdminDashboard() {
  const { isAuthenticated, initialize } = useAuthStore();
  const toast = useToast();
  const [stats, setStats] = useState<Stat[]>([
    { label: "Total Parents", value: 0, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Total Teachers", value: 0, icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "Pending Teacher Reqs", value: 0, icon: ClipboardCheck, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "Pending Parent Reqs", value: 0, icon: ClipboardList, color: "text-rose-600", bg: "bg-rose-100" },
  ]);

  const fetchStats = useCallback(async () => {
    try {
      const [parentsRes, teachersRes, teacherReqsRes, parentReqsRes] = await Promise.all([
        api.get("/api/admin/parents"),
        api.get("/api/admin/teachers"),
        api.get("/api/admin/teacher-requests"),
        api.get("/api/admin/parent-requests"),
      ]);

      const pendingTeachers =
        teacherReqsRes.data.data?.filter((t: any) => t.status === "in_review").length || 0;
      const pendingParents =
        parentReqsRes.data.data?.filter((t: any) => t.status === "pending").length || 0;

      setStats([
        { label: "Total Parents", value: parentsRes.data.data?.length || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
        { label: "Total Teachers", value: teachersRes.data.data?.length || 0, icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-100" },
        { label: "Pending Teacher Reqs", value: pendingTeachers, icon: ClipboardCheck, color: "text-amber-600", bg: "bg-amber-100" },
        { label: "Pending Parent Reqs", value: pendingParents, icon: ClipboardList, color: "text-rose-600", bg: "bg-rose-100" },
      ]);
    } catch {
      toast.error("Failed to load dashboard stats");
    }
  }, [toast]);

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) fetchStats();
  }, [isAuthenticated, fetchStats]);

  useRealtimeRefresh(fetchStats, [
    "teacher-profile:status-updated",
    "parent-request:status-updated",
    "parent-request:created",
  ]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
            <p className="text-slate-500 mb-6">Please log in to access the admin panel.</p>
            <a href="/admin/login" className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your platform" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            {[
              { href: "/admin/teacher-requests", label: "Review Teacher Verification Requests" },
              { href: "/admin/parent-requests", label: "Review Parent Tuition Requests" },
              { href: "/admin/notices", label: "Manage Notices" },
              { href: "/admin/cms", label: "Update CMS Content" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors font-medium"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Platform Info</h2>
          <div className="space-y-2.5 text-sm">
            {[
              { label: "API Status", value: "Online", color: "text-emerald-600" },
              { label: "Environment", value: process.env.NEXT_PUBLIC_API_URL || "Local" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-slate-500">{item.label}</span>
                <span className={`font-medium text-slate-900 ${item.color || ""}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
