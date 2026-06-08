"use client";

import { useState, useCallback } from "react";
import { Send, Bell, Users, User, Globe } from "lucide-react";
import { fcmService, FcmResult, FcmBatchResult } from "@/services/fcmService";
import { useToast } from "@/hooks/useToast";
import { PageHeader } from "@/components/admin/DataTable";
import { ActionButtonSolid } from "@/components/admin/UI";

export default function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [role, setRole] = useState("");
  const [user_id, setUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<FcmResult | null>(null);
  const toast = useToast();

  const sendMode = !role && !user_id ? "all" : role ? `role: ${role}` : `user: ${user_id}`;

  const handleSend = useCallback(async () => {
    setSending(true);
    setResult(null);
    try {
      const payload: Record<string, unknown> = { title, body };
      if (role) payload.role = role;
      if (user_id) payload.user_id = user_id;
      const res = await fcmService.send(payload as any);
      setResult(res);
      const totalSuccess = res.results?.reduce((sum, r) => sum + r.successCount, 0) ?? 0;
      if (totalSuccess > 0) {
        toast.success(res.message || "Notification sent successfully");
      } else {
        toast.error(res.message || "Failed to send notification");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to send notification";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }, [title, body, role, user_id, toast]);

  return (
    <div>
      <PageHeader title="Push Notifications" subtitle="Send FCM notifications to users" />

      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: "", label: "All Devices", icon: Globe },
            { value: "teacher", label: "Teachers", icon: Users },
            { value: "parent", label: "Parents", icon: Users },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setRole(opt.value); setUserId(""); }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                role === opt.value && !user_id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <opt.icon size={15} />
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => { setRole(""); setUserId(prompt("Enter User ID:") || ""); }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              user_id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <User size={15} />
            Specific User
          </button>
        </div>

        {user_id && (
          <div className="mb-4 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg flex items-center gap-2">
            <User size={14} /> Sending to user: <strong>{user_id}</strong>
          </div>
        )}

        <div className="space-y-4">
          <input
            placeholder="Notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
          />
          <textarea
            placeholder="Notification body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-900 bg-white"
          />

          <div className="flex items-center gap-3 pt-2">
            <ActionButtonSolid
              icon={Send}
              label={sending ? "Sending..." : "Send Notification"}
              onClick={handleSend}
              disabled={sending || !title || !body}
              color="blue"
            />
            <span className="text-xs text-slate-400">
              <Bell size={14} className="inline mr-1" />
              Targeting: <strong>{sendMode}</strong>
            </span>
          </div>
        </div>

        {result && (
          <div className={`mt-4 p-4 border rounded-lg ${result.results?.some((r) => r.successCount > 0) ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <p className={`text-sm font-medium ${result.results?.some((r) => r.successCount > 0) ? "text-emerald-800" : "text-red-800"}`}>{result.message}</p>
            {result.results && result.results.length > 0 && (
              <div className="mt-2 text-xs space-y-2">
                {result.results.map((r: FcmBatchResult, i: number) => (
                  <div key={i}>
                    <div className={r.successCount > 0 ? "text-emerald-700" : "text-red-700"}>
                      Batch {i + 1}: {r.successCount} success, {r.failureCount} failed
                      {r.removedStaleTokens ? <span className="ml-2 text-amber-600">({r.removedStaleTokens} stale token(s) removed)</span> : null}
                    </div>
                    {(r.errors?.length ?? 0) > 0 && (
                      <details className="mt-1">
                        <summary className="text-slate-500 cursor-pointer hover:text-slate-700">Error details</summary>
                        <ul className="mt-1 pl-4 space-y-0.5 text-slate-500">
                          {(r.errors ?? []).slice(0, 5).map((err: string, j: number) => (
                            <li key={j}>{err}</li>
                          ))}
                          {(r.errors?.length ?? 0) > 5 && <li className="text-slate-400">...and {(r.errors?.length ?? 0) - 5} more</li>}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
