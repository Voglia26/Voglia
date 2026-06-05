"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { uploadItemPhoto } from "@/app/admin/(dash)/quotations/[id]/actions";

export function PhotoUpload({
  name,
  defaultUrls,
}: {
  name: string;
  defaultUrls?: string[] | null;
}) {
  const [urls, setUrls] = useState<string[]>(defaultUrls ?? []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    setUploading(true);
    setError(null);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await uploadItemPhoto(fd);
        if (res.ok) uploaded.push(res.url);
        else {
          setError(res.error);
          break;
        }
      }
      if (uploaded.length > 0) {
        setUrls((prev) => [...prev, ...uploaded]);
      }
    } finally {
      setUploading(false);
    }
  }

  function removeUrl(index: number) {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div>
      {urls.map((url) => (
        <input key={url} type="hidden" name={name} value={url} />
      ))}

      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {urls.map((url, index) => (
            <div key={url} className="relative inline-block">
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
                onClick={() => removeUrl(index)}
                className="absolute top-1.5 right-1.5 bg-background border rounded-full p-1 shadow-sm hover:bg-muted"
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="flex items-center justify-center h-40 w-40 border-2 border-dashed border-border hover:border-foreground/30 rounded-md cursor-pointer hover:bg-accent/30 transition-colors">
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="text-center text-muted-foreground">
            <Upload className="h-5 w-5 mx-auto mb-1.5" />
            <span className="text-xs font-medium">
              {urls.length > 0 ? "Add more photos" : "Upload photos"}
            </span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) handleFiles(files);
            e.target.value = "";
          }}
        />
      </label>

      {error && (
        <p className="text-xs text-destructive mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
