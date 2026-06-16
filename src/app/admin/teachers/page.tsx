"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, Calendar, ShieldCheck, User, Trash2 } from "lucide-react";
import { teacherService, TeacherProfile } from "@/services/teacherService";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, Loading, EmptyState, StatusBadge } from "@/components/admin/UI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TeacherProfile | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const toast = useToast();

  const fetch = useCallback(async () => {
    try {
      const res = await teacherService.getAll();
      setTeachers(res.data);
    } catch {
      toast.error("Failed to load teachers");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setProcessing(deleteTarget._id);
    try {
      await teacherService.delete(deleteTarget._id);
      toast.success("Teacher deleted");
      setDeleteTarget(null);
      fetch();
    } catch {
      toast.error("Failed to delete teacher");
    } finally {
      setProcessing(null);
    }
  }, [deleteTarget, fetch, toast]);

  return (
    <div>
      <PageHeader title="Teachers" subtitle="All registered teachers" />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Teacher"
        message={`Are you sure you want to delete "${deleteTarget?.name || deleteTarget?.user?.name}"? This will permanently remove their profile, account, and all associated data.`}
        confirmLabel="Delete"
        confirmColor="red"
        loading={processing === deleteTarget?._id}
      />

      {loading ? <Loading /> : teachers.length === 0 ? <EmptyState message="No teachers found" /> : (
        <DataTable
          columns={[
            { key: "name", header: "Name", render: (t) => <span className="font-medium text-slate-900">{t.name || t.user?.name}</span> },
            { key: "email", header: "Email", render: (t) => (
              <span className="inline-flex items-center gap-1.5 text-slate-500"><Mail size={14} />{t.user?.email || "—"}</span>
            )},
            { key: "gender", header: "Gender", render: (t) => (
              <span className="inline-flex items-center gap-1.5 text-slate-500"><User size={14} />{t.gender || "—"}</span>
            )},
            { key: "address", header: "Address", render: (t) => <span className="text-slate-500">{t.address || "—"}</span> },
            { key: "status", header: "Status", render: (t) => (
              <span className="inline-flex items-center gap-1"><ShieldCheck size={12} className="text-slate-400" /><StatusBadge status={t.status} /></span>
            )},
            { key: "registered", header: "Registered", render: (t) => (
              <span className="inline-flex items-center gap-1.5 text-slate-500"><Calendar size={14} />{new Date(t.createdAt).toLocaleDateString()}</span>
            )},
            { key: "actions", header: "", render: (t) => (
              <div className="flex justify-end">
                <ActionButton icon={Trash2} label="Delete" onClick={() => setDeleteTarget(t)} disabled={processing === t._id} color="red" />
              </div>
            )},
          ]}
          data={teachers}
        />
      )}
    </div>
  );
}
