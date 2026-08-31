"use client";

import { useEffect, useState, useCallback } from "react";
import { GraduationCap, Users, MapPin, Star, Save } from "lucide-react";
import { siteStatsService, SiteStats } from "@/services/siteStatsService";
import { useToast } from "@/hooks/useToast";
import { PageHeader } from "@/components/admin/DataTable";
import { ActionButtonSolid, Loading } from "@/components/admin/UI";

type FormData = {
  verifiedTutors: string;
  studentsMatched: string;
  districtsCovered: string;
};

const emptyForm: FormData = { verifiedTutors: "0", studentsMatched: "0", districtsCovered: "0" };

const fields: {
  key: keyof FormData;
  label: string;
  hint: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { key: "verifiedTutors", label: "Verified Tutors", hint: "Shown as \"50+ Verified Tutors\" on the homepage", icon: GraduationCap },
  { key: "studentsMatched", label: "Students Matched", hint: "Shown as \"100+ Students Matched\" on the homepage", icon: Users },
  { key: "districtsCovered", label: "Districts Covered", hint: "Shown as \"3 Districts Covered\" on the homepage", icon: MapPin },
];

export default function SiteStatsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const toast = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await siteStatsService.get();
      const s: SiteStats = res.data;
      setForm({
        verifiedTutors: String(s.verifiedTutors),
        studentsMatched: String(s.studentsMatched),
        districtsCovered: String(s.districtsCovered),
      });
    } catch {
      toast.error("Failed to load homepage stats");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    const values = {
      verifiedTutors: Number(form.verifiedTutors),
      studentsMatched: Number(form.studentsMatched),
      districtsCovered: Number(form.districtsCovered),
    };
    if (Object.values(values).some((v) => Number.isNaN(v) || v < 0)) {
      toast.error("Stats must be non-negative numbers");
      return;
    }
    setSaving(true);
    try {
      await siteStatsService.update(values);
      toast.success("Homepage stats updated");
      fetchData();
    } catch {
      toast.error("Failed to update homepage stats");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Homepage Stats"
        subtitle="The trust numbers shown near the top of the website — updates appear on the site without a redeploy"
      />

      {loading ? (
        <Loading />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-xl">
          <div className="space-y-5">
            {fields.map(({ key, label, hint, icon: Icon }) => (
              <div key={key}>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
                  <Icon size={15} className="text-slate-400" />
                  {label}
                </label>
                <input
                  type="number"
                  min={0}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  disabled={saving}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-slate-400">{hint}</p>
              </div>
            ))}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex items-start gap-2">
              <Star size={15} className="text-slate-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-500">
                &quot;Average Rating&quot; isn&apos;t set here — the website computes it
                automatically from published testimonials&apos; star ratings, so it&apos;s
                always accurate.
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <ActionButtonSolid icon={Save} label={saving ? "Saving..." : "Save Changes"} onClick={handleSave} disabled={saving} color="emerald" />
          </div>
        </div>
      )}
    </div>
  );
}
