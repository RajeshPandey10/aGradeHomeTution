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
  ShieldCheck,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useRealtimeRefresh } from "@/lib/socket";
import { useToast } from "@/hooks/useToast";
import { StatCard, PageHeader } from "@/components/admin/DataTable";

type StatKey =
  | "parents"
  | "teachersSignedUp"
  | "teachersWithCv"
  | "teachersVerified"
  | "teachersToReview"
  | "parentRequestsToApprove"
  | "bookingsToReview"
  | "tuitionsBooked"
  | "feesEarned";

const formatRupees = (amount: number) => `Rs. ${amount.toLocaleString("en-IN")}`;

// Each card says in plain words what its number counts and links to the page
// behind it. The three teacher cards read as a funnel:
// signed up → uploaded a CV → verified.
const STAT_CARDS: {
  key: StatKey;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  bg: string;
  format?: (value: number) => string;
}[] = [
  {
    key: "parents",
    label: "Parents",
    description: "Parent accounts registered",
    href: "/admin/parents",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  {
    key: "teachersSignedUp",
    label: "Teachers signed up",
    description: "Every teacher account, with or without a CV",
    href: "/admin/teachers?view=no-profile",
    icon: UserPlus,
    color: "text-sky-600",
    bg: "bg-sky-100",
  },
  {
    key: "teachersWithCv",
    label: "Teachers with CV",
    description: "Submitted their profile and CV",
    href: "/admin/teachers",
    icon: GraduationCap,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
  },
  {
    key: "teachersVerified",
    label: "Verified teachers",
    description: "Approved — can apply for tuitions",
    href: "/admin/teachers",
    icon: ShieldCheck,
    color: "text-teal-600",
    bg: "bg-teal-100",
  },
  {
    key: "teachersToReview",
    label: "Teachers to review",
    description: "Profiles waiting for your approval",
    href: "/admin/teacher-requests",
    icon: ClipboardCheck,
    color: "text-amber-600",
    bg: "bg-amber-100",
  },
  {
    key: "parentRequestsToApprove",
    label: "Parent requests to approve",
    description: "Tuition requests not yet published",
    href: "/admin/parent-requests",
    icon: ClipboardList,
    color: "text-rose-600",
    bg: "bg-rose-100",
  },
  {
    key: "bookingsToReview",
    label: "Bookings to review",
    description: "A teacher paid — accept or decline",
    href: "/admin/parent-requests",
    icon: UserCheck,
    color: "text-orange-600",
    bg: "bg-orange-100",
  },
  {
    key: "tuitionsBooked",
    label: "Tuitions booked",
    description: "A teacher paid and you accepted the booking",
    href: "/admin/payments",
    icon: CreditCard,
    color: "text-indigo-600",
    bg: "bg-indigo-100",
  },
  {
    key: "feesEarned",
    label: "Platform fees earned",
    description: "Fees collected from booked tuitions",
    href: "/admin/payments",
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    format: formatRupees,
  },
];

const EMPTY_STATS: Record<StatKey, number> = {
  parents: 0,
  teachersSignedUp: 0,
  teachersWithCv: 0,
  teachersVerified: 0,
  teachersToReview: 0,
  parentRequestsToApprove: 0,
  bookingsToReview: 0,
  tuitionsBooked: 0,
  feesEarned: 0,
};

interface ActivityDay {
  date: string;
  parentRequests: number;
  teacherRequests: number;
  payments: number;
  revenue: number;
}
const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateKey = (value: string | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : formatLocalDate(date);
};

const getDateRange = (from: string, to: string) => {
  const dates: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    dates.push(formatLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

export default function AdminDashboard() {
  const { isAuthenticated, initialize } = useAuthStore();
  const toast = useToast();
  const today = new Date();
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return formatLocalDate(date);
  });
  const [toDate, setToDate] = useState(formatLocalDate(today));
  const [dailySummary, setDailySummary] = useState({
    parentRequests: 0,
    teacherRequests: 0,
    fulfilled: 0,
    revenue: 0,
  });
  const [activityDays, setActivityDays] = useState<ActivityDay[]>([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [teachersWithoutCv, setTeachersWithoutCv] = useState(0);

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
        const date = dateKey(value);
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

      const activity = getDateRange(fromDate, toDate).map((date) => {
        const parentRequests = parentReqs.filter(
          (request: any) => dateKey(request.createdAt) === date,
        ).length;
        const teacherRequests = (teacherReqsRes.data.data || []).filter(
          (request: any) => dateKey(request.createdAt) === date,
        ).length;
        const payments = parentReqs.filter(
          (request: any) =>
            request.status === "fulfilled" &&
            dateKey(request.paymentSlip?.paidAt || request.createdAt) === date,
        );
        return {
          date,
          parentRequests,
          teacherRequests,
          payments: payments.length,
          revenue: payments.reduce(
            (sum: number, request: any) =>
              sum + (request.payment?.payable || 0),
            0,
          ),
        };
      });
      setActivityDays(activity);
      setStats({
        parents: parentsRes.data.data?.length || 0,
        teachersSignedUp: teachersRes.data.accountCount ?? 0,
        teachersWithCv:
          teachersRes.data.registeredCount ?? teachersRes.data.data?.length ?? 0,
        teachersVerified: teachersRes.data.verifiedCount ?? 0,
        teachersToReview: pendingTeachers,
        parentRequestsToApprove: pendingParents,
        bookingsToReview: parentReqs.filter((r: any) => r.status === "under_review").length,
        tuitionsBooked: fulfilledReqs.length,
        feesEarned: totalRevenue,
      });
      setTeachersWithoutCv(teachersRes.data.withoutProfileCount ?? 0);
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
    "request:under-review",
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
              setFromDate(formatLocalDate(date));
              setToDate(formatLocalDate(new Date()));
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {STAT_CARDS.map(({ key, format, ...card }) => (
          <StatCard
            key={key}
            {...card}
            value={format ? format(stats[key]) : stats[key]}
            hint={
              key === "teachersSignedUp" && teachersWithoutCv > 0
                ? `${teachersWithoutCv} still ${teachersWithoutCv === 1 ? "needs" : "need"} to upload a CV`
                : undefined
            }
          />
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

      <div className="mt-8 rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Daily Activity Log</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            A complete record for each day in the selected period
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-180">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60">
                {[
                  "Date",
                  "Parent Requests",
                  "Teacher Requests",
                  "Payments",
                  "Revenue",
                  "Total Activity",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activityDays.map((day) => {
                const totalActivity =
                  day.parentRequests + day.teacherRequests + day.payments;
                return (
                  <tr key={day.date} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">
                      {new Date(`${day.date}T00:00:00`).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-rose-600 font-medium">
                      {day.parentRequests}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-amber-600 font-medium">
                      {day.teacherRequests}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-blue-600 font-medium">
                      {day.payments}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-emerald-600 font-medium">
                      Rs. {day.revenue.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">
                      {totalActivity}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
