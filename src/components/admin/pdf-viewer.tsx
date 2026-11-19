"use client";

import { getImageUrl } from "@/lib/image";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const PdfViewer = ({ url }: { url: string }) => {
  const resolvedUrl = getImageUrl(url);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setBlobUrl(null);
    setFailed(false);

    fetch(resolvedUrl, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(
          new Blob([blob], { type: "application/pdf" }),
        );
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resolvedUrl]);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-4 bg-slate-50 rounded-lg border border-slate-200 p-6 text-center">
        <FileText size={40} className="text-slate-400" />
        <p className="text-slate-600 text-sm">
          Could not preview this PDF in the browser.
        </p>
        <a
          href={resolvedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          <ExternalLink size={16} /> Open / Download PDF
        </a>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <iframe
      src={blobUrl}
      className="w-full rounded-lg border border-slate-200"
      style={{ minHeight: "75vh" }}
      title="PDF viewer"
    />
  );
};

export default PdfViewer;
