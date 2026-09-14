"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyCpoLink({
  token,
  isRestock,
  className,
}: {
  token: string;
  isRestock?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "";
  const publicUrl = `${baseUrl}/cpo/${token}`;

  async function copy() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2",
        isRestock &&
          "border-amber-300/80 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Link para el proveedor
          {isRestock ? " · Reposición" : ""}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            {copied ? (
              <Check className="h-3.5 w-3.5 mr-1.5" />
            ) : (
              <Copy className="h-3.5 w-3.5 mr-1.5" />
            )}
            {copied ? "Copiado" : "Copiar link"}
          </Button>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="ghost" size="sm">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Abrir
            </Button>
          </a>
        </div>
      </div>
      <code className="block text-xs text-muted-foreground break-all">
        {publicUrl}
      </code>
    </div>
  );
}
