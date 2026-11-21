"use client";

import { useEffect, useState, useCallback } from "react";
import { Mail, Phone, Calendar, ShieldCheck, User, Trash2, FileText, Eye, ExternalLink, ArrowLeft } from "lucide-react";
import { getImageUrl } from "@/lib/image";
import { teacherService, TeacherAccount, TeacherProfile } from "@/services/teacherService";
import { SearchInput } from "@/components/admin/SearchInput";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import {
  ActionButton,
  Loading,
  EmptyState,
  StatusBadge,
  TeacherAvatar,
} from "@/components/admin/UI";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Modal } from "@/components/admin/Modal";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TeacherProfile | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"profiles" | "no-profile">("profiles");

  // "?view=no-profile" (the dashboard's "Teachers signed up" card) opens that
  // tab. Read after mount: during in-app navigation the URL updates only then.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "no-profile") {
      setView("no-profile");
    }
  }, []);
  const [noProfile, setNoProfile] = useState<TeacherAccount[]>([]);
  const [counts, setCounts] = useState({ registered: 0, verified: 0, accounts: 0, withoutProfile: 0 });
  const [selected, setSelected] = useState<TeacherProfile | null>(null);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const toast = useToast();

  const fetch = useCallback(async () => {
    const term = search.trim() || undefined;
    try {
      // Counts always come from the profiles call, so both tabs show them.
      const [res, withoutProfile] = await Promise.all([
        teacherService.getAll(view === "profiles" ? term : undefined),
        view === "no-profile" ? teacherService.getWithoutProfile(term) : null,
      ]);
      if (view === "profiles") setTeachers(res.data);
      if (withoutProfile) setNoProfile(withoutProfile.data || []);
      setCounts({
        registered: res.registeredCount,
        verified: res.verifiedCount,
        accounts: res.accountCount,
        withoutProfile: res.withoutProfileCount,
      });
    } catch {
      toast.error("Failed to load teachers");
    } finally {
      setLoading(false);
    }
  }, [toast, search, view]);

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

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
        <span>
          Signed up: <span className="font-semibold text-slate-900">{counts.accounts}</span>
        </span>
        <span>
          With profile: <span className="font-semibold text-slate-900">{counts.registered}</span>
        </span>
        <span>
          Verified: <span className="font-semibold text-slate-900">{counts.verified}</span>
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {[
          { value: "profiles" as const, label: `With profile (${counts.registered})` },
          { value: "no-profile" as const, label: `Signed up, no profile (${counts.withoutProfile})` },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setView(tab.value);
              setLoading(true);
            }}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              view === tab.value
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={
          view === "profiles"
            ? "Search name, email, phone, address, qualification…"
            : "Search name, email, phone…"
        }
        shown={view === "profiles" ? teachers.length : noProfile.length}
      />

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
            <div className="flex items-center gap-3">
              <TeacherAvatar
                name={selected.name || selected.user?.name}
                src={selected.profilePicture ? getImageUrl(selected.profilePicture) : null}
                size={64}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <span className="text-xs text-slate-400">
                    Registered {new Date(selected.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                  Online teaching:{" "}
                  <StatusBadge status={selected.onlineTeaching?.status || "not_submitted"} />
                </p>
              </div>
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
      ) : view === "no-profile" ? (
        noProfile.length === 0 ? (
          <EmptyState
            message={
              search.trim()
                ? `No teachers without a profile match "${search.trim()}"`
                : "Every teacher who signed up has submitted a profile"
            }
          />
        ) : (
          <DataTable
            columns={[
              {
                key: "name",
                header: "Name",
                render: (t) => <span className="font-medium text-slate-900">{t.name}</span>,
              },
              {
                key: "email",
                header: "Email",
                render: (t) => (
                  <a href={`mailto:${t.email}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600">
                    <Mail size={14} />
                    {t.email}
                  </a>
                ),
              },
              {
                key: "phone",
                header: "Phone",
                render: (t) =>
                  t.phoneNumber ? (
                    <a href={`tel:${t.phoneNumber}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600">
                      <Phone size={14} />
                      {t.phoneNumber}
                    </a>
                  ) : (
                    <span className="text-slate-400">Not provided</span>
                  ),
              },
              {
                key: "verified",
                header: "Email verified",
                render: (t) => <StatusBadge status={t.isVerified ? "verified" : "unverified"} />,
              },
              {
                key: "signedUp",
                header: "Signed up",
                render: (t) => (
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Calendar size={14} />
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                ),
              },
            ]}
            data={noProfile}
          />
        )
      ) : teachers.length === 0 ? (
        <EmptyState
          message={search.trim() ? `No teachers match "${search.trim()}"` : "No teachers found"}
        />
      ) : (
        <DataTable
          columns={[
            {
              key: "name",
              header: "Name",
              render: (t) => (
                <span className="inline-flex items-center gap-2.5">
                  <TeacherAvatar
                    name={t.name || t.user?.name}
                    src={t.profilePicture ? getImageUrl(t.profilePicture) : null}
                    size={32}
                  />
                  <span className="font-medium text-slate-900">
                    {t.name || t.user?.name}
                  </span>
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
