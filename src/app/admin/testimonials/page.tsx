"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, X, Star } from "lucide-react";
import { testimonialService, Testimonial } from "@/services/testimonialService";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, Loading, EmptyState, StatusBadge } from "@/components/admin/UI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

type FormData = { name: string; role: string; quote: string; rating: string; order: string; isPublished: boolean };
const emptyForm: FormData = { name: "", role: "", quote: "", rating: "5", order: "0", isPublished: true };

export default function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Testimonial | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const res = await testimonialService.getAll();
      setItems(res.data);
    } catch {
      toast.error("Failed to load testimonials");
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

  const openEdit = (item: Testimonial) => {
    setEditing(item);
    setForm({
      name: item.name,
      role: item.role || "",
      quote: item.quote,
      rating: item.rating ? String(item.rating) : "5",
      order: String(item.order),
      isPublished: item.isPublished,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.quote.trim()) {
      toast.error("Name and quote are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role.trim(),
        quote: form.quote.trim(),
        rating: Number(form.rating) || undefined,
        order: Number(form.order) || 0,
        isPublished: form.isPublished,
      };
      if (editing) {
        await testimonialService.update(editing._id, payload);
        toast.success("Testimonial updated");
      } else {
        await testimonialService.create(payload);
        toast.success("Testimonial created");
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditing(null);
      fetchData();
    } catch {
      toast.error(editing ? "Failed to update testimonial" : "Failed to create testimonial");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await testimonialService.delete(deleteTarget._id);
      toast.success("Testimonial deleted");
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("Failed to delete testimonial");
    } finally {
      setDeleting(false);
    }
  };

  const togglePublished = async (item: Testimonial) => {
    try {
      await testimonialService.update(item._id, { isPublished: !item.isPublished });
      fetchData();
    } catch {
      toast.error("Failed to update testimonial");
    }
  };

  return (
    <div>
      <PageHeader
        title="Testimonials"
        subtitle="Reviews shown on the website's homepage and Find-a-Tutor page"
        action={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Plus size={16} /> Add Testimonial
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
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{editing ? "Edit Testimonial" : "Add Testimonial"}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Parent, Lalitpur" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={saving} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role <span className="text-slate-400">(optional)</span></label>
                  <input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Parent of a Grade 8 student" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={saving} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quote <span className="text-red-500">*</span></label>
                <textarea value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={saving} />
              </div>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rating (1-5)</label>
                  <input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={saving} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Order</label>
                  <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={saving} />
                </div>
                <label className="flex items-center gap-2 pb-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} disabled={saving} className="h-4 w-4 rounded border-slate-300" />
                  <span className="text-sm text-slate-700">Published</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowForm(false); setForm(emptyForm); setEditing(null); }} disabled={saving} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.quote.trim()} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-40 cursor-pointer inline-flex items-center justify-center gap-2">
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
        title="Delete Testimonial"
        message={`Delete this testimonial from "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
        loading={deleting}
      />

      {loading ? <Loading /> : items.length === 0 ? <EmptyState message="No testimonials yet" /> : (
        <DataTable
          columns={[
            { key: "name", header: "Name", render: (t) => (
              <div>
                <p className="font-medium text-slate-900">{t.name}</p>
                {t.role && <p className="text-xs text-slate-500">{t.role}</p>}
              </div>
            )},
            { key: "quote", header: "Quote", render: (t) => <span className="text-slate-500 line-clamp-1 max-w-sm block">{t.quote}</span> },
            { key: "rating", header: "Rating", render: (t) => (
              t.rating ? (
                <span className="inline-flex items-center gap-1 text-amber-500">
                  <Star size={13} fill="currentColor" /> {t.rating}
                </span>
              ) : <span className="text-slate-300">—</span>
            )},
            { key: "status", header: "Status", render: (t) => (
              <button onClick={() => togglePublished(t)} className="cursor-pointer">
                <StatusBadge status={t.isPublished ? "verified" : "unverified"} />
              </button>
            )},
            { key: "actions", header: "", render: (t) => (
              <div className="flex gap-1.5 justify-end">
                <ActionButton icon={Pencil} label="Edit" onClick={() => openEdit(t)} color="blue" />
                <ActionButton icon={Trash2} label="Delete" onClick={() => setDeleteTarget(t)} color="red" />
              </div>
            )},
          ]}
          data={items}
        />
      )}
    </div>
  );
}
