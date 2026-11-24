"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Eye,
  ExternalLink,
  Loader2,
  AlertTriangle,
  PlayCircle,
  PenTool,
} from "lucide-react";
import { useRealtimeRefresh } from "@/lib/socket";
import { teacherService, TeacherProfile } from "@/services/teacherService";
import { labelFor, optionsFor, type OnlineTeachingStatus } from "@/lib/enums";
import { useToast } from "@/hooks/useToast";
import { getErrorMessage } from "@/services/api";
import { getImageUrl } from "@/lib/image";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import {
  ActionButton,
  ActionButtonSolid,
  Loading,
  EmptyState,
  StatusBadge,
  TeacherAvatar,
} from "@/components/admin/UI";
import { Modal } from "@/components/admin/Modal";
import { SearchInput } from "@/components/admin/SearchInput";

// Only submitted forms are listed, so there's no "Not submitted" tab.
const STATUS_TABS = [
  { label: "All", value: "" } as const,
  ...optionsFor("onlineTeachingStatus").filter((s) => s.value !== "not_submitted"),
];

const REASON_MAX = 500;

/** "youtu.be", "drive.google.com" — where a demo video link points. */
const videoHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">{label}</span>
      <div className="mt-0.5 text-slate-900">{children}</div>
    </div>
  );
}

/** The classes a teacher chose, with the details they gave for Entrance / Others. */
function ClassChips({ profile }: { profile: TeacherProfile }) {
  const ot = profile.onlineTeaching;
  return (
    <div className="flex flex-wrap gap-1.5">
      {(ot?.classLevels || []).map((key) => (
        <span
          key={key}
          className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
        >
          {labelFor("onlineClassLevel", key)}
          {key === "entrance_preparation" && ot?.entrancePreparation ? `: ${ot.entrancePreparation}` : ""}
          {key === "others" && ot?.otherClasses ? `: ${ot.otherClasses}` : ""}
        </span>
      ))}
    </div>
  );
}

export default function OnlineVerificationsPage() {
  const [profiles, setProfiles] = useState<TeacherProfile[]>([]);
  const [inReviewCount, setInReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeacherProfile | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TeacherProfile | null>(null);
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OnlineTeachingStatus | "">("");
  const [search, setSearch] = useState("");
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const res = await teacherService.getOnlineVerifications(
        statusFilter || undefined,
        search.trim() || undefined,
      );
      setProfiles(res.data);
      setInReviewCount(res.inReviewCount);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load online verifications"));
    } finally {
      setLoading(false);
    }
  }, [toast, statusFilter, search]);

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [fetchData]);
  useEffect(() => {
    setLoading(true);
  }, [statusFilter]);
  useRealtimeRefresh(fetchData, [
    "online-verification:submitted",
    "online-verification:status-updated",
  ]);

  const review = useCallback(
    async (profile: TeacherProfile, decision: "approve" | "reject", rejectReason?: string) => {
      setProcessing(profile._id);
      try {
        await teacherService.reviewOnlineVerification(profile._id, decision, rejectReason);
        toast.success(
          decision === "approve"
            ? `${profile.name || "Teacher"} can now apply for online tuitions`
            : "Rejected. The teacher has been told why and can resubmit.",
        );
        setSelected(null);
        setRejectTarget(null);
        setReason("");
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setProcessing(null);
        fetchData();
      }
    },
    [fetchData, toast],
  );

  const openReject = (profile: TeacherProfile) => {
    setRejectTarget(profile);
    setReason("");
  };

  const canApprove = (p: TeacherProfile) =>
    p.onlineTeaching?.status === "in_review" || p.onlineTeaching?.status === "rejected";
  const canReject = (p: TeacherProfile) =>
    p.onlineTeaching?.status === "in_review" || p.onlineTeaching?.status === "verified";

  return (
    <div>
      <PageHeader
        title="Online Teaching Verification"
        subtitle="Teachers who want to teach online tuitions. Approve them before they can apply."
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search name, email, phone…"
        shown={profiles.length}
      />

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === tab.value
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
            {tab.value === "in_review" && inReviewCount > 0 && (
              <span
                className={`ml-1.5 inline-flex min-w-4.5 justify-center rounded-full px-1 text-[10px] font-semibold ${
                  statusFilter === tab.value ? "bg-white text-blue-700" : "bg-orange-500 text-white"
                }`}
              >
                {inReviewCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Online Teaching Details" wide>
        {selected && (
          <div className="space-y-4 text-sm max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex items-center gap-4">
              <TeacherAvatar
                name={selected.name || selected.user?.name}
                src={selected.profilePicture ? getImageUrl(selected.profilePicture) : null}
                size={72}
              />
              <div className="min-w-0">
                <p className="text-base font-semibold text-slate-900 truncate">
                  {selected.name || selected.user?.name}
                </p>
                <p className="text-slate-500 truncate">{selected.user?.email}</p>
                <p className="text-slate-500">
                  {selected.phone || selected.user?.phoneNumber || "No phone"}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <StatusBadge status={selected.onlineTeaching?.status || "not_submitted"} kind="onlineTeachingStatus" />
                  <span className="text-xs text-slate-400">
                    Profile: {selected.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </div>

            {selected.onlineTeaching?.status === "rejected" && selected.onlineTeaching.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <span className="font-medium text-red-600 text-xs uppercase tracking-wider">Rejection reason</span>
                <p className="text-red-800 mt-0.5">{selected.onlineTeaching.rejectionReason}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="1. Pen tablet">
                <span className="inline-flex items-center gap-1.5">
                  <PenTool size={14} className="text-slate-400" />
                  {selected.onlineTeaching?.hasPenTablet ? "Yes" : "No"}
                </span>
              </Field>
              <Field label="2. Demo video">
                {selected.onlineTeaching?.demoVideoUrl ? (
                  // Any link is accepted now; only http(s) ones are made clickable.
                  /^https?:\/\//i.test(selected.onlineTeaching.demoVideoUrl) ? (
                    <a
                      href={selected.onlineTeaching.demoVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1 text-blue-600 hover:underline"
                      title={selected.onlineTeaching.demoVideoUrl}
                    >
                      <PlayCircle size={14} className="shrink-0" /> Watch demo video
                      <span className="truncate text-xs text-slate-400">
                        ({videoHost(selected.onlineTeaching.demoVideoUrl)})
                      </span>
                      <ExternalLink size={12} className="shrink-0" />
                    </a>
                  ) : (
                    <span className="break-all text-slate-700">{selected.onlineTeaching.demoVideoUrl}</span>
                  )
                ) : (
                  "—"
                )}
              </Field>
            </div>
            <Field label="3. Classes they can teach">
              <ClassChips profile={selected} />
            </Field>
            <Field label="4. Online teaching experience">
              <p className="whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-100">
                {selected.onlineTeaching?.experience || "—"}
              </p>
            </Field>
            {selected.onlineTeaching?.submittedAt && (
              <p className="text-xs text-slate-400">
                Submitted {new Date(selected.onlineTeaching.submittedAt).toLocaleString()}
                {selected.onlineTeaching.reviewedAt &&
                  ` · Reviewed ${new Date(selected.onlineTeaching.reviewedAt).toLocaleString()}`}
              </p>
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
              <ActionButton icon={XCircle} label="Close" onClick={() => setSelected(null)} color="slate" />
              {canReject(selected) && (
                <ActionButtonSolid
                  icon={XCircle}
                  label={selected.onlineTeaching?.status === "verified" ? "Revoke" : "Reject"}
                  onClick={() => openReject(selected)}
                  disabled={processing === selected._id}
                  color="red"
                />
              )}
              {canApprove(selected) && (
                <ActionButtonSolid
                  icon={CheckCircle}
                  label="Approve"
                  onClick={() => review(selected, "approve")}
                  disabled={processing === selected._id}
                  color="emerald"
                />
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => !processing && setRejectTarget(null)} />
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-red-100 text-red-600">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                {rejectTarget.onlineTeaching?.status === "verified"
                  ? "Revoke Online Teaching"
                  : "Reject Online Teaching Form"}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                <span className="font-medium text-slate-700">{rejectTarget.name || rejectTarget.user?.name}</span>{" "}
                won&apos;t be able to apply for online tuitions. They&apos;ll see your reason and can update
                and resubmit the form.
              </p>
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. The demo video link isn't shared publicly; please set it to 'Anyone with the link'"
              rows={3}
              maxLength={REASON_MAX}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              disabled={!!processing}
              autoFocus
            />
            <p className="text-right text-xs text-slate-400 mt-1">
              {reason.length}/{REASON_MAX}
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRejectTarget(null)}
                disabled={!!processing}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => review(rejectTarget, "reject", reason.trim())}
                disabled={!!processing || !reason.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {processing && <Loader2 size={16} className="animate-spin" />}
                {processing ? "Saving..." : rejectTarget.onlineTeaching?.status === "verified" ? "Revoke" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : profiles.length === 0 ? (
        <EmptyState
          message={
            search.trim()
              ? `No teachers match "${search.trim()}"`
              : statusFilter
                ? `No ${statusFilter.replace(/_/g, " ")} online verifications`
                : "No teacher has submitted the online teaching form yet"
          }
        />
      ) : (
        <DataTable
          columns={[
            {
              key: "teacher",
              header: "Teacher",
              render: (p) => (
                <div className="flex items-center gap-2.5">
                  <TeacherAvatar
                    name={p.name || p.user?.name}
                    src={p.profilePicture ? getImageUrl(p.profilePicture) : null}
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{p.name || p.user?.name}</p>
                    <p className="text-slate-400 text-xs truncate">{p.user?.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "tablet",
              header: "Pen tablet",
              render: (p) => (
                <span className={p.onlineTeaching?.hasPenTablet ? "text-emerald-600 font-medium" : "text-slate-500"}>
                  {p.onlineTeaching?.hasPenTablet ? "Yes" : "No"}
                </span>
              ),
            },
            {
              key: "classes",
              header: "Classes",
              render: (p) => (
                <span
                  className="text-slate-500 max-w-60 inline-block truncate"
                  title={(p.onlineTeaching?.classLevels || []).map((key) => labelFor("onlineClassLevel", key)).join(", ")}
                >
                  {(p.onlineTeaching?.classLevels || []).map((key) => labelFor("onlineClassLevel", key)).join(", ") || "—"}
                </span>
              ),
            },
            {
              key: "submitted",
              header: "Submitted",
              render: (p) => (
                <span className="text-slate-500 text-xs">
                  {p.onlineTeaching?.submittedAt
                    ? new Date(p.onlineTeaching.submittedAt).toLocaleDateString()
                    : "—"}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (p) => (
                <div>
                  <StatusBadge status={p.onlineTeaching?.status || "not_submitted"} kind="onlineTeachingStatus" />
                  {p.onlineTeaching?.status === "rejected" && p.onlineTeaching.rejectionReason && (
                    <p className="text-red-500 text-xs mt-0.5 max-w-40 truncate" title={p.onlineTeaching.rejectionReason}>
                      {p.onlineTeaching.rejectionReason}
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (p) => (
                <div className="flex gap-1.5 justify-end">
                  <ActionButton icon={Eye} label="View" onClick={() => setSelected(p)} color="blue" />
                  {p.onlineTeaching?.status === "in_review" && (
                    <>
                      <ActionButton
                        icon={XCircle}
                        label="Reject"
                        onClick={() => openReject(p)}
                        disabled={processing === p._id}
                        color="red"
                      />
                      <ActionButton
                        icon={CheckCircle}
                        label="Approve"
                        onClick={() => review(p, "approve")}
                        disabled={processing === p._id}
                        color="emerald"
                      />
                    </>
                  )}
                </div>
              ),
            },
          ]}
          data={profiles}
        />
      )}
    </div>
  );
}
