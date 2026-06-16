"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Eye, ExternalLink, FileText, ArrowLeft } from "lucide-react";
import { useRealtimeRefresh } from "@/lib/socket";
import { teacherService, TeacherProfile } from "@/services/teacherService";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, ActionButtonSolid, Loading, EmptyState, StatusBadge } from "@/components/admin/UI";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export default function TeacherRequestsPage() {
  const [requests, setRequests] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeacherProfile | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TeacherProfile | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const toast = useToast();

  const fetch = useCallback(async () => {
    try {
      const res = await teacherService.getRequests();
      setRequests(res.data);
    } catch {
      toast.error("Failed to load teacher requests");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);
  useRealtimeRefresh(fetch, ["teacher-profile:status-updated"]);

  const handleApprove = useCallback(async (profileId: string, status = "verified") => {
    setProcessing(profileId);
    try {
      await teacherService.approve(profileId, status);
      toast.success(status === "verified" ? "Teacher approved successfully" : "Profile sent for review");
      setSelected(null);
      fetch();
    } catch {
      toast.error("Failed to update teacher status");
    } finally {
      setProcessing(null);
    }
  }, [fetch, toast]);

  const handleReject = useCallback(async () => {
    if (!rejectTarget) return;
    setProcessing(rejectTarget._id);
    try {
      await teacherService.approve(rejectTarget._id, "rejected");
      toast.success("Teacher request rejected");
      setRejectTarget(null);
      setSelected(null);
      fetch();
    } catch {
      toast.error("Failed to reject teacher");
    } finally {
      setProcessing(null);
    }
  }, [rejectTarget, fetch, toast]);

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
                  <ActionButtonSolid icon={XCircle} label="Reject" onClick={() => setRejectTarget(selected)} disabled={processing === selected._id} color="red" />
                  <ActionButtonSolid icon={CheckCircle} label="Approve" onClick={() => handleApprove(selected._id)} disabled={processing === selected._id} color="emerald" />
                </>
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

      <ConfirmDialog
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        title="Reject Teacher Profile"
        message={`Are you sure you want to reject "${rejectTarget?.name || rejectTarget?.user?.name}"'s verification request?`}
        confirmLabel="Reject"
        confirmColor="red"
        loading={processing === rejectTarget?._id}
      />

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
                    <ActionButton icon={XCircle} label="Reject" onClick={() => setRejectTarget(r)} disabled={processing === r._id} color="red" />
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
