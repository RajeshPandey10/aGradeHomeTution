"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Volume2, VolumeX } from "lucide-react";
import { unlockAudio } from "@/lib/alertSound";
import { AdminAlert, notificationsSupported, presentAlert } from "@/lib/adminAlerts";
import { useAlertPrefs } from "@/store/alertPrefsStore";

type PermissionState = NotificationPermission | "unsupported";

const SAMPLES: (AdminAlert & { label: string })[] = [
  {
    label: "Parent request",
    kind: "parent-request",
    title: "New parent request",
    body: "Test · Sita Sharma · Baneshwor is waiting for approval.",
    href: "/admin/parent-requests",
  },
  {
    label: "Teacher request",
    kind: "teacher-request",
    title: "New teacher request",
    body: "Test · Ram Thapa submitted a profile for verification.",
    href: "/admin/teacher-requests",
  },
  {
    label: "Refund request",
    kind: "refund-request",
    title: "Refund requested",
    body: "Test · Ram Thapa requested a refund for \"Sita Sharma\".",
    href: "/admin/refunds",
  },
  {
    label: "Booking to review",
    kind: "request-fulfilled",
    title: "Booking to review",
    body: "Test · Ram Thapa paid for \"Sita Sharma\" · Baneshwor. Accept or decline the booking.",
    href: "/admin/parent-requests",
  },
];

const readPermission = (): PermissionState =>
  notificationsSupported() ? Notification.permission : "unsupported";

export default function NotificationSettings() {
  const router = useRouter();
  const { soundEnabled, volume, setSoundEnabled, setVolume } = useAlertPrefs();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<PermissionState>("default");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPermission(readPermission());
  }, []);

  useEffect(() => {
    if (!open) return;
    setPermission(readPermission());
    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const enableNotifications = useCallback(async () => {
    unlockAudio();
    if (!notificationsSupported()) return;
    try {
      setPermission(await Notification.requestPermission());
    } catch {
      setPermission(readPermission());
    }
  }, []);

  const test = useCallback(
    (sample: AdminAlert) => {
      unlockAudio();
      void presentAlert(
        { ...sample, tag: `test:${sample.kind}:${Date.now()}` },
        { navigate: (href) => router.push(href), force: true },
      );
    },
    [router],
  );

  const needsAttention = permission === "default" || permission === "denied";

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Alert settings"
        aria-expanded={open}
        className="relative cursor-pointer rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
      >
        {permission === "granted" ? <Bell size={20} /> : <BellOff size={20} />}
        {needsAttention && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
          <h2 className="text-sm font-semibold text-slate-900">Alerts</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Parent requests, teacher requests, refund requests and bookings.
          </p>

          <div className="mt-4 space-y-4">
            <section>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">Desktop notifications</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    permission === "granted"
                      ? "bg-emerald-100 text-emerald-700"
                      : permission === "denied"
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {permission === "granted"
                    ? "On"
                    : permission === "denied"
                      ? "Blocked"
                      : permission === "unsupported"
                        ? "Unavailable"
                        : "Off"}
                </span>
              </div>
              {permission === "default" && (
                <button
                  onClick={enableNotifications}
                  className="mt-2 w-full cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Turn on desktop notifications
                </button>
              )}
              {permission === "denied" && (
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Blocked for this site. Click the icon left of the address bar, allow
                  Notifications, then reload the page.
                </p>
              )}
              {permission === "unsupported" && (
                <p className="mt-2 text-xs text-slate-500">
                  This browser can&apos;t show desktop notifications. You&apos;ll still get
                  in-page alerts and sound.
                </p>
              )}
            </section>

            <section className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-700">Sound</span>
                <button
                  role="switch"
                  aria-checked={soundEnabled}
                  aria-label="Alert sound"
                  onClick={() => {
                    unlockAudio();
                    setSoundEnabled(!soundEnabled);
                  }}
                  className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
                    soundEnabled ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
                      soundEnabled ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              <label className="mt-3 flex items-center gap-3">
                {soundEnabled && volume > 0 ? (
                  <Volume2 size={16} className="shrink-0 text-slate-400" />
                ) : (
                  <VolumeX size={16} className="shrink-0 text-slate-400" />
                )}
                <span className="sr-only">Volume</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(volume * 100)}
                  disabled={!soundEnabled}
                  onChange={(e) => setVolume(Number(e.target.value) / 100)}
                  className="w-full accent-blue-600 disabled:opacity-40"
                />
                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-slate-500">
                  {Math.round(volume * 100)}%
                </span>
              </label>
            </section>

            <section className="border-t border-slate-100 pt-4">
              <span className="text-sm font-medium text-slate-700">Test an alert</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.kind}
                    onClick={() => test(sample)}
                    className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </section>

            <p className="border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
              Alerts reach you in other apps as long as this tab stays open. On macOS,
              also allow your browser under System Settings → Notifications.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
