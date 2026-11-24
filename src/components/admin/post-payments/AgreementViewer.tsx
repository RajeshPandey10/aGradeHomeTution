"use client";

import { Download, ExternalLink } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import PdfViewer from "@/components/admin/pdf-viewer";
import { getImageUrl } from "@/lib/image";
import type { PostPaymentAgreement } from "@/services/postPaymentService";
import { isPdf } from "./bits";

/** The signed agreement of a post payment: PDF in the viewer, images inline. */
export function AgreementViewer({
  agreement,
  title,
  onClose,
}: {
  agreement: PostPaymentAgreement | null;
  title?: string;
  onClose: () => void;
}) {
  const url = agreement ? getImageUrl(agreement.url) : "";
  return (
    <Modal open={!!agreement} onClose={onClose} title={title || "Agreement"} wide>
      {agreement && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="truncate text-slate-500" title={agreement.originalName || undefined}>
              {agreement.originalName || "Agreement"}
              {agreement.size ? ` · ${(agreement.size / 1024 / 1024).toFixed(2)} MB` : ""}
            </span>
            <div className="flex gap-3">
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                <ExternalLink size={14} /> Open in new tab
              </a>
              <a href={url} download className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                <Download size={14} /> Download
              </a>
            </div>
          </div>
          {isPdf(agreement) ? (
            <PdfViewer url={agreement.url} />
          ) : (
            <div className="flex min-h-80 items-center justify-center rounded-lg bg-slate-100 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Agreement" className="max-h-[70vh] max-w-full rounded-lg object-contain shadow" />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
