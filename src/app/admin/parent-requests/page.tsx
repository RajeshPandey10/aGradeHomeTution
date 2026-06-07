"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, Eye, Trash2, MapPin, DollarSign, Clock } from "lucide-react";
import { useRealtimeRefresh } from "@/lib/socket";
import { parentService, ParentProfile } from "@/services/parentService";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, ActionButtonSolid, Loading, EmptyState, StatusBadge } from "@/components/admin/UI";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export default function ParentRequestsPage() {
  const [requests, setRequests] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ParentProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ParentProfile | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const toast = useToast();

  const fetch = useCallback(async () => {
    try {
      const res = await parentService.getRequests();
      setRequests(res.data);
    } catch {
      toast.error("Failed to load parent requests");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);
  useRealtimeRefresh(fetch, ["parent-request:status-updated", "parent-request:created"]);

  const handleApprove = useCallback(async (requestId: string) => {
    setProcessing(requestId);
    try {
      await parentService.approve(requestId);
      toast.success("Parent request approved and published");
      setSelected(null);
      fetch();
    } catch {
      toast.error("Failed to approve parent request");
    } finally {
      setProcessing(null);
    }
  }, [fetch, toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setProcessing(deleteTarget._id);
    try {
      await parentService.delete(deleteTarget._id);
      toast.success("Parent request deleted");
      setDeleteTarget(null);
      fetch();
    } catch {
      toast.error("Failed to delete parent request");
    } finally {
      setProcessing(null);
    }
  }, [deleteTarget, fetch, toast]);

  return (
    <div>
      <PageHeader title="Parent Requests" subtitle="Review and approve tuition requests from parents" />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Request Details">
        {selected && (
          <div className="space-y-4 text-sm">
            {[
              ["Name", selected.name],
              ["Phone", selected.phone],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label as string}>
                <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">{label as string}</span>
                <p className="text-slate-900 mt-0.5">{value as string}</p>
              </div>
            ))}
            {selected.location && (
              <div>
                <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">Location</span>
                <p className="text-slate-900 mt-0.5 flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" />{selected.location}</p>
              </div>
            )}
            {selected.duration && (
              <div>
                <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">Duration</span>
                <p className="text-slate-900 mt-0.5 flex items-center gap-1.5"><Clock size={14} className="text-slate-400" />{selected.duration}</p>
              </div>
            )}
            {selected.salary && (
              <div>
                <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">Salary</span>
                <p className="text-slate-900 mt-0.5 flex items-center gap-1.5"><DollarSign size={14} className="text-slate-400" />{selected.salary}</p>
              </div>
            )}
            {selected.subjects?.length ? (
              <div>
                <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">Subjects</span>
                <p className="text-slate-900 mt-0.5">{selected.subjects.join(", ")}</p>
              </div>
            ) : null}
            <div>
              <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">Status</span>
              <div className="mt-0.5"><StatusBadge status={selected.status} /></div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
              <ActionButton icon={Eye} label="Close" onClick={() => setSelected(null)} color="slate" />
              {selected.status === "pending" && (
                <ActionButtonSolid icon={CheckCircle} label="Approve & Publish" onClick={() => handleApprove(selected._id)} disabled={processing === selected._id} color="emerald" />
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Parent Request"
        message={`Are you sure you want to delete the request from "${deleteTarget?.name || deleteTarget?.user?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
        loading={processing === deleteTarget?._id}
      />

      {loading ? <Loading /> : requests.length === 0 ? <EmptyState message="No parent requests found" /> : (
        <DataTable
          columns={[
            { key: "name", header: "Name", render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
            { key: "location", header: "Location", render: (r) => (
              <span className="inline-flex items-center gap-1 text-slate-500 max-w-[200px] truncate"><MapPin size={14} className="shrink-0" />{r.location || "—"}</span>
            )},
            { key: "duration", header: "Duration", render: (r) => <span className="text-slate-500">{r.duration || "—"}</span> },
            { key: "salary", header: "Salary", render: (r) => <span className="text-slate-500">{r.salary || "—"}</span> },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "actions", header: "", render: (r) => (
              <div className="flex gap-1.5 justify-end">
                <ActionButton icon={Eye} label="View" onClick={() => setSelected(r)} color="blue" />
                {r.status === "pending" && (
                  <ActionButton icon={CheckCircle} label="Approve" onClick={() => handleApprove(r._id)} disabled={processing === r._id} color="emerald" />
                )}
                <ActionButton icon={Trash2} label="Delete" onClick={() => setDeleteTarget(r)} disabled={processing === r._id} color="red" />
              </div>
            )},
          ]}
          data={requests}
        />
      )}
    </div>
  );
}
