"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { couponService, Coupon } from "@/services/couponService";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, Loading, EmptyState, StatusBadge } from "@/components/admin/UI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

type FormData = {
  code: string;
  couponType: "percentage" | "flat";
  couponValue: string;
  maxUses: string;
  expiresAt: string;
};

const emptyForm: FormData = { code: "", couponType: "percentage", couponValue: "", maxUses: "", expiresAt: "" };

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const res = await couponService.getAll();
      setCoupons(res.data);
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      couponType: coupon.couponType,
      couponValue: String(coupon.couponValue),
      maxUses: coupon.maxUses !== null ? String(coupon.maxUses) : "",
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.couponValue) {
      toast.error("Code and value are required");
      return;
    }
    const value = Number(form.couponValue);
    if (form.couponType === "percentage" && value > 100) {
      toast.error("Percentage cannot exceed 100");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await couponService.update(editing._id, {
          couponType: form.couponType,
          couponValue: value,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
        });
        toast.success("Coupon updated");
      } else {
        await couponService.create({
          code: form.code.trim(),
          couponType: form.couponType,
          couponValue: value,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
        });
        toast.success("Coupon created");
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditing(null);
      fetchData();
    } catch {
      toast.error(editing ? "Failed to update coupon" : "Failed to create coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await couponService.delete(deleteTarget._id);
      toast.success("Coupon deleted");
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("Failed to delete coupon");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    setToggling(coupon._id);
    try {
      await couponService.update(coupon._id, { isActive: !coupon.isActive });
      toast.success(coupon.isActive ? "Coupon deactivated" : "Coupon activated");
      fetchData();
    } catch {
      toast.error("Failed to update coupon");
    } finally {
      setToggling(null);
    }
  };

  return (
    <div>
      <PageHeader title="Coupons" subtitle="Manage discount coupons for teachers" />

      <div className="mb-5">
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { if (!saving) setShowForm(false); }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowForm(false)} disabled={saving} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-40">
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{editing ? "Edit Coupon" : "Create Coupon"}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. WELCOME10"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  disabled={saving || !!editing}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type <span className="text-red-500">*</span></label>
                  <select
                    value={form.couponType}
                    onChange={(e) => setForm({ ...form, couponType: e.target.value as "percentage" | "flat" })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={saving}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (Rs.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Value <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={form.couponValue}
                    onChange={(e) => setForm({ ...form, couponValue: e.target.value })}
                    placeholder={form.couponType === "percentage" ? "e.g. 10" : "e.g. 500"}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={saving}
                    min={0}
                    max={form.couponType === "percentage" ? 100 : undefined}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Uses <span className="text-slate-400">(optional)</span></label>
                  <input
                    type="number"
                    value={form.maxUses}
                    onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={saving}
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expires At <span className="text-slate-400">(optional)</span></label>
                  <input
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={saving}
                  />
                </div>
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
                disabled={saving || !form.code.trim() || !form.couponValue}
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
        title="Delete Coupon"
        message={`Are you sure you want to delete coupon "${deleteTarget?.code}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
        loading={deleting}
      />

      {loading ? <Loading /> : coupons.length === 0 ? <EmptyState message="No coupons created yet" /> : (
        <DataTable
          columns={[
            { key: "code", header: "Code", render: (c) => <span className="font-mono font-semibold text-slate-900">{c.code}</span> },
            { key: "type", header: "Type", render: (c) => (
              <span className="text-slate-600">{c.couponType === "percentage" ? `${c.couponValue}%` : `Rs. ${c.couponValue}`}</span>
            )},
            { key: "usage", header: "Usage", render: (c) => (
              <span className="text-slate-500">{c.usedCount}{c.maxUses !== null ? ` / ${c.maxUses}` : " / ∞"}</span>
            )},
            { key: "expires", header: "Expires", render: (c) => (
              <span className="text-slate-500">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}</span>
            )},
            { key: "status", header: "Status", render: (c) => (
              <button
                onClick={() => handleToggle(c)}
                disabled={toggling === c._id}
                className="cursor-pointer"
              >
                <StatusBadge status={c.isActive ? "verified" : "rejected"} />
              </button>
            )},
            { key: "actions", header: "", render: (c) => (
              <div className="flex gap-1.5 justify-end">
                <ActionButton icon={Pencil} label="Edit" onClick={() => openEdit(c)} color="blue" />
                <ActionButton icon={Trash2} label="Delete" onClick={() => setDeleteTarget(c)} color="red" />
              </div>
            )},
          ]}
          data={coupons}
        />
      )}
    </div>
  );
}
