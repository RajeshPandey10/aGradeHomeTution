"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { useAuthStore } from "@/store/authStore";
import Sidebar from "@/components/admin/Sidebar";
import Navbar from "@/components/admin/Navbar";
import { Loader2 } from "lucide-react";
import AdminEventNotifications from "@/components/admin/AdminEventNotifications";

// Pages a logged-out admin can open; every other /admin page needs a session.
const PUBLIC_PATHS = ["/admin/login", "/admin/verify-otp"];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const isPublic = PUBLIC_PATHS.includes(pathname.replace(/\/+$/, ""));

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isPublic && !isLoading && !isAuthenticated) {
      router.replace("/admin/login");
    }
  }, [isPublic, isLoading, isAuthenticated, router]);

  let content: React.ReactNode;
  if (isPublic) {
    content = children;
  } else if (isLoading || !isAuthenticated) {
    // Render no page until the session is known (or while redirecting away),
    // so a logged-out visitor's page never fires its requests.
    content = (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-slate-50">
        <AdminEventNotifications />
        <Sidebar />
        <div className="flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden">
          <Navbar />
          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Same spot in every branch, so the login/OTP pages get toasts too and
          they survive the switch to the dashboard. */}
      <Toaster richColors position="top-right" />
      {content}
    </>
  );
}
