"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, Loader2, X, Upload, User } from "lucide-react";
import { teamService, TeamMember } from "@/services/teamService";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { ActionButton, Loading, EmptyState, StatusBadge } from "@/components/admin/UI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

type FormData = {
  name: string;
  role: string;
  bio: string;
  photoUrl: string;
  order: string;
  isPublished: boolean;
  linkedin: string;
  facebook: string;
  instagram: string;
};
const emptyForm: FormData = {
  name: "", role: "", bio: "", photoUrl: "", order: "0", isPublished: true,
  linkedin: "", facebook: "", instagram: "",
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      const res = await teamService.getAll();
      setMembers(res.data);
    } catch {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, order: String(members.length) });
    setShowForm(true);
  };

  const openEdit = (member: TeamMember) => {
    setEditing(member);
    setForm({
      name: member.name,
      role: member.role,
      bio: member.bio || "",
      photoUrl: member.photoUrl || "",
      order: String(member.order),
      isPublished: member.isPublished,
      linkedin: member.socialLinks?.linkedin || "",
      facebook: member.socialLinks?.facebook || "",
      instagram: member.socialLinks?.instagram || "",
    });
    setShowForm(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await teamService.uploadPhoto(file);
      setForm((f) => ({ ...f, photoUrl: res.data.urls[0] }));
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.role.trim()) {
      toast.error("Name and role are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role.trim(),
        bio: form.bio.trim(),
        photoUrl: form.photoUrl,
        order: Number(form.order) || 0,
        isPublished: form.isPublished,
        socialLinks: {
          linkedin: form.linkedin.trim(),
          facebook: form.facebook.trim(),
          instagram: form.instagram.trim(),
        },
      };
      if (editing) {
        await teamService.update(editing._id, payload);
        toast.success("Team member updated");
      } else {
        await teamService.create(payload);
        toast.success("Team member added");
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditing(null);
      fetchData();
    } catch {
      toast.error(editing ? "Failed to update team member" : "Failed to add team member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await teamService.delete(deleteTarget._id);
      toast.success("Team member removed");
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("Failed to remove team member");
    } finally {
      setDeleting(false);
    }
  };

  const togglePublished = async (member: TeamMember) => {
    try {
      await teamService.update(member._id, { isPublished: !member.isPublished });
      fetchData();
    } catch {
      toast.error("Failed to update team member");
    }
  };

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle="Shown on the website's About page"
        action={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            <Plus size={16} /> Add Member
          </button>
        }
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => { if (!saving) setShowForm(false); }} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowForm(false)} disabled={saving} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-40">
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{editing ? "Edit Team Member" : "Add Team Member"}</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                  {form.photoUrl ? (
                    <Image src={form.photoUrl} alt="" width={64} height={64} className="object-cover w-full h-full" />
                  ) : (
                    <User size={24} className="text-slate-300" />
                  )}
                </div>
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="team-photo-input" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
                  >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploading ? "Uploading..." : "Upload Photo"}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={saving} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role <span className="text-red-500">*</span></label>
                  <input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Founder & CEO" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={saving} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={saving} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn</label>
                  <input type="text" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={saving} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Facebook</label>
                  <input type="text" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={saving} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Instagram</label>
                  <input type="text" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={saving} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
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
              <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.role.trim()} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-40 cursor-pointer inline-flex items-center justify-center gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Saving..." : editing ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Team Member"
        message={`Remove "${deleteTarget?.name}" from the team? This action cannot be undone.`}
        confirmLabel="Remove"
        confirmColor="red"
        loading={deleting}
      />

      {loading ? <Loading /> : members.length === 0 ? <EmptyState message="No team members added yet" /> : (
        <DataTable
          columns={[
            { key: "photo", header: "", render: (m) => (
              <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center">
                {m.photoUrl ? <Image src={m.photoUrl} alt={m.name} width={40} height={40} className="object-cover w-full h-full" /> : <User size={16} className="text-slate-300" />}
              </div>
            )},
            { key: "name", header: "Name", render: (m) => <span className="font-medium text-slate-900">{m.name}</span> },
            { key: "role", header: "Role", render: (m) => <span className="text-slate-600">{m.role}</span> },
            { key: "order", header: "Order", render: (m) => <span className="text-slate-400">{m.order}</span> },
            { key: "status", header: "Status", render: (m) => (
              <button onClick={() => togglePublished(m)} className="cursor-pointer">
                <StatusBadge status={m.isPublished ? "verified" : "unverified"} />
              </button>
            )},
            { key: "actions", header: "", render: (m) => (
              <div className="flex gap-1.5 justify-end">
                <ActionButton icon={Pencil} label="Edit" onClick={() => openEdit(m)} color="blue" />
                <ActionButton icon={Trash2} label="Delete" onClick={() => setDeleteTarget(m)} color="red" />
              </div>
            )},
          ]}
          data={members}
        />
      )}
    </div>
  );
}
