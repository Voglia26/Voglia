"use client";

import { useState } from "react";
import type { QuotationStatus } from "@/lib/types";
import type { ItemCompareRow } from "@/lib/quotation-compare";
import { ItemComparisonMatrix } from "@/components/quotations/item-comparison-matrix";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarChart3 } from "lucide-react";

type FactoryCol = { id: string; name: string };

export function CompareSheet({
  quotationId,
  quotationStatus,
  rows,
  factories,
  hasQuotes,
}: {
  quotationId: string;
  quotationStatus: QuotationStatus;
  rows: ItemCompareRow[];
  factories: FactoryCol[];
  hasQuotes: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={factories.length === 0}
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Compare
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] w-[min(96vw,1100px)] max-w-[96vw] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle className="font-heading text-xl">
              Compare quotes
            </DialogTitle>
            <DialogDescription>
              Factory prices side by side. Pick a winner and quantity per
              product.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
            {!hasQuotes ? (
              <p className="text-sm text-muted-foreground">
                No quotes yet. Factories must submit their prices first.
              </p>
            ) : (
              <ItemComparisonMatrix
                quotationId={quotationId}
                quotationStatus={quotationStatus}
                rows={rows}
                factories={factories}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
