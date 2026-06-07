"use client";

import { useEffect, useState, useCallback } from "react";
import { Save, FileSpreadsheet, Eye, Edit3 } from "lucide-react";
import { cmsService, CMSItem } from "@/services/cmsService";
import { useToast } from "@/hooks/useToast";
import { PageHeader } from "@/components/admin/DataTable";
import { ActionButtonSolid, Loading } from "@/components/admin/UI";

const cmsTypes = [
  { value: "faq", label: "FAQ" },
  { value: "privacy_policy", label: "Privacy Policy" },
  { value: "payment_policy", label: "Payment Policy" },
  { value: "terms_and_condition", label: "Terms & Conditions" },
  { value: "about", label: "About" },
];

export default function CMSPage() {
  const [selectedType, setSelectedType] = useState("faq");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const toast = useToast();

  const fetchCMS = useCallback(async (type: string) => {
    setLoading(true);
    try {
      const res = await cmsService.getAll();
      const items = res.data;
      const item = items.find((c: CMSItem) => c.type === type);
      setContent(item?.content || "");
    } catch {
      toast.error("Failed to load CMS content");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchCMS(selectedType); }, [selectedType, fetchCMS]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await cmsService.upsert(selectedType, content);
      toast.success("CMS updated successfully");
    } catch {
      toast.error("Failed to update CMS");
    } finally {
      setSaving(false);
    }
  }, [selectedType, content, toast]);

  return (
    <div>
      <PageHeader title="CMS Management" subtitle="Edit content pages (HTML supported)" />

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {cmsTypes.map((t) => (
            <button
              key={t.value}
              onClick={() => { setSelectedType(t.value); setPreview(false); }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                selectedType === t.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FileSpreadsheet size={15} />
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setPreview(!preview)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                preview ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {preview ? <Edit3 size={15} /> : <Eye size={15} />}
              {preview ? "Edit" : "Preview"}
            </button>
          </div>
        </div>

        {loading ? <Loading /> : preview ? (
          <div className="border border-slate-200 rounded-lg p-6 min-h-[300px] prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: content || "<p class='text-slate-400'>No content</p>" }} />
          </div>
        ) : (
          <>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              placeholder="Enter HTML content here..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y font-mono text-sm text-slate-900 bg-white"
            />
            <div className="mt-2 text-xs text-slate-400">
              HTML is supported. You can use tags like &lt;h1&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;strong&gt;, etc.
            </div>
            <div className="flex justify-end mt-4">
              <ActionButtonSolid
                icon={Save}
                label={saving ? "Saving..." : "Save Changes"}
                onClick={handleSave}
                disabled={saving}
                color="blue"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
