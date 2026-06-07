"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/axios";
import { Mail, Phone, Calendar } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { PageHeader, DataTable } from "@/components/admin/DataTable";
import { Loading, EmptyState, StatusBadge } from "@/components/admin/UI";

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
  const toast = useToast();

  const fetch = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/parents");
      setParents(res.data.data || []);
    } catch {
      toast.error("Failed to load parents");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      <PageHeader title="Parents" subtitle="All registered parents" />

      {loading ? <Loading /> : parents.length === 0 ? <EmptyState message="No parents found" /> : (
        <DataTable
          columns={[
            { key: "name", header: "Name", render: (p) => <span className="font-medium text-slate-900">{p.name}</span> },
            { key: "email", header: "Email", render: (p) => (
              <span className="inline-flex items-center gap-1.5 text-slate-500"><Mail size={14} />{p.email}</span>
            )},
            { key: "phone", header: "Phone", render: (p) => (
              <span className="inline-flex items-center gap-1.5 text-slate-500"><Phone size={14} />{p.phoneNumber || "—"}</span>
            )},
            { key: "verified", header: "Verified", render: (p) => <StatusBadge status={p.isVerified ? "verified" : "pending"} /> },
            { key: "joined", header: "Joined", render: (p) => (
              <span className="inline-flex items-center gap-1.5 text-slate-500"><Calendar size={14} />{new Date(p.createdAt).toLocaleDateString()}</span>
            )},
          ]}
          data={parents}
        />
      )}
    </div>
  );
}
