"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/lib/socket";
import { unlockAudio } from "@/lib/alertSound";
import { AdminAlert, presentAlert } from "@/lib/adminAlerts";
import { parentService } from "@/services/parentService";

type ParentRequestCreated = {
  request?: { _id?: string; name?: string; location?: string };
  requestId?: string;
  /** Set when an admin entered the request from the panel. */
  createdBy?: string;
};

type TeacherProfileEvent = {
  profile?: { _id?: string; name?: string; status?: string };
};

type BookingUnderReview = { requestId?: string };

type OnlineVerificationSubmitted = {
  profileId?: string;
  name?: string;
  resubmitted?: boolean;
};

type PersonalNotification = {
  id?: string;
  type?: string;
  title?: string;
  body?: string;
  tuitionRequest?: string | null;
};

const shortPlace = (location?: string) => (location || "").split(",")[0].trim();

export default function AdminEventNotifications() {
  const router = useRouter();
  const navigate = useCallback((href: string) => router.push(href), [router]);
  const show = useCallback(
    (alert: AdminAlert) => void presentAlert(alert, { navigate }),
    [navigate],
  );

  // Browsers block audio until the page has been interacted with; any click
  // or keypress in the panel unlocks it for background alerts.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
    window.addEventListener("keydown", unlock, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
    };
  }, []);

  useSocket({
    "parent-request:created": (payload: ParentRequestCreated = {}) => {
      if (payload.createdBy) return; // an admin's own entry, not a new lead
      const { request } = payload;
      const place = shortPlace(request?.location);
      show({
        kind: "parent-request",
        title: "New parent request",
        body: request?.name
          ? `${request.name}${place ? ` · ${place}` : ""} is waiting for approval.`
          : "A new tuition request is waiting for approval.",
        href: "/admin/parent-requests",
        tag: `parent-request:${request?._id || payload.requestId || Date.now()}`,
      });
    },

    "teacher-profile:created": ({ profile }: TeacherProfileEvent = {}) => {
      show({
        kind: "teacher-request",
        title: "New teacher request",
        body: profile?.name
          ? `${profile.name} submitted a profile for verification.`
          : "A teacher profile is ready for review.",
        href: "/admin/teacher-requests",
        tag: `teacher-request:${profile?._id || Date.now()}`,
      });
    },

    "online-verification:submitted": ({
      profileId,
      name,
      resubmitted,
    }: OnlineVerificationSubmitted = {}) => {
      show({
        kind: "teacher-request",
        title: resubmitted ? "Online teaching form resubmitted" : "New online teaching form",
        body: `${name || "A teacher"} wants to teach online tuitions and is waiting for review.`,
        href: "/admin/online-verifications",
        tag: `online-verification:${profileId || Date.now()}`,
      });
    },

    // Fires on every profile edit; only resubmissions need a review.
    "teacher-profile:updated": ({ profile }: TeacherProfileEvent = {}) => {
      if (profile?.status !== "in_review") return;
      show({
        kind: "teacher-request",
        title: "Teacher profile resubmitted",
        body: profile.name
          ? `${profile.name} updated their profile for review.`
          : "A teacher updated their profile for review.",
        href: "/admin/teacher-requests",
        tag: `teacher-request:${profile._id || Date.now()}`,
      });
    },

    // A teacher has paid; the booking waits for an admin to accept or
    // decline it. (request:fulfilled now only follows an admin's own accept.)
    "request:under-review": async ({ requestId }: BookingUnderReview = {}) => {
      let body = "A teacher has paid for a tuition and is waiting for your review.";
      if (requestId) {
        try {
          const { data } = await parentService.getRequestDetail(requestId);
          const teacher = data.lockedBy?.name || "A teacher";
          const place = shortPlace(data.location);
          body = `${teacher} paid for ${data.name ? `"${data.name}"` : "a tuition request"}${place ? ` · ${place}` : ""}. Accept or decline the booking.`;
        } catch {
          // Keep the generic text.
        }
      }
      show({
        kind: "request-fulfilled",
        title: "Booking to review",
        body,
        href: "/admin/parent-requests",
        tag: `under-review:${requestId || Date.now()}`,
      });
    },

    // Personal notifications for this admin. Only refund requests are meant
    // for admins; anything else (e.g. "your request is live" on a request an
    // admin entered) is already covered by the alerts above.
    "notification:new": (payload: PersonalNotification = {}) => {
      if (payload.type !== "refund_requested") return;
      show({
        kind: "refund-request",
        title: payload.title || "Refund requested",
        body: payload.body || "A teacher has requested a refund.",
        href: "/admin/refunds",
        tag: `refund:${payload.id || Date.now()}`,
      });
    },
  });

  return null;
}
