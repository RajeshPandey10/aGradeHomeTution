"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSocket } from "@/lib/socket";

type AdminEvent = "parent" | "teacher" | "fulfilled";

const eventDetails: Record<AdminEvent, { title: string; message: string; frequency: number }> = {
  parent: {
    title: "New parent request",
    message: "A new tuition request has arrived.",
    frequency: 660,
  },
  teacher: {
    title: "New teacher request",
    message: "A teacher profile is ready for review.",
    frequency: 880,
  },
  fulfilled: {
    title: "Request fulfilled",
    message: "A teacher has fulfilled a tuition request.",
    frequency: 1046,
  },
};

function playNotificationSound(frequency: number) {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.35);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.35);
  } catch {
    // Audio can be blocked until the admin has interacted with the page.
  }
}

function notifyAdmin(type: AdminEvent) {
  const detail = eventDetails[type];
  playNotificationSound(detail.frequency);
  toast.info(detail.title, { description: detail.message, duration: 6000 });
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(detail.title, { body: detail.message });
  }
}

export default function AdminEventNotifications() {
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
    initialized.current = true;
  }, []);

  useSocket({
    "parent-request:created": () => {
      if (initialized.current) notifyAdmin("parent");
    },
    "teacher-profile:created": () => {
      if (initialized.current) notifyAdmin("teacher");
    },
    "request:fulfilled": () => {
      if (initialized.current) notifyAdmin("fulfilled");
    },
  });

  return null;
}
