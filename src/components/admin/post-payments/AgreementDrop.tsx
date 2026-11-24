"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Upload, X } from "lucide-react";
import { shrinkImageForUpload } from "@/lib/compressImage";

const MAX_BYTES = 15 * 1024 * 1024;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const ALLOWED = /\.(pdf|jpe?g|png)$/i;

const sizeLabel = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Agreement file input: drop or pick a PDF/JPG/PNG. Large photos are shrunk
 * in the browser before upload (src/lib/compressImage.ts), so a 10MB phone
 * photo goes up as ~1MB.
 */
export function AgreementDrop({
  file,
  onChange,
  currentName,
  invalid,
  disabled,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  /** Name of the agreement already on record (edit mode). */
  currentName?: string | null;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [savedBytes, setSavedBytes] = useState(0);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = async (picked: File | undefined) => {
    setError(null);
    if (!picked) return;
    if (!ALLOWED.test(picked.name) && !/^(application\/pdf|image\/(jpeg|png))$/.test(picked.type)) {
      setError("Only PDF, JPG, JPEG or PNG files.");
      return;
    }
    setPreparing(true);
    const ready = await shrinkImageForUpload(picked);
    setPreparing(false);
    if (ready.size > MAX_BYTES) {
      setError(`That file is ${sizeLabel(ready.size)}. The limit is 15 MB.`);
      return;
    }
    setSavedBytes(Math.max(0, picked.size - ready.size));
    onChange(ready);
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white p-2.5">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-slate-200" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600">
            <FileText size={24} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
          <p className="text-xs text-slate-500">
            {sizeLabel(file.size)}
            {savedBytes > 0 && <span className="text-emerald-600"> · optimised, {sizeLabel(savedBytes)} smaller</span>}
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            aria-label="Remove file"
            onClick={() => {
              onChange(null);
              setSavedBytes(0);
            }}
            className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled || preparing}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void accept(e.dataTransfer.files?.[0]);
        }}
        className={`flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors disabled:cursor-wait ${
          dragging
            ? "border-blue-400 bg-blue-50"
            : invalid
              ? "border-red-300 bg-red-50/40 hover:bg-red-50"
              : "border-slate-300 bg-slate-50 hover:bg-slate-100"
        }`}
      >
        {preparing ? <Loader2 size={22} className="animate-spin text-blue-500" /> : <Upload size={22} className="text-slate-400" />}
        <span className="text-sm font-medium text-slate-700">
          {preparing ? "Preparing file…" : currentName ? "Drop a new file to replace the agreement" : "Drop the agreement here, or click to choose"}
        </span>
        <span className="text-xs text-slate-500">PDF, JPG, JPEG or PNG · up to 15 MB</span>
      </button>
      {currentName && (
        <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-500">
          <Paperclip size={12} /> On record: {currentName}
        </p>
      )}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          void accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
