"use client";

import { useState } from "react";
import type { RoundPurchaseOrder } from "@/app/admin/(dash)/quotations/[id]/compare/actions";
import { Button } from "@/components/ui/button";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
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
  generatingFactoryId,
  quotationOpen,
  onGenerate,
}: {
  summaries: FactoryAwardSummary[];
  generatingFactoryId: string | null;
  quotationOpen: boolean;
  onGenerate: (factoryId: string) => void;
}) {
  if (summaries.length === 0) return null;

  return (
    <div className="space-y-3 pt-2 border-t">
      <div>
        <h3 className="text-sm font-medium">Purchase orders por fábrica</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Generá y enviá una PO a la vez. La cotización se cierra cuando todos
          los productos adjudicados tienen PO en esta ronda.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {summaries.map((s) => {
          const isGenerating = generatingFactoryId === s.factoryId;
          const hasPending = s.pendingItemIds.length > 0;
          const latestPo = s.roundPos[s.roundPos.length - 1];

          return (
            <div
              key={s.factoryId}
              className={cn(
                "rounded-lg border p-4 space-y-3",
                !hasPending && s.roundPos.length > 0 && "bg-muted/30"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{s.factoryName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.awardedItemIds.length} producto
                    {s.awardedItemIds.length !== 1 ? "s" : ""} adjudicado
                    {s.awardedItemIds.length !== 1 ? "s" : ""}
                    {hasPending
                      ? ` · ${s.pendingItemIds.length} pendiente${s.pendingItemIds.length !== 1 ? "s" : ""}`
                      : " · PO generada"}
                  </p>
                </div>
                {quotationOpen && hasPending && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isGenerating || !!generatingFactoryId}
                    onClick={() => onGenerate(s.factoryId)}
                  >
                    {isGenerating && (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    )}
                    Generate PO
                  </Button>
                )}
              </div>

              {s.roundPos.length > 0 && (
                <div className="space-y-2">
                  {s.roundPos.map((po, idx) => (
                    <div key={po.id} className="space-y-1.5">
                      {s.roundPos.length > 1 && (
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          PO {idx + 1} · {po.item_ids.length} ítem
                          {po.item_ids.length !== 1 ? "s" : ""}
                        </p>
                      )}
                      <PoCopyLink token={po.token} />
                    </div>
                  ))}
                </div>
              )}

              {!hasPending && !latestPo && quotationOpen && (
                <p className="text-xs text-muted-foreground">
                  Sin productos adjudicados para esta fábrica.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
