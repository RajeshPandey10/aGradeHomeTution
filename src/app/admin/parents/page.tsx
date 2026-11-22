"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/axios";
import { Mail, Phone, Calendar } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { Loading, EmptyState, StatusBadge } from "@/components/admin/UI";
import { SearchInput } from "@/components/admin/SearchInput";
import { matchesSearch } from "@/lib/search";
import { getErrorMessage } from "@/lib/errors";

interface Parent {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  isVerified: boolean;
  createdAt: string;
}

export default function ParentsPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const toast = useToast();

  const fetch = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/parents");
      setParents(res.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load parents"));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = parents.filter((p) => matchesSearch(search, [p.name, p.email, p.phoneNumber]));

  return (
    <div>
      <PageHeader title="Parents" subtitle="All registered parents" />
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search name, email, phone…"
        shown={filtered.length}
        total={parents.length}
      />

      {loading ? <Loading /> : filtered.length === 0 ? (
        <EmptyState message={search.trim() ? `No parents match "${search.trim()}"` : "No parents found"} />
      ) : (
        <DataTable
          columns={[
            { key: "name", header: "Name", render: (p) => <span className="font-medium text-slate-900">{p.name}</span> },
            { key: "email", header: "Email", render: (p) => (
              <span className="inline-flex items-center gap-1.5 text-slate-500"><Mail size={14} />{p.email}</span>
            )},
            { key: "phone", header: "Phone", render: (p) => (
              <span className="inline-flex items-center gap-1.5 text-slate-500"><Phone size={14} />{p.phoneNumber || "—"}</span>
            )},
            { key: "verified", header: "Verified", render: (p) => <StatusBadge status={p.isVerified ? "verified" : "pending"} label={p.isVerified ? "Verified" : "Not verified"} /> },
            { key: "joined", header: "Joined", render: (p) => (
              <span className="inline-flex items-center gap-1.5 text-slate-500"><Calendar size={14} />{new Date(p.createdAt).toLocaleDateString()}</span>
            )},
          ]}
          data={filtered}
        />
      )}
    </div>
  );
}
