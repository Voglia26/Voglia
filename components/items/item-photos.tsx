"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "h-10 w-10", icon: "h-4 w-4" },
  md: { box: "h-20 w-20", icon: "h-6 w-6" },
  lg: { box: "h-32 w-32 sm:h-36 sm:w-36", icon: "h-8 w-8" },
} as const;

export function ItemPhotos({
  urls,
  size = "md",
  className,
  limit,
  faded,
  zoomable,
}: {
  urls: string[];
  size?: keyof typeof SIZES;
  className?: string;
  limit?: number;
  faded?: boolean;
  zoomable?: boolean;
}) {
  const { box, icon } = SIZES[size];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Zoomable: one main thumbnail; full set opens in lightbox carousel
  const thumbUrls = zoomable
    ? urls.slice(0, 1)
    : limit
      ? urls.slice(0, limit)
      : urls;

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goPrev = useCallback(() => {
    setLightboxIndex((i) =>
      i === null ? null : (i - 1 + urls.length) % urls.length
    );
  }, [urls.length]);

  const goNext = useCallback(() => {
    setLightboxIndex((i) =>
      i === null ? null : (i + 1) % urls.length
    );
  }, [urls.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxIndex, closeLightbox, goPrev, goNext]);

  function openLightbox(index: number) {
    if (!zoomable) return;
    setLightboxIndex(index);
  }

  const thumbClass = cn(
    box,
    "object-cover rounded-md shrink-0",
    faded && "opacity-40 grayscale",
    zoomable &&
      "cursor-zoom-in hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    className
  );

  if (thumbUrls.length === 0) {
    return (
      <div
        className={cn(
          box,
          "bg-muted rounded-md flex items-center justify-center shrink-0",
          className
        )}
      >
        <ImageIcon className={cn(icon, "text-muted-foreground")} />
      </div>
    );
  }

  const thumbs =
    thumbUrls.length === 1 ? (
      <button
        type="button"
        onClick={() => openLightbox(0)}
        disabled={!zoomable}
        className={cn("relative block", !zoomable && "cursor-default")}
        aria-label={
          zoomable
            ? urls.length > 1
              ? `View all ${urls.length} photos`
              : "View photo"
            : undefined
        }
      >
        <Image
          src={thumbUrls[0]}
          alt=""
          width={160}
          height={160}
          className={thumbClass}
          unoptimized
        />
        {zoomable && urls.length > 1 && (
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums">
            1 / {urls.length}
          </span>
        )}
      </button>
    ) : (
      <div className={cn("flex flex-wrap gap-1.5 shrink-0", className)}>
        {thumbUrls.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => openLightbox(i)}
            disabled={!zoomable}
            className={cn("block", !zoomable && "cursor-default")}
            aria-label={zoomable ? `View photo ${i + 1}` : undefined}
          >
            <Image
              src={url}
              alt=""
              width={160}
              height={160}
              className={cn(
                box,
                "object-cover rounded-md",
                faded && "opacity-40 grayscale",
                zoomable &&
                  "cursor-zoom-in hover:opacity-90 transition-opacity"
              )}
              unoptimized
            />
          </button>
        ))}
      </div>
    );

  return (
    <>
      {thumbs}

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {urls.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/70 tabular-nums">
                {lightboxIndex + 1} / {urls.length}
              </p>
            </>
          )}

          <Image
            src={urls[lightboxIndex]}
            alt=""
            width={1200}
            height={1200}
            className="max-h-[90vh] max-w-[90vw] w-auto h-auto object-contain"
            unoptimized
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
