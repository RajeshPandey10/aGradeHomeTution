"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/axios";
import {
  Users,
  GraduationCap,
  ClipboardCheck,
  ClipboardList,
  TrendingUp,
  CreditCard,
  DollarSign,
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
  const today = new Date();
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(today.toISOString().slice(0, 10));
  const [dailySummary, setDailySummary] = useState({
    parentRequests: 0,
    teacherRequests: 0,
    fulfilled: 0,
    revenue: 0,
  });
  const [stats, setStats] = useState<Stat[]>([
    {
      label: "Total Parents",
      value: 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Total Teachers",
      value: 0,
      icon: GraduationCap,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "Pending Teacher Reqs",
      value: 0,
      icon: ClipboardCheck,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      label: "Pending Parent Reqs",
      value: 0,
      icon: ClipboardList,
      color: "text-rose-600",
      bg: "bg-rose-100",
    },
    {
      label: "Fulfilled Requests",
      value: 0,
      icon: CreditCard,
      color: "text-indigo-600",
      bg: "bg-indigo-100",
    },
    {
      label: "Total Revenue",
      value: 0,
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
  ]);

  const fetchStats = useCallback(async () => {
    try {
      const [parentsRes, teachersRes, teacherReqsRes, parentReqsRes] =
        await Promise.all([
          api.get("/api/admin/parents"),
          api.get("/api/admin/teachers"),
          api.get("/api/admin/teacher-requests"),
          api.get("/api/admin/parent-requests"),
        ]);

      const pendingTeachers =
        teacherReqsRes.data.data?.filter((t: any) => t.status === "in_review")
          .length || 0;
      const pendingParents =
        parentReqsRes.data.data?.filter((t: any) => t.status === "pending")
          .length || 0;
      const parentReqs = parentReqsRes.data.data || [];
      const fulfilledReqs = parentReqs.filter(
        (r: any) => r.status === "fulfilled",
      );
      const totalRevenue = fulfilledReqs.reduce(
        (sum: number, r: any) => sum + (r.payment?.payable || 0),
        0,
      );
      const isInRange = (value: string | undefined) => {
        const date = (value || "").slice(0, 10);
        return date >= fromDate && date <= toDate;
      };
      const periodRequests = parentReqs.filter((r: any) =>
        isInRange(r.createdAt),
      );
      const dayTeacherRequests = (teacherReqsRes.data.data || []).filter(
        (t: any) => isInRange(t.createdAt),
      );
      const periodFulfilled = parentReqs.filter(
        (r: any) =>
          r.status === "fulfilled" &&
          isInRange(r.paymentSlip?.paidAt || r.createdAt),
      );
      setDailySummary({
        parentRequests: periodRequests.length,
        teacherRequests: dayTeacherRequests.length,
        fulfilled: periodFulfilled.length,
        revenue: periodFulfilled.reduce(
          (sum: number, r: any) => sum + (r.payment?.payable || 0),
          0,
        ),
      });

      setStats([
        {
          label: "Total Parents",
          value: parentsRes.data.data?.length || 0,
          icon: Users,
          color: "text-blue-600",
          bg: "bg-blue-100",
        },
        {
          label: "Total Teachers",
          value: teachersRes.data.data?.length || 0,
          icon: GraduationCap,
          color: "text-emerald-600",
          bg: "bg-emerald-100",
        },
        {
          label: "Pending Teacher Reqs",
          value: pendingTeachers,
          icon: ClipboardCheck,
          color: "text-amber-600",
          bg: "bg-amber-100",
        },
        {
          label: "Pending Parent Reqs",
          value: pendingParents,
          icon: ClipboardList,
          color: "text-rose-600",
          bg: "bg-rose-100",
        },
        {
          label: "Fulfilled Requests",
          value: fulfilledReqs.length,
          icon: CreditCard,
          color: "text-indigo-600",
          bg: "bg-indigo-100",
        },
        {
          label: "Total Revenue",
          value: totalRevenue,
          icon: DollarSign,
          color: "text-emerald-600",
          bg: "bg-emerald-100",
        },
      ]);
    } catch {
      toast.error("Failed to load dashboard stats");
    }
  }, [fromDate, toDate, toast]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated && fromDate <= toDate) fetchStats();
  }, [fromDate, toDate, isAuthenticated, fetchStats]);

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
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Access Denied
            </h1>
            <p className="text-slate-500 mb-6">
              Please log in to access the admin panel.
            </p>
            <a
              href="/admin/login"
              className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
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

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Report period</h2>
            <p className="text-sm text-slate-500">
              Filter requests and payment activity by date
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const date = new Date();
              date.setDate(date.getDate() - 6);
              setFromDate(date.toISOString().slice(0, 10));
              setToDate(new Date().toISOString().slice(0, 10));
            }}
            className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 cursor-pointer"
          >
            This week
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="dashboard-from"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              From
            </label>
            <input
              id="dashboard-from"
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="dashboard-to"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              To
            </label>
            <input
              id="dashboard-to"
              type="date"
              min={fromDate}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {fromDate > toDate && (
          <p className="mt-2 text-sm text-red-600">
            The From date must be before the To date.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-slate-900">Period Activity</h2>
            <p className="text-sm text-slate-500">
              Requests and payments between {fromDate} and {toDate}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Parent Requests",
              value: dailySummary.parentRequests,
              color: "text-rose-600",
            },
            {
              label: "Teacher Requests",
              value: dailySummary.teacherRequests,
              color: "text-amber-600",
            },
            {
              label: "Payments",
              value: dailySummary.fulfilled,
              color: "text-blue-600",
            },
            {
              label: "Daily Revenue",
              value: `Rs. ${dailySummary.revenue.toLocaleString()}`,
              color: "text-emerald-600",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-xl border border-slate-200 p-5"
            >
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {item.label}
              </p>
              <p className={`text-2xl font-bold mt-1 ${item.color}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            {[
              {
                href: "/admin/teacher-requests",
                label: "Review Teacher Verification Requests",
              },
              {
                href: "/admin/parent-requests",
                label: "Review Parent Tuition Requests",
              },
              { href: "/admin/payments", label: "View Payments & Invoices" },
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
              {
                label: "API Status",
                value: "Online",
                color: "text-emerald-600",
              },
              {
                label: "Environment",
                value: process.env.NEXT_PUBLIC_API_URL || "Local",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <span className="text-slate-500">{item.label}</span>
                <span
                  className={`font-medium text-slate-900 ${item.color || ""}`}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
