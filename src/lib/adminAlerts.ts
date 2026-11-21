import { toast } from "sonner";
import { AlertKind, playAlertSound } from "@/lib/alertSound";
import { useAlertPrefs } from "@/store/alertPrefsStore";

export interface AdminAlert {
  kind: AlertKind;
  title: string;
  body: string;
  /** Admin page to open when the alert is clicked. */
  href: string;
  /** Same tag = same event; the OS shows it once even if it arrives twice. */
  tag?: string;
}

export const notificationsSupported = () =>
  typeof window !== "undefined" && "Notification" in window;

function pageIsInFront() {
  return document.visibilityState === "visible" && document.hasFocus();
}

function showSystemNotification(alert: AdminAlert, silent: boolean, navigate: (href: string) => void) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    const notification = new Notification(alert.title, {
      body: alert.body,
      tag: alert.tag,
      icon: "/favicon.ico",
      silent,
    });
    notification.onclick = () => {
      window.focus();
      navigate(alert.href);
      notification.close();
    };
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
  }
}

/**
 * Plays the alert's sound, shows an in-page toast and — when the admin is
 * looking at another app or tab — a system notification.
 * `force` shows the system notification even when the panel is in front
 * (used by the test buttons).
 */
export async function presentAlert(
  alert: AdminAlert,
  { navigate, force = false }: { navigate: (href: string) => void; force?: boolean },
) {
  const { soundEnabled, volume } = useAlertPrefs.getState();
  const played = soundEnabled ? await playAlertSound(alert.kind, volume) : false;

  toast.info(alert.title, {
    description: alert.body,
    duration: 8000,
    action: { label: "Open", onClick: () => navigate(alert.href) },
  });

  if (force || !pageIsInFront()) {
    // Our own sound already played (or sound is off): keep the OS quiet.
    // If audio is still locked, let the OS play its default sound instead.
    showSystemNotification(alert, soundEnabled ? played : true, navigate);
  }
}
