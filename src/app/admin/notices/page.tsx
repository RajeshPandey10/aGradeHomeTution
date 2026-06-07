"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useRealtimeRefresh } from "@/lib/socket";
import { noticeService, Notice } from "@/services/noticeService";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, EmptyState, Loading, ActionButtonSolid } from "@/components/admin/UI";
import { Modal } from "@/components/admin/Modal";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);
  const toast = useToast();

  const fetch = useCallback(async () => {
    try {
      const res = await noticeService.getAll();
      setNotices(res.data);
    } catch {
      toast.error("Failed to load notices");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);
  useRealtimeRefresh(fetch, ["parent-request:updated"]);

  const openAdd = useCallback(() => {
    setEditId(null);
    setTitle("");
    setSubtitle("");
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((n: Notice) => {
    setEditId(n._id);
    setTitle(n.title);
    setSubtitle(n.subtitle || "");
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await noticeService.update(editId, { title, subtitle });
        toast.success("Notice updated successfully");
      } else {
        await noticeService.create({ title, subtitle });
        toast.success("Notice created successfully");
      }
      setModalOpen(false);
      fetch();
    } catch {
      toast.error(editId ? "Failed to update notice" : "Failed to create notice");
    } finally {
      setSaving(false);
    }
  }, [title, subtitle, editId, fetch, toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await noticeService.delete(deleteTarget._id);
      toast.success("Notice deleted successfully");
      setDeleteTarget(null);
      fetch();
    } catch {
      toast.error("Failed to delete notice");
    }
  }, [deleteTarget, fetch, toast]);

  return (
    <div>
      <PageHeader title="Notices" subtitle="Manage platform notices" action={
        <ActionButtonSolid icon={Plus} label="Add Notice" onClick={openAdd} />
      } />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? "Edit Notice" : "Add Notice"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
          />
          <textarea
            placeholder="Subtitle (optional)"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-900 bg-white"
          />
          <div className="flex gap-3 justify-end pt-2">
            <ActionButton icon={X} label="Cancel" onClick={() => setModalOpen(false)} color="slate" />
            <ActionButtonSolid
              icon={editId ? Pencil : Plus}
              label={saving ? "Saving..." : editId ? "Update" : "Create"}
              onClick={handleSubmit as any}
              disabled={saving}
              color="blue"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Notice"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
      />

      {loading ? <Loading /> : notices.length === 0 ? <EmptyState message="No notices found" /> : (
        <DataTable
          columns={[
            { key: "title", header: "Title", render: (n) => <span className="font-medium text-slate-900">{n.title}</span> },
            { key: "subtitle", header: "Subtitle", render: (n) => <span className="text-slate-500">{n.subtitle || "—"}</span> },
            { key: "actions", header: "", render: (n) => (
              <div className="flex gap-1.5 justify-end">
                <ActionButton icon={Pencil} label="Edit" onClick={() => openEdit(n)} color="blue" />
                <ActionButton icon={Trash2} label="Delete" onClick={() => setDeleteTarget(n)} color="red" />
              </div>
            )},
          ]}
          data={notices}
        />
      )}
    </div>
  );
}
