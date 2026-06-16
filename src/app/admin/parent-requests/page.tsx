"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, Eye, Trash2, MapPin, DollarSign, Clock, Pencil } from "lucide-react";
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
  const [editing, setEditing] = useState<ParentProfile | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const toast = useToast();

  const fetch = useCallback(async () => {
    try {
      const res = await parentService.getRequests();
      const sorted = (res.data || []).sort((a, b) => {
        const aPrio = a.status === "pending" ? 0 : 1;
        const bPrio = b.status === "pending" ? 0 : 1;
        if (aPrio !== bPrio) return aPrio - bPrio;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      setRequests(sorted);
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

  const handleEdit = useCallback(async () => {
    if (!editing) return;
    setProcessing(editing._id);
    try {
      await parentService.update(editing._id, editForm);
      toast.success("Parent request updated");
      setEditing(null);
      fetch();
    } catch {
      toast.error("Failed to update parent request");
    } finally {
      setProcessing(null);
    }
  }, [editing, editForm, fetch, toast]);

  const openEdit = useCallback((r: ParentProfile) => {
    setEditForm({
      name: r.name || "",
      phone: r.phone || "",
      location: r.location || "",
      duration: r.duration || "",
      salary: r.salary || "",
      subjects: r.subjects?.join(", ") || "",
    });
    setEditing(r);
  }, []);

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

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Parent Request">
        {editing && (
          <div className="space-y-4 text-sm">
            {["name", "phone", "location", "duration", "salary"].map((field) => (
              <div key={field}>
                <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">{field}</label>
                <input
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editForm[field] || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
                />
              </div>
            ))}
            <div>
              <label className="font-medium text-slate-400 text-xs uppercase tracking-wider block mb-1">Subjects (comma separated)</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editForm.subjects || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, subjects: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
              <ActionButton icon={Eye} label="Cancel" onClick={() => setEditing(null)} color="slate" />
              <ActionButtonSolid icon={CheckCircle} label="Save" onClick={handleEdit} disabled={processing === editing._id} color="blue" />
            </div>
          </div>
        )}
      </Modal>

      {loading ? <Loading /> : requests.length === 0 ? <EmptyState message="No parent requests found" /> : (
        <DataTable
          columns={[
            { key: "name", header: "Name", render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
            { key: "location", header: "Location", render: (r) => {
              const loc = r.location || "";
              const short = loc.split(",")[0] || loc;
              return (
                <span className="inline-flex items-center gap-1 text-slate-500 max-w-[180px]" title={loc}>
                  <MapPin size={14} className="shrink-0" />
                  <span className="truncate">{short || "—"}</span>
                </span>
              );
            }},
            { key: "duration", header: "Duration", render: (r) => <span className="text-slate-500">{r.duration || "—"}</span> },
            { key: "salary", header: "Salary", render: (r) => <span className="text-slate-500">{r.salary || "—"}</span> },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "actions", header: "", render: (r) => (
              <div className="flex gap-1.5 justify-end">
                <ActionButton icon={Eye} label="View" onClick={() => setSelected(r)} color="blue" />
                {r.status === "pending" && (
                  <ActionButton icon={CheckCircle} label="Approve" onClick={() => handleApprove(r._id)} disabled={processing === r._id} color="emerald" />
                )}
                <ActionButton icon={Pencil} label="Edit" onClick={() => openEdit(r)} disabled={processing === r._id} color="amber" />
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
