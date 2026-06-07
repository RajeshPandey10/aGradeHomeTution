"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, Calendar, ShieldCheck } from "lucide-react";
import { teacherService, TeacherProfile } from "@/services/teacherService";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { Loading, EmptyState, StatusBadge } from "@/components/admin/UI";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div>
      <PageHeader title="Teachers" subtitle="All registered teachers" />

      {loading ? <Loading /> : teachers.length === 0 ? <EmptyState message="No teachers found" /> : (
        <DataTable
          columns={[
            { key: "name", header: "Name", render: (t) => <span className="font-medium text-slate-900">{t.name || t.user?.name}</span> },
            { key: "email", header: "Email", render: (t) => (
              <span className="inline-flex items-center gap-1.5 text-slate-500"><Mail size={14} />{t.user?.email || "—"}</span>
            )},
            { key: "address", header: "Address", render: (t) => <span className="text-slate-500">{t.address || "—"}</span> },
            { key: "status", header: "Status", render: (t) => (
              <span className="inline-flex items-center gap-1"><ShieldCheck size={12} className="text-slate-400" /><StatusBadge status={t.status} /></span>
            )},
            { key: "registered", header: "Registered", render: (t) => (
              <span className="inline-flex items-center gap-1.5 text-slate-500"><Calendar size={14} />{new Date(t.createdAt).toLocaleDateString()}</span>
            )},
          ]}
          data={teachers}
        />
      )}
    </div>
  );
}
