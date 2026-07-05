"use client";

import { useState } from "react";
import type { RoundPurchaseOrder } from "@/app/admin/(dash)/quotations/[id]/compare/actions";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

function PoCopyLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "";
  const publicUrl = `${baseUrl}/po/${token}`;

  async function copy() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      <code className="text-xs text-muted-foreground truncate max-w-[280px]">
        {publicUrl}
      </code>
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
  );
}

export type FactoryAwardSummary = {
  factoryId: string;
  factoryName: string;
  awardedItemIds: string[];
  pendingItemIds: string[];
  roundPos: RoundPurchaseOrder[];
};

export function FactoryPoActions({
  summaries,
}: {
  summaries: FactoryAwardSummary[];
}) {
  const withPos = summaries.filter((s) => s.roundPos.length > 0);
  if (withPos.length === 0) return null;

  return (
    <div className="space-y-3 pt-2 border-t">
      <div>
        <h3 className="text-sm font-medium">Links de purchase orders</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Comparte el link con cada fábrica. Si actualizas un producto, el mismo
          link refleja los cambios.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {withPos.map((s) => {
          const latestPo = s.roundPos[s.roundPos.length - 1];
          return (
            <div
              key={s.factoryId}
              className={cn("rounded-lg border p-4 space-y-3 bg-muted/30")}
            >
              <div>
                <p className="font-medium">{s.factoryName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.awardedItemIds.length} producto
                  {s.awardedItemIds.length !== 1 ? "s" : ""} adjudicado
                  {s.awardedItemIds.length !== 1 ? "s" : ""}
                </p>
              </div>
              <PoCopyLink token={latestPo.token} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
