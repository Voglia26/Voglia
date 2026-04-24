"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { uploadItemPhoto } from "@/app/admin/(dash)/quotations/[id]/actions";

export function PhotoUpload({
  name,
  defaultUrl,
}: {
  name: string;
  defaultUrl?: string | null;
}) {
  const [url, setUrl] = useState<string>(defaultUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadItemPhoto(fd);
      if (res.ok) setUrl(res.url);
      else setError(res.error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={url} />
      {url ? (
        <div className="relative inline-block">
          <Image
            src={url}
            alt="Item"
            width={160}
            height={160}
            className="h-40 w-40 object-cover rounded-md border"
            unoptimized
          />
          <button
            type="button"
            onClick={() => setUrl("")}
            className="absolute top-1.5 right-1.5 bg-background border rounded-full p-1 shadow-sm hover:bg-muted"
            aria-label="Remove photo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center h-40 w-40 border-2 border-dashed border-border hover:border-foreground/30 rounded-md cursor-pointer hover:bg-accent/30 transition-colors">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="text-center text-muted-foreground">
              <Upload className="h-5 w-5 mx-auto mb-1.5" />
              <span className="text-xs font-medium">Upload photo</span>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      )}
      {error && (
        <p className="text-xs text-destructive mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
