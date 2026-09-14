"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { uploadCustomerOrderPhoto } from "@/app/seller/actions";

export function CustomerOrderPhotoField({
  name = "photo_url",
  defaultUrl,
  disabled,
}: {
  name?: string;
  defaultUrl?: string | null;
  disabled?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(defaultUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadCustomerOrderPhoto(fd);
      if (res.ok) setUrl(res.url);
      else setError(res.error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {url ? <input type="hidden" name={name} value={url} /> : null}

      {url ? (
        <div className="relative inline-block">
          <Image
            src={url}
            alt="Producto"
            width={160}
            height={160}
            className="h-40 w-40 object-cover rounded-md border"
            unoptimized
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => setUrl(null)}
              className="absolute top-1.5 right-1.5 bg-background border rounded-full p-1 shadow-sm hover:bg-muted"
              aria-label="Quitar foto"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : disabled ? (
        <div className="h-40 w-40 rounded-md border bg-muted flex items-center justify-center text-xs text-muted-foreground">
          Sin foto
        </div>
      ) : (
        <label className="flex items-center justify-center h-40 w-40 border-2 border-dashed border-border hover:border-foreground/30 rounded-md cursor-pointer hover:bg-accent/30 transition-colors">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <Upload className="h-5 w-5" />
              <span className="text-[10px] uppercase tracking-wide">Foto</span>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
