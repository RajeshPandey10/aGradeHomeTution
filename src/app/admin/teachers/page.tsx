"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, Phone, Calendar, ShieldCheck, User, Trash2, FileText, Eye, ExternalLink, ArrowLeft } from "lucide-react";
import { getImageUrl } from "@/lib/image";
import { teacherService, TeacherProfile } from "@/services/teacherService";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import {
  ActionButton,
  Loading,
  EmptyState,
  StatusBadge,
} from "@/components/admin/UI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Modal } from "@/components/admin/Modal";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TeacherProfile | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState({ registered: 0, verified: 0 });
  const [selected, setSelected] = useState<TeacherProfile | null>(null);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const toast = useToast();

  const fetch = useCallback(async () => {
    try {
      const res = await teacherService.getAll(search.trim() || undefined);
      setTeachers(res.data);
      setCounts({ registered: res.registeredCount, verified: res.verifiedCount });
    } catch {
      toast.error("Failed to load teachers");
    } finally {
      setLoading(false);
    }
  }, [toast, search]);

  useEffect(() => {
    const timer = setTimeout(fetch, 300);
    return () => clearTimeout(timer);
  }, [fetch]);

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

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teachers by name"
          className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <span className="text-sm text-slate-600">
          Registered: <span className="font-semibold text-slate-900">{counts.registered}</span>
        </span>
        <span className="text-sm text-slate-600">
          Verified: <span className="font-semibold text-slate-900">{counts.verified}</span>
        </span>
      </div>

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

      <Modal
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setViewingDoc(null);
        }}
        title={viewingDoc ? "Document Viewer" : "Teacher Details"}
        wide={!!viewingDoc}
      >
        {selected && !viewingDoc && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.status} />
              <span className="text-xs text-slate-400">
                Registered {new Date(selected.createdAt).toLocaleDateString()}
              </span>
            </div>
            {[
              ["Name", selected.name || selected.user?.name],
              ["Email", selected.user?.email],
              ["Phone", selected.phone || selected.user?.phoneNumber || "Not provided"],
              ["Gender", selected.gender],
              ["Address", selected.address],
              ["Qualification", selected.academicQualification],
              ["Experience", selected.experience],
              ["About", selected.about],
            ].filter(([, value]) => value).map(([label, value]) => (
              <div key={label}>
                <span className="font-medium text-slate-400 text-xs uppercase tracking-wider">{label}</span>
                <p className="mt-0.5 text-slate-900">{value}</p>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-3 space-y-2">
              {selected.cv && (
                <button onClick={() => setViewingDoc(selected.cv!)} className="inline-flex items-center gap-1 text-blue-600 hover:underline mr-4">
                  <FileText size={14} /> View CV <ExternalLink size={12} />
                </button>
              )}
              {selected.identification?.map((url, index) => (
                <button key={url} onClick={() => setViewingDoc(url)} className="inline-flex items-center gap-1 text-blue-600 hover:underline mr-4">
                  <FileText size={14} /> View ID {index + 1} <ExternalLink size={12} />
                </button>
              ))}
            </div>
          </div>
        )}
        {selected && viewingDoc && (
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
              <button onClick={() => setViewingDoc(null)} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 text-sm">
                <ArrowLeft size={16} /> Back to profile
              </button>
              <a href={getImageUrl(viewingDoc)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                Open in new tab
              </a>
            </div>
            {viewingDoc.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) ? (
              <img src={getImageUrl(viewingDoc)} alt="Teacher document" className="max-w-full max-h-[70vh] mx-auto object-contain rounded-lg" />
            ) : (
              <iframe src={getImageUrl(viewingDoc)} title="Teacher document" className="w-full min-h-[70vh] rounded-lg border border-slate-200" />
            )}
          </div>
        )}
      </Modal>

      {loading ? (
        <Loading />
      ) : teachers.length === 0 ? (
        <EmptyState message="No teachers found" />
      ) : (
        <DataTable
          columns={[
            {
              key: "name",
              header: "Name",
              render: (t) => (
                <span className="font-medium text-slate-900">
                  {t.name || t.user?.name}
                </span>
              ),
            },
            {
              key: "email",
              header: "Email",
              render: (t) => (
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <Mail size={14} />
                  {t.user?.email || "—"}
                </span>
              ),
            },
            {
              key: "phone",
              header: "Phone",
              render: (t) => (
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <Phone size={14} />
                  {t.phone || t.user?.phoneNumber || "Not provided"}
                </span>
              ),
            },
            {
              key: "gender",
              header: "Gender",
              render: (t) => (
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <User size={14} />
                  {t.gender || "—"}
                </span>
              ),
            },
            {
              key: "address",
              header: "Address",
              render: (t) => (
                <span className="text-slate-500">{t.address || "—"}</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (t) => (
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck size={12} className="text-slate-400" />
                  <StatusBadge status={t.status} />
                </span>
              ),
            },
            {
              key: "registered",
              header: "Registered",
              render: (t) => (
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <Calendar size={14} />
                  {new Date(t.createdAt).toLocaleDateString()}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (t) => (
                <div className="flex justify-end gap-1.5">
                  <ActionButton icon={Eye} label="View" onClick={() => setSelected(t)} color="blue" />
                  <ActionButton
                    icon={Trash2}
                    label="Delete"
                    onClick={() => setDeleteTarget(t)}
                    disabled={processing === t._id}
                    color="red"
                  />
                </div>
              ),
            },
          ]}
          data={teachers}
        />
      )}
    </div>
  );
}
