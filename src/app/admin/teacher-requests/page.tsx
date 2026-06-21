"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Eye, ExternalLink, FileText, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { useRealtimeRefresh } from "@/lib/socket";
import { teacherService, TeacherProfile } from "@/services/teacherService";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, ActionButtonSolid, Loading, EmptyState, StatusBadge } from "@/components/admin/UI";
import { Modal } from "@/components/admin/Modal";

export default function TeacherRequestsPage() {
  const [requests, setRequests] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeacherProfile | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TeacherProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const res = await teacherService.getRequests();
      setRequests(res.data);
    } catch {
      toast.error("Failed to load teacher requests");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeRefresh(fetchData, ["teacher-profile:status-updated"]);

  const handleApprove = useCallback(async (profileId: string, status = "verified") => {
    setProcessing(profileId);
    try {
      await teacherService.approve(profileId, status);
      toast.success(status === "verified" ? "Teacher approved successfully" : "Profile sent for review");
      setSelected(null);
      fetchData();
    } catch {
      toast.error("Failed to update teacher status");
    } finally {
      setProcessing(null);
    }
  }, [fetchData, toast]);

  const handleReject = useCallback(async () => {
    if (!rejectTarget) return;
    if (!rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    setProcessing(rejectTarget._id);
    try {
      await teacherService.approve(rejectTarget._id, "rejected", rejectionReason.trim(), rejectionRemarks.trim() || undefined);
      toast.success("Teacher request rejected");
      setRejectTarget(null);
      setRejectionReason("");
      setRejectionRemarks("");
      setSelected(null);
      fetchData();
    } catch {
      toast.error("Failed to reject teacher");
    } finally {
      setProcessing(null);
    }
  }, [rejectTarget, rejectionReason, rejectionRemarks, fetchData, toast]);

  const openReject = (profile: TeacherProfile) => {
    setRejectTarget(profile);
    setRejectionReason("");
    setRejectionRemarks("");
  };

  return (
    <div>
      <PageHeader title="Teacher Verification" subtitle="Review and verify teacher profiles" />

      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setViewingDoc(null); }}
        title={viewingDoc ? "Document Viewer" : "Profile Details"}
        wide={!!viewingDoc}
      >
        {selected && !viewingDoc && (
          <div className="space-y-3 text-sm">
            {[
              ["Name", selected.name || selected.user?.name],
              ["Email", selected.user?.email],
              ["Gender", selected.gender],
              ["Address", selected.address],
              ["Qualification", selected.academicQualification],
              ["Experience", selected.experience],
              ["About", selected.about],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label as string}>
                <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">{label as string}</span>
                <p className="text-slate-900 mt-0.5">{value as string}</p>
              </div>
            ))}

            {selected.status === "rejected" && selected.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                <span className="font-medium text-red-600 text-xs uppercase tracking-wider">Rejection Reason</span>
                <p className="text-red-800 mt-0.5 font-medium">{selected.rejectionReason}</p>
                {selected.rejectionRemarks && (
                  <>
                    <span className="font-medium text-red-600 text-xs uppercase tracking-wider mt-2 block">Remarks</span>
                    <p className="text-red-700 mt-0.5">{selected.rejectionRemarks}</p>
                  </>
                )}
                {selected.rejectedAt && (
                  <p className="text-red-400 text-xs mt-2">Rejected on {new Date(selected.rejectedAt).toLocaleDateString()}</p>
                )}
              </div>
            )}

            {(() => {
              const cvUrl = selected.cv;
              return cvUrl ? (
                <div>
                  <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">CV</span>
                  <p className="mt-0.5">
                    <button onClick={() => setViewingDoc(cvUrl)} className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm">
                      <FileText size={14} /> View CV <ExternalLink size={12} />
                    </button>
                  </p>
                </div>
              ) : null;
            })()}
            {(() => {
              const ids = selected.identification;
              return ids?.length ? (
                <div>
                  <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">Identification</span>
                  <div className="mt-0.5 space-y-1">
                    {ids.map((url, i) => (
                      <button key={i} onClick={() => setViewingDoc(url)} className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm">
                        <FileText size={14} /> ID {i + 1} <ExternalLink size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 mt-4">
              <ActionButton icon={XCircle} label="Close" onClick={() => setSelected(null)} color="slate" />
              {selected.status === "in_review" && (
                <>
                  <ActionButtonSolid icon={XCircle} label="Reject" onClick={() => openReject(selected)} disabled={processing === selected._id} color="red" />
                  <ActionButtonSolid icon={CheckCircle} label="Approve" onClick={() => handleApprove(selected._id)} disabled={processing === selected._id} color="emerald" />
                </>
              )}
              {selected.status === "rejected" && (
                <ActionButtonSolid icon={CheckCircle} label="Re-approve" onClick={() => handleApprove(selected._id)} disabled={processing === selected._id} color="emerald" />
              )}
              {selected.status === "unverified" && (
                <ActionButtonSolid icon={CheckCircle} label="Send for Review" onClick={() => handleApprove(selected._id, "in_review")} disabled={processing === selected._id} color="blue" />
              )}
            </div>
          </div>
        )}
        {selected && viewingDoc && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-3">
              <button onClick={() => setViewingDoc(null)} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm">
                <ArrowLeft size={16} /> Back to profile
              </button>
            </div>
            {viewingDoc.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) ? (
              <div className="flex items-center justify-center bg-slate-100 rounded-lg min-h-[500px] p-4">
                <img src={viewingDoc} alt="Document" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md" />
              </div>
            ) : (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewingDoc)}&embedded=true`}
                className="w-full min-h-[600px] rounded-lg border border-slate-200"
                title="Document viewer"
              />
            )}
            <div className="mt-3 text-center">
              <a href={viewingDoc} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1">
                <ExternalLink size={14} /> Open original in new tab
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Rejection Dialog with Reason + Remarks */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { if (!processing) { setRejectTarget(null); } }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-red-100 text-red-600">
                <AlertTriangle size={24} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Reject Teacher Profile</h2>
              <p className="text-sm text-slate-500 mt-1">
                Rejecting &quot;{rejectTarget.name || rejectTarget.user?.name}&quot;&apos;s profile. The teacher will be notified with the reason.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. CV not readable, Invalid ID document"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={!!processing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Remarks <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                  placeholder="e.g. Please upload a clearer scan of your ID and resubmit your profile"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  disabled={!!processing}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setRejectTarget(null); setRejectionReason(""); setRejectionRemarks(""); }}
                disabled={!!processing}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!processing || !rejectionReason.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {processing && <Loader2 size={16} className="animate-spin" />}
                {processing ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Loading /> : requests.length === 0 ? <EmptyState message="No verification requests" /> : (
        <DataTable
          columns={[
            { key: "name", header: "Name", render: (r) => <span className="font-medium text-slate-900">{r.name || r.user?.name}</span> },
            { key: "email", header: "Email", render: (r) => <span className="text-slate-500">{r.user?.email || "—"}</span> },
            { key: "qualification", header: "Qualification", render: (r) => (
              <span className="text-slate-500 max-w-[220px] inline-block truncate">{r.academicQualification || "—"}</span>
            )},
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "actions", header: "", render: (r) => (
              <div className="flex gap-1.5 justify-end">
                <ActionButton icon={Eye} label="View" onClick={() => setSelected(r)} color="blue" />
                {r.status === "in_review" && (
                  <>
                    <ActionButton icon={XCircle} label="Reject" onClick={() => openReject(r)} disabled={processing === r._id} color="red" />
                    <ActionButton icon={CheckCircle} label="Approve" onClick={() => handleApprove(r._id)} disabled={processing === r._id} color="emerald" />
                  </>
                )}
                {r.status === "unverified" && (
                  <ActionButton icon={CheckCircle} label="Review" onClick={() => handleApprove(r._id, "in_review")} disabled={processing === r._id} color="blue" />
                )}
              </div>
            )},
          ]}
          data={requests}
        />
      )}
    </div>
  );
}
