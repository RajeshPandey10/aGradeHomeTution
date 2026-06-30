"use client";

import { useState, useCallback, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.5;

export function ImageLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (open) {
      setScale(1);
      setRotation(0);
    }
  }, [open, src]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP));
      if (e.key === "-") setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => {
      const next = s - e.deltaY * 0.002;
      return Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    });
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/80" />

      <div className="absolute top-4 right-4 flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP))}
          disabled={scale <= MIN_SCALE}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          onClick={() => setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP))}
          disabled={scale >= MAX_SCALE}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={() => setRotation((r) => r + 90)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          title="Rotate"
        >
          <RotateCw size={18} />
        </button>
        <a
          href={src}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          title="Download / open original"
        >
          <Download size={18} />
        </a>
        <button
          onClick={onClose}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          title="Close (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      <div
        className="relative max-w-[92vw] max-h-[88vh] overflow-hidden flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
      >
        <img
          src={src}
          alt={alt || "Preview"}
          className="max-w-[92vw] max-h-[88vh] object-contain select-none transition-transform duration-150 cursor-zoom-in"
          style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
          onClick={() => setScale((s) => (s >= MAX_SCALE ? MIN_SCALE : Math.min(MAX_SCALE, s + SCALE_STEP)))}
          draggable={false}
        />
      </div>

      <p className="absolute bottom-4 text-xs text-white/60">Scroll or click image to zoom · Esc to close</p>
    </div>
  );
}

export function useLightbox() {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const openLightbox = useCallback((src: string) => setLightboxSrc(src), []);
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);
  return { lightboxSrc, openLightbox, closeLightbox };
}
