"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { faqService, FaqItem } from "@/services/faqService";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, Loading, EmptyState, StatusBadge } from "@/components/admin/UI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

type FormData = { question: string; answer: string; order: string; isPublished: boolean };
const emptyForm: FormData = { question: "", answer: "", order: "0", isPublished: true };

export default function FaqItemsPage() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const res = await faqService.getAll();
      setItems(res.data);
    } catch {
      toast.error("Failed to load FAQ items");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, order: String(items.length) });
    setShowForm(true);
  };

  const openEdit = (item: FaqItem) => {
    setEditing(item);
    setForm({ question: item.question, answer: item.answer, order: String(item.order), isPublished: item.isPublished });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        order: Number(form.order) || 0,
        isPublished: form.isPublished,
      };
      if (editing) {
        await faqService.update(editing._id, payload);
        toast.success("FAQ item updated");
      } else {
        await faqService.create(payload);
        toast.success("FAQ item created");
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditing(null);
      fetchData();
    } catch {
      toast.error(editing ? "Failed to update FAQ item" : "Failed to create FAQ item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await faqService.delete(deleteTarget._id);
      toast.success("FAQ item deleted");
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("Failed to delete FAQ item");
    } finally {
      setDeleting(false);
    }
  };

  const togglePublished = async (item: FaqItem) => {
    try {
      await faqService.update(item._id, { isPublished: !item.isPublished });
      fetchData();
    } catch {
      toast.error("Failed to update FAQ item");
    }
  };

  return (
    <div>
      <PageHeader
        title="FAQ Items"
        subtitle="Shown on the website's FAQ section, ordered as listed"
        action={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Plus size={16} /> Add FAQ
          </button>
        }
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { if (!saving) setShowForm(false); }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowForm(false)} disabled={saving} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-40">
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{editing ? "Edit FAQ Item" : "Add FAQ Item"}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Question <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.question}
                  onChange={(e) => setForm({ ...form, question: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Answer <span className="text-red-500">*</span></label>
                <textarea
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Order</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={saving}
                  />
                </div>
                <label className="flex items-center gap-2 pb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                    disabled={saving}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Published</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowForm(false); setForm(emptyForm); setEditing(null); }}
                disabled={saving}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.question.trim() || !form.answer.trim()}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-40 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete FAQ Item"
        message={`Delete "${deleteTarget?.question}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
        loading={deleting}
      />

      {loading ? <Loading /> : items.length === 0 ? <EmptyState message="No FAQ items yet" /> : (
        <DataTable
          columns={[
            { key: "order", header: "#", render: (i) => <span className="text-slate-400">{i.order}</span> },
            { key: "question", header: "Question", render: (i) => <span className="font-medium text-slate-900">{i.question}</span> },
            { key: "answer", header: "Answer", render: (i) => <span className="text-slate-500 line-clamp-1 max-w-sm block">{i.answer}</span> },
            { key: "status", header: "Status", render: (i) => (
              <button onClick={() => togglePublished(i)} className="cursor-pointer">
                <StatusBadge status={i.isPublished ? "verified" : "unverified"} />
              </button>
            )},
            { key: "actions", header: "", render: (i) => (
              <div className="flex gap-1.5 justify-end">
                <ActionButton icon={Pencil} label="Edit" onClick={() => openEdit(i)} color="blue" />
                <ActionButton icon={Trash2} label="Delete" onClick={() => setDeleteTarget(i)} color="red" />
              </div>
            )},
          ]}
          data={items}
        />
      )}
    </div>
  );
}
