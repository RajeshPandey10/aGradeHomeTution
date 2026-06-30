"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Pencil, Trash2, X, ImageIcon, Upload, Loader2, Eye, Edit3, Megaphone } from "lucide-react";
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
  const [description, setDescription] = useState("");
  const [showAsPopup, setShowAsPopup] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [descPreview, setDescPreview] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    setDescription("");
    setShowAsPopup(false);
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages([]);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((n: Notice) => {
    setEditId(n._id);
    setTitle(n.title);
    setSubtitle(n.subtitle || "");
    setDescription(n.description || "");
    setShowAsPopup(n.showAsPopup || false);
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImages(n.images || []);
    setModalOpen(true);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setImageFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const removeNewImage = useCallback((index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeExistingImage = useCallback((url: string) => {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let allImages = [...existingImages];

      if (imageFiles.length > 0) {
        setUploading(true);
        const uploadRes = await noticeService.uploadImages(imageFiles);
        allImages = [...allImages, ...uploadRes.data.urls];
        setUploading(false);
      }

      if (editId) {
        await noticeService.update(editId, { title, subtitle, description, images: allImages, showAsPopup });
        toast.success("Notice updated successfully");
      } else {
        await noticeService.create({ title, subtitle, description, images: allImages, showAsPopup });
        toast.success("Notice created successfully");
      }
      setModalOpen(false);
      fetch();
    } catch {
      setUploading(false);
      toast.error(editId ? "Failed to update notice" : "Failed to create notice");
    } finally {
      setSaving(false);
    }
  }, [title, subtitle, description, showAsPopup, existingImages, imageFiles, editId, fetch, toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await noticeService.delete(deleteTarget._id);
      toast.success("Notice deleted successfully");
      setDeleteTarget(null);
      fetch();
    } catch {
      toast.error("Failed to delete notice");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, fetch, toast]);

  const isUploading = saving && uploading;

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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description (HTML supported)</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setDescPreview(false)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5 ${!descPreview ? "bg-blue-100 text-blue-700 font-medium" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                <Edit3 size={14} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setDescPreview(true)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5 ${descPreview ? "bg-blue-100 text-blue-700 font-medium" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                <Eye size={14} />
                Preview
              </button>
            </div>
            {descPreview ? (
              <div
                className="w-full min-h-[120px] px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900 text-sm leading-relaxed [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_li]:mb-1 [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            ) : (
              <textarea
                placeholder="Write HTML content here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-900 bg-white font-mono text-sm"
              />
            )}
          </div>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={showAsPopup}
              onChange={(e) => setShowAsPopup(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <Megaphone size={16} className="text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-900">Show as Popup</p>
                <p className="text-xs text-slate-500">When enabled, this notice appears as a popup when the app starts.</p>
              </div>
            </div>
          </label>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Images</label>
            <div className="flex flex-wrap gap-3">
              {existingImages.map((url) => (
                <div key={url} className="relative group">
                  <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(url)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {imagePreviews.map((preview, i) => (
                <div key={preview} className="relative group">
                  <img src={preview} alt="" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                  <button
                    type="button"
                    onClick={() => removeNewImage(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-slate-400 hover:text-blue-500"
              >
                <Upload size={18} />
                <span className="text-[10px] mt-1">Upload</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <ActionButton icon={X} label="Cancel" onClick={() => setModalOpen(false)} color="slate" />
            <ActionButtonSolid
              icon={isUploading ? Loader2 : editId ? Pencil : Plus}
              label={isUploading ? "Uploading..." : saving ? "Saving..." : editId ? "Update" : "Create"}
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
        loading={deleting}
      />

      {loading ? <Loading /> : notices.length === 0 ? <EmptyState message="No notices found" /> : (
        <DataTable
          columns={[
            { key: "title", header: "Title", render: (n) => (
              <div className="flex items-center gap-3">
                {n.images && n.images.length > 0 && (
                  <img src={n.images[0]} alt="" className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                )}
                <span className="font-medium text-slate-900">{n.title}</span>
              </div>
            )},
            { key: "subtitle", header: "Subtitle", render: (n) => (
              <span className="text-slate-500 line-clamp-2">{n.subtitle || "—"}</span>
            )},
            { key: "description", header: "Description", render: (n) => (
              <div className="text-slate-500 line-clamp-2 text-sm [&_p]:inline [&_p]:mr-1" dangerouslySetInnerHTML={{ __html: n.description || "—" }} />
            )},
            { key: "images", header: "Images", render: (n) => (
              <div className="flex gap-1">
                {(n.images || []).length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <ImageIcon size={14} />
                    {n.images!.length}
                  </span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </div>
            )},
            { key: "showAsPopup", header: "Popup", render: (n) => (
              n.showAsPopup ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <Megaphone size={11} /> On
                </span>
              ) : (
                <span className="text-slate-300 text-xs">Off</span>
              )
            )},
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
